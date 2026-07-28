// Phase PLATFORM-HARDENING-001 — "Scheduler configuration object": a
// single, mutable, validated object holding every scheduler-mechanics
// knob (concurrency, timeout, retries, backoff bounds, aging factor,
// health-cache TTL), so an operator (or a future admin endpoint) can
// inspect and adjust the whole scheduler's behavior through one place
// at runtime — not just at process start. No business logic: every
// field here is execution mechanics, nothing about what an agent does.
const defaults = require("./schedulerConfig");

const FIELDS = {
  concurrency: (value) => Number.isFinite(value) && value > 0,
  timeoutMs: (value) => Number.isFinite(value) && value > 0,
  maxRetries: (value) => Number.isInteger(value) && value >= 0,
  baseDelayMs: (value) => Number.isFinite(value) && value >= 0,
  maxDelayMs: (value) => Number.isFinite(value) && value >= 0,
  agingFactorPerMs: (value) => Number.isFinite(value) && value >= 0,
  healthCacheTtlMs: (value) => Number.isFinite(value) && value >= 0,
};

function createSchedulerConfig(overrides = {}) {
  const state = {
    concurrency: overrides.concurrency ?? defaults.DEFAULT_CONCURRENCY,
    timeoutMs: overrides.timeoutMs ?? defaults.DEFAULT_TIMEOUT_MS,
    maxRetries: overrides.maxRetries ?? defaults.DEFAULT_MAX_RETRIES,
    baseDelayMs: overrides.baseDelayMs ?? defaults.DEFAULT_BASE_DELAY_MS,
    maxDelayMs: overrides.maxDelayMs ?? defaults.DEFAULT_MAX_DELAY_MS,
    agingFactorPerMs: overrides.agingFactorPerMs ?? defaults.DEFAULT_AGING_FACTOR_PER_MS,
    healthCacheTtlMs: overrides.healthCacheTtlMs ?? defaults.DEFAULT_HEALTH_CACHE_TTL_MS,
  };

  for (const [key, value] of Object.entries(state)) {
    if (!FIELDS[key](value)) {
      throw new Error(`Invalid scheduler config value for "${key}": ${value}`);
    }
  }

  function get() {
    return { ...state };
  }

  /** Validates and applies a partial update; throws on any unknown key or invalid value, applying nothing on failure. */
  function update(partial = {}) {
    const entries = Object.entries(partial);
    for (const [key, value] of entries) {
      if (!(key in FIELDS)) throw new Error(`Unknown scheduler config field "${key}".`);
      if (!FIELDS[key](value)) throw new Error(`Invalid scheduler config value for "${key}": ${value}`);
    }
    for (const [key, value] of entries) {
      state[key] = value;
    }
    return get();
  }

  return { get, update };
}

module.exports = { createSchedulerConfig, FIELDS };
