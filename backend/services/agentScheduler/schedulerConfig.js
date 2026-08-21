// Phase AGENT-SCHEDULER-001 — one place for every default the scheduler
// uses, so nothing is a magic number buried in the engine itself. No
// business logic: these are execution-mechanics defaults only (how many
// agents may run at once, how long one may take, how a retry backs off).
//
// Phase PLATFORM-HARDENING-001 — every default below may now be
// overridden by an environment variable at process start, so an
// operator can tune the platform for production without a code change.
// Reading an unset/invalid env var always falls back to the exact same
// numeric default this module has always exported — fully backward
// compatible with every existing caller and test.
function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  // How many agent executions may be actively running (past the queue,
  // health-checked, mid execute()+retries) at the same time, PLATFORM-WIDE
  // — this is what makes 100+ agents safe: they queue, they don't all
  // fire at once.
  DEFAULT_CONCURRENCY: envNumber("AGENT_SCHEDULER_CONCURRENCY", 20),

  // Unchanged from AGENT-ORCHESTRATOR-001's own defaults, so existing
  // callers of agentOrchestrator.run() see no behavior change.
  // Public regulatory providers can legitimately take several seconds,
  // especially when a rate-limited source falls through to a verified
  // alternative. Five seconds made healthy agents appear disconnected.
  DEFAULT_TIMEOUT_MS: envNumber("AGENT_SCHEDULER_TIMEOUT_MS", 12000),
  DEFAULT_MAX_RETRIES: envNumber("AGENT_SCHEDULER_MAX_RETRIES", 1),

  // Full-jitter exponential backoff between retries: delay = random(0, min(maxDelayMs, baseDelayMs * 2^attempt)).
  // Kept small by default so the existing orchestrator test suite (which
  // exercises real retries) stays fast; a slower/riskier upstream agent
  // can opt into a larger baseDelayMs via options.
  DEFAULT_BASE_DELAY_MS: envNumber("AGENT_SCHEDULER_BASE_DELAY_MS", 20),
  DEFAULT_MAX_DELAY_MS: envNumber("AGENT_SCHEDULER_MAX_DELAY_MS", 2000),

  // Priority aging: every millisecond a job waits in the queue adds this
  // much to its effective priority, so a long-waiting low-priority job
  // eventually outranks a freshly-arrived high-priority one — this is
  // what makes scheduling "fair" rather than a strict priority order
  // that could starve low-priority agents indefinitely under sustained load.
  DEFAULT_AGING_FACTOR_PER_MS: envNumber("AGENT_SCHEDULER_AGING_FACTOR_PER_MS", 0.01),

  // How long a health() result may be reused for the SAME agent object
  // before it must be recomputed — a real, if small, cost saver at 100+
  // agents scale, where the same agent may otherwise be health-checked
  // many times a second across concurrent requests. 0 disables caching.
  DEFAULT_HEALTH_CACHE_TTL_MS: envNumber("AGENT_SCHEDULER_HEALTH_CACHE_TTL_MS", 2000),
};
