// Phase AGENT-SCHEDULER-001 — the execution engine that now sits between
// the Agent Orchestrator and an agent's actual health()/execute() calls.
// Everything this module knows about is generic scheduling mechanics:
// how many executions may run at once, in what order pending ones are
// dispatched, how a retry backs off, how a job is cancelled. It never
// reads an agent's summary/raw/evidence content — the exact same
// discipline agentOrchestrator.js itself has always followed.
//
// agentOrchestrator.js used to implement health-check + timeout + retry
// itself (runOneAgent, withTimeout, safeHealth). That mechanics now
// lives here; the orchestrator delegates to runAll() and keeps its own
// public API (registerAgent/run/etc.) byte-identical to before.
const crypto = require("node:crypto");
const { isValidHealthResult } = require("../agentOrchestrator/agentInterface");
const { ExecutionQueue } = require("./executionQueue");
const { CancellationToken } = require("./cancellationToken");
const { computeBackoffDelayMs, abortableDelay } = require("./retryBackoff");
const { createSchedulerMetrics } = require("./schedulerMetrics");
const {
  DEFAULT_CONCURRENCY,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_BASE_DELAY_MS,
  DEFAULT_MAX_DELAY_MS,
} = require("./schedulerConfig");

function withTimeout(promise, timeoutMs, signal) {
  let timer;
  const timeout = new Promise((_, reject) => {
    if (signal?.aborted) {
      reject(new Error("CANCELLED"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("CANCELLED"));
    };
    timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      reject(new Error("TIMEOUT"));
    }, timeoutMs);
    signal?.addEventListener?.("abort", onAbort);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function safeHealth(agent) {
  try {
    const health = await agent.health();
    if (!isValidHealthResult(health)) {
      return { status: "degraded", reason: "health() returned a malformed result." };
    }
    return health;
  } catch (error) {
    return { status: "unavailable", reason: error?.message || "health() threw an error." };
  }
}

function createAgentScheduler({ concurrency = DEFAULT_CONCURRENCY, now = Date.now, random = Math.random } = {}) {
  let concurrencyLimit = concurrency;
  let activeCount = 0;
  const queue = new ExecutionQueue({ now });
  const metrics = createSchedulerMetrics();
  const inFlight = new Map(); // dedup key -> shared Promise<record>
  const jobRegistry = new Map(); // jobId -> { symbol, controller, state: "queued"|"active" }

  function tryDispatch() {
    while (activeCount < concurrencyLimit && !queue.isEmpty()) {
      const job = queue.dequeue();
      if (!job) break;
      if (job.controller.isCancelled) {
        // Cancelled while queued: never dispatched, never counted active.
        jobRegistry.delete(job.jobId);
        metrics.recordCancelled();
        job.reject(new Error("CANCELLED"));
        continue;
      }
      activeCount += 1;
      const entry = jobRegistry.get(job.jobId);
      if (entry) entry.state = "active";
      job.resolve({ waitMs: now() - job.enqueuedAtMs });
    }
    metrics.recordQueueDepth(queue.size());
  }

  function release() {
    activeCount = Math.max(0, activeCount - 1);
    tryDispatch();
  }

  async function executeWithRetry(agent, symbol, health, { timeoutMs, maxRetries, baseDelayMs, maxDelayMs, signal }) {
    let attempts = 0;
    let lastError = null;
    while (attempts <= maxRetries) {
      attempts += 1;
      if (signal?.aborted) throw Object.assign(new Error("CANCELLED"), { attempts });
      try {
        // eslint-disable-next-line no-await-in-loop
        const result = await withTimeout(Promise.resolve().then(() => agent.execute(symbol)), timeoutMs, signal);
        const confidence = Number(agent.confidence(result));
        return {
          status: "fulfilled",
          health,
          result,
          confidence: Number.isFinite(confidence) ? confidence : 0,
          evidence: Array.isArray(result?.evidence) ? result.evidence : [],
          direction: result?.direction ?? null,
          attempts,
        };
      } catch (error) {
        lastError = error;
        if (error.message === "CANCELLED") throw Object.assign(error, { attempts });
        if (attempts <= maxRetries) {
          metrics.recordRetry();
          const delayMs = computeBackoffDelayMs(attempts, { baseDelayMs, maxDelayMs, random });
          // eslint-disable-next-line no-await-in-loop
          await abortableDelay(delayMs, signal);
        }
      }
    }
    const isTimeout = lastError?.message === "TIMEOUT";
    return {
      status: isTimeout ? "timeout" : "error",
      health,
      error: lastError?.message || "Unknown error.",
      confidence: 0,
      evidence: [],
      direction: null,
      attempts,
    };
  }

  /**
   * Schedules and runs exactly one agent against one symbol, subject to
   * the shared concurrency pool, priority+fair queueing, retry backoff,
   * and duplicate in-flight prevention. Never throws for a normal
   * execution outcome (mirrors the orchestrator's original contract);
   * only rejects if the job itself is cancelled before/while queued or
   * mid-flight via cancelJob()/cancelSymbol().
   */
  function runAgent(agent, symbol, options = {}) {
    const {
      timeoutMs = DEFAULT_TIMEOUT_MS,
      maxRetries = DEFAULT_MAX_RETRIES,
      baseDelayMs = DEFAULT_BASE_DELAY_MS,
      maxDelayMs = DEFAULT_MAX_DELAY_MS,
    } = options;

    const dedupKey = `${agent.metadata.id}::${symbol}`;
    if (inFlight.has(dedupKey)) {
      metrics.recordDeduped();
      return inFlight.get(dedupKey);
    }

    const jobId = crypto.randomUUID();
    const controller = new CancellationToken();
    const base = { agentId: agent.metadata.id, agentName: agent.metadata.name, category: agent.metadata.category ?? null, priority: agent.metadata.priority };

    const promise = (async () => {
      jobRegistry.set(jobId, { symbol, controller, state: "queued" });
      metrics.recordScheduled();

      let waitMs = 0;
      try {
        const turn = await new Promise((resolve, reject) => {
          queue.enqueue({ jobId, priority: agent.metadata.priority, controller, resolve, reject });
          tryDispatch();
        });
        waitMs = turn.waitMs;
      } catch (error) {
        jobRegistry.delete(jobId);
        metrics.recordCancelled();
        return { ...base, status: "error", health: { status: "unavailable", reason: "Cancelled while queued." }, error: "CANCELLED", confidence: 0, evidence: [], direction: null, attempts: 0, tookMs: 0, waitMs: 0 };
      }

      const execStart = now();
      try {
        const health = await safeHealth(agent);
        if (health.status === "unavailable") {
          metrics.recordCompleted({ waitMs, execMs: now() - execStart, outcome: "unavailable" });
          return { ...base, status: "unavailable", health, confidence: 0, evidence: [], direction: null, attempts: 0, tookMs: now() - execStart, waitMs };
        }

        try {
          const outcome = await executeWithRetry(agent, symbol, health, { timeoutMs, maxRetries, baseDelayMs, maxDelayMs, signal: controller.signal });
          const tookMs = now() - execStart;
          const metricOutcome = outcome.status === "fulfilled" ? "success" : outcome.status === "timeout" ? "timeout" : "failure";
          metrics.recordCompleted({ waitMs, execMs: tookMs, outcome: metricOutcome });
          return { ...base, ...outcome, tookMs, waitMs };
        } catch (error) {
          // Cancelled mid-execution (during the timeout race or a retry
          // backoff wait) — resolved gracefully as a real, inspectable
          // record, never left as an unhandled rejection.
          metrics.recordCancelled();
          return {
            ...base,
            status: "error",
            health,
            error: "CANCELLED",
            confidence: 0,
            evidence: [],
            direction: null,
            attempts: error.attempts ?? 0,
            tookMs: now() - execStart,
            waitMs,
          };
        }
      } finally {
        jobRegistry.delete(jobId);
        release();
      }
    })();

    inFlight.set(dedupKey, promise);
    promise.finally(() => inFlight.delete(dedupKey));
    return promise;
  }

  function runAll(agents, symbol, options = {}) {
    return Promise.all(agents.map((agent) => runAgent(agent, symbol, options)));
  }

  function cancelJob(jobId, reason = "Cancelled by caller") {
    const entry = jobRegistry.get(jobId);
    if (!entry) return false;
    entry.controller.cancel(reason);
    // A still-queued job's removal is only observed once tryDispatch()
    // walks the queue — trigger that immediately so cancellation is
    // reflected without waiting for an unrelated job to finish first.
    tryDispatch();
    return true;
  }

  function cancelSymbol(symbol, reason = "Cancelled by caller") {
    let cancelledAny = false;
    for (const entry of jobRegistry.values()) {
      if (entry.symbol === symbol) {
        entry.controller.cancel(reason);
        cancelledAny = true;
      }
    }
    tryDispatch();
    return cancelledAny;
  }

  function setConcurrencyLimit(limit) {
    if (!Number.isFinite(limit) || limit <= 0) throw new Error("Concurrency limit must be a positive finite number.");
    concurrencyLimit = limit;
    tryDispatch();
  }

  function getConcurrencyLimit() {
    return concurrencyLimit;
  }

  function getMetrics() {
    return metrics.snapshot({ activeCount, queueDepth: queue.size(), concurrencyLimit });
  }

  function reset() {
    activeCount = 0;
    inFlight.clear();
    jobRegistry.clear();
    metrics.reset();
    while (!queue.isEmpty()) queue.dequeue();
  }

  return { runAgent, runAll, cancelJob, cancelSymbol, setConcurrencyLimit, getConcurrencyLimit, getMetrics, reset };
}

// One process-wide scheduler instance — the actual shared concurrency
// pool every real request contends over. Tests that need isolation
// should construct their own via createAgentScheduler().
const sharedScheduler = createAgentScheduler();

module.exports = { createAgentScheduler, sharedScheduler };
