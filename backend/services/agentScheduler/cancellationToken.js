// Phase AGENT-SCHEDULER-001 — a thin, testable wrapper around the
// platform's real AbortController so every job in the scheduler has one
// consistent cancellation primitive, whether it's still queued (never
// dispatched) or mid-execution (its timeout/backoff wait is interrupted).
class CancellationToken {
  constructor() {
    this._controller = new AbortController();
    this._reason = null;
  }

  get signal() {
    return this._controller.signal;
  }

  get isCancelled() {
    return this._controller.signal.aborted;
  }

  get reason() {
    return this._reason;
  }

  cancel(reason = "Cancelled") {
    if (this.isCancelled) return;
    this._reason = reason;
    this._controller.abort();
  }
}

module.exports = { CancellationToken };
