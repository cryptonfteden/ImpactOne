// Phase AGENT-SCHEDULER-001 — retry backoff + jitter, as a pure function
// (injectable random source for deterministic tests) plus an abortable
// delay helper. No business logic: this has no idea what a "retry" is
// retrying, only how long to wait before the next attempt.
const { DEFAULT_BASE_DELAY_MS, DEFAULT_MAX_DELAY_MS } = require("./schedulerConfig");

/**
 * Full-jitter exponential backoff (a well-known, race-avoiding pattern:
 * every retrying caller can plausibly get a different delay, so a batch
 * of simultaneously-failing agents does not all retry at exactly the
 * same instant — see AWS's "Exponential Backoff and Jitter" for the
 * general technique this follows).
 *
 * @param {number} attemptNumber - 1 for the first retry, 2 for the second, etc.
 */
function computeBackoffDelayMs(attemptNumber, { baseDelayMs = DEFAULT_BASE_DELAY_MS, maxDelayMs = DEFAULT_MAX_DELAY_MS, random = Math.random } = {}) {
  const exponential = baseDelayMs * 2 ** Math.max(0, attemptNumber - 1);
  const cap = Math.min(maxDelayMs, exponential);
  return Math.round(random() * cap);
}

/**
 * Resolves after `ms`, or rejects early with an Error whose message is
 * "CANCELLED" if `signal` aborts first. Never leaves a dangling timer.
 */
function abortableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("CANCELLED"));
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    function onAbort() {
      cleanup();
      reject(new Error("CANCELLED"));
    }
    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
    }
    signal?.addEventListener?.("abort", onAbort);
  });
}

module.exports = { computeBackoffDelayMs, abortableDelay };
