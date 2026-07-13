/**
 * Small in-process fixed-window rate limiter. No Redis/queue dependency —
 * this is intentionally the simplest thing that works for a single-process
 * scheduler (same "no queue/broker yet" boundary as schedulerService.js).
 */
function createLimiter({ maxPerMinute }) {
  const windowMs = 60_000;
  let windowStart = Date.now();
  let count = 0;

  function currentWindowCount() {
    // Read-only: mirrors tryAcquire's window-rollover check without
    // consuming budget, so diagnostics can observe state without
    // affecting the very thing it's reporting on.
    const now = Date.now();
    if (now - windowStart >= windowMs) return 0;
    return count;
  }

  function tryAcquire() {
    const now = Date.now();
    if (now - windowStart >= windowMs) {
      windowStart = now;
      count = 0;
    }
    if (count >= maxPerMinute) return false;
    count += 1;
    return true;
  }

  function getState() {
    const now = Date.now();
    const elapsed = now - windowStart;
    const windowResetInMs = elapsed >= windowMs ? 0 : windowMs - elapsed;
    return { maxPerMinute, currentCount: currentWindowCount(), windowResetInMs };
  }

  return { tryAcquire, getState };
}

module.exports = { createLimiter };
