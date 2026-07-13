/**
 * Small in-process fixed-window rate limiter. No Redis/queue dependency —
 * this is intentionally the simplest thing that works for a single-process
 * scheduler (same "no queue/broker yet" boundary as schedulerService.js).
 */
function createLimiter({ maxPerMinute }) {
  const windowMs = 60_000;
  let windowStart = Date.now();
  let count = 0;

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

  return { tryAcquire };
}

module.exports = { createLimiter };
