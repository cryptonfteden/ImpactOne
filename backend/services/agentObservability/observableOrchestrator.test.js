const test = require("node:test");
const assert = require("node:assert/strict");

const agentOrchestrator = require("../agentOrchestrator/agentOrchestrator");
const { runObserved } = require("./observableOrchestrator");
const { createAgentExecutionLog } = require("./agentExecutionLog");
const { FAILURE_CODES } = require("./failureTaxonomy");

function makeAgent({ id, priority = 5, execute, confidence, health, delayMs = 0, raw }) {
  return {
    metadata: { id, name: `${id} agent`, category: "TEST", priority },
    async execute(symbol) {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      return execute ? execute(symbol) : { summary: "ok", direction: null, evidence: [], raw };
    },
    confidence: confidence || (() => 50),
    health: health || (async () => ({ status: "healthy", reason: null })),
  };
}

test.beforeEach(() => {
  agentOrchestrator.clearRegistry();
});

test("runObserved returns the orchestrator's own report unmodified, plus a correlationId", async () => {
  agentOrchestrator.registerAgent(makeAgent({ id: "a" }));
  const log = createAgentExecutionLog();

  const { report, correlationId } = await runObserved("nvda", {}, { log });

  const directReport = await agentOrchestrator.run("nvda");
  assert.deepEqual(Object.keys(report).sort(), Object.keys(directReport).sort());
  assert.equal(report.symbol, "NVDA");
  assert.ok(correlationId.startsWith("corr_"));
});

test("runObserved appends exactly one execution record per agent, all sharing the same correlationId", async () => {
  agentOrchestrator.registerAgent(makeAgent({ id: "a" }));
  agentOrchestrator.registerAgent(makeAgent({ id: "b" }));
  const log = createAgentExecutionLog();

  const { correlationId } = await runObserved("NVDA", {}, { log });

  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 2);
  assert.deepEqual(records.map((r) => r.agentId).sort(), ["a", "b"]);
  assert.ok(records.every((r) => r.symbol === "NVDA"));
});

test("a successful agent is recorded with success=true, timeout=false, and the real confidence/health", async () => {
  agentOrchestrator.registerAgent(makeAgent({ id: "a", confidence: () => 77, health: async () => ({ status: "degraded", reason: "x" }) }));
  const log = createAgentExecutionLog();

  await runObserved("NVDA", {}, { log });
  const [record] = log.getBySymbol("NVDA");

  assert.equal(record.success, true);
  assert.equal(record.timeout, false);
  assert.equal(record.confidence, 77);
  assert.equal(record.healthStatus, "degraded");
  assert.equal(record.retryCount, 0);
  assert.equal(record.failureCode, FAILURE_CODES.NONE);
});

test("a timed-out agent is recorded with timeout=true and the TIMEOUT failure code", async () => {
  agentOrchestrator.registerAgent(makeAgent({ id: "slow", delayMs: 200 }));
  const log = createAgentExecutionLog();

  await runObserved("NVDA", { timeoutMs: 20, maxRetries: 0 }, { log });
  const [record] = log.getBySymbol("NVDA");

  assert.equal(record.success, false);
  assert.equal(record.timeout, true);
  assert.equal(record.failureCode, FAILURE_CODES.TIMEOUT);
});

test("an unavailable (skipped) agent is recorded with AGENT_UNAVAILABLE and never marked as a timeout", async () => {
  agentOrchestrator.registerAgent(makeAgent({ id: "sick", health: async () => ({ status: "unavailable", reason: "not configured" }) }));
  const log = createAgentExecutionLog();

  await runObserved("NVDA", {}, { log });
  const [record] = log.getBySymbol("NVDA");

  assert.equal(record.success, false);
  assert.equal(record.timeout, false);
  assert.equal(record.failureCode, FAILURE_CODES.AGENT_UNAVAILABLE);
  assert.equal(record.healthStatus, "unavailable");
});

test("retryCount reflects real retry attempts (attempts - 1), not a fabricated number", async () => {
  let calls = 0;
  agentOrchestrator.registerAgent(
    makeAgent({
      id: "flaky",
      execute: () => {
        calls += 1;
        if (calls < 2) throw new Error("transient");
        return { summary: "ok", direction: null, evidence: [] };
      },
    })
  );
  const log = createAgentExecutionLog();

  await runObserved("NVDA", { maxRetries: 2 }, { log });
  const [record] = log.getBySymbol("NVDA");

  assert.equal(record.retryCount, 1, "1 retry after the first failed attempt");
  assert.equal(record.success, true);
});

test("cacheHit/dataSourcesUsed are honestly null when an agent does not report them", async () => {
  agentOrchestrator.registerAgent(makeAgent({ id: "a", execute: () => ({ summary: "ok", raw: {} }) }));
  const log = createAgentExecutionLog();

  await runObserved("NVDA", {}, { log });
  const [record] = log.getBySymbol("NVDA");

  assert.equal(record.cacheHit, null);
  assert.equal(record.dataSourcesUsed, null);
});

test("cacheHit/dataSourcesUsed are captured when an agent's raw result opts in to reporting them", async () => {
  agentOrchestrator.registerAgent(
    makeAgent({ id: "a", execute: () => ({ summary: "ok", raw: { cacheHit: true, dataSources: ["finnhub", "internal-cache"] } }) })
  );
  const log = createAgentExecutionLog();

  await runObserved("NVDA", {}, { log });
  const [record] = log.getBySymbol("NVDA");

  assert.equal(record.cacheHit, true);
  assert.deepEqual(record.dataSourcesUsed, ["finnhub", "internal-cache"]);
});

test("every record carries a unique executionId even within the same correlated run", async () => {
  agentOrchestrator.registerAgent(makeAgent({ id: "a" }));
  agentOrchestrator.registerAgent(makeAgent({ id: "b" }));
  const log = createAgentExecutionLog();

  const { correlationId } = await runObserved("NVDA", {}, { log });
  const records = log.getByCorrelationId(correlationId);
  assert.notEqual(records[0].executionId, records[1].executionId);
});

test("the orchestrator module itself is never modified by this layer — runObserved calls the real, unmodified run()", () => {
  const source = require("node:fs").readFileSync(require.resolve("../agentOrchestrator/agentOrchestrator.js"), "utf8");
  assert.ok(!/agentObservability/.test(source), "agentOrchestrator.js must have zero awareness of the observability layer");
});
