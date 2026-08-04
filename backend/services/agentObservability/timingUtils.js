// Phase AGENT-OBSERVABILITY-001 — timing primitives only. No agent or
// business awareness lives here: a Stopwatch just measures wall-clock
// elapsed time between two points, in a form the rest of this layer can
// attach to any record.
class Stopwatch {
  constructor(now = Date.now) {
    this._now = now;
    this._startedAt = this._now();
  }

  /** Milliseconds elapsed since construction. Safe to call more than once. */
  elapsedMs() {
    return this._now() - this._startedAt;
  }

  /** ISO-8601 timestamp of when this stopwatch was created. */
  startedAtIso() {
    return new Date(this._startedAt).toISOString();
  }

  startedAtMs() {
    return this._startedAt;
  }
}

function startTimer() {
  return new Stopwatch();
}

/** Convenience for code that already tracked a raw start-ms timestamp. */
function durationMs(startMs, endMs = Date.now()) {
  return Math.max(0, endMs - startMs);
}

module.exports = { Stopwatch, startTimer, durationMs };
