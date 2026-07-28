// Phase AGENT-SCHEDULER-001 — a pending-job queue with priority
// scheduling AND fairness via priority aging, kept as a plain,
// synchronous data structure (no async, no I/O, no agent awareness) so
// it is trivially testable and adds negligible overhead even with
// hundreds of pending jobs.
//
// "Priority scheduling" alone (always dequeue the highest metadata.priority
// first) can starve a low-priority agent indefinitely if higher-priority
// jobs keep arriving. "Fair scheduling" here means: the longer a job
// waits, the more its effective priority grows, so it eventually
// outranks a same-or-higher-priority job that just arrived — the
// standard "priority aging" fix for exactly this starvation problem.
const { DEFAULT_AGING_FACTOR_PER_MS } = require("./schedulerConfig");

class ExecutionQueue {
  constructor({ agingFactorPerMs = DEFAULT_AGING_FACTOR_PER_MS, now = Date.now } = {}) {
    this._agingFactorPerMs = agingFactorPerMs;
    this._now = now;
    this._jobs = [];
  }

  size() {
    return this._jobs.length;
  }

  isEmpty() {
    return this._jobs.length === 0;
  }

  /** @param {{ jobId: string, priority: number }} job */
  enqueue(job) {
    this._jobs.push({ ...job, enqueuedAtMs: this._now() });
  }

  _effectivePriority(job, nowMs) {
    return job.priority + (nowMs - job.enqueuedAtMs) * this._agingFactorPerMs;
  }

  /**
   * Removes and returns the job with the highest effective priority
   * (priority + aging), tie-broken by earliest arrival (pure FIFO for
   * equally-ranked jobs — no randomness in the ordering). Returns null
   * if the queue is empty.
   */
  dequeue() {
    if (!this._jobs.length) return null;
    const nowMs = this._now();
    let bestIndex = 0;
    let bestScore = this._effectivePriority(this._jobs[0], nowMs);
    for (let i = 1; i < this._jobs.length; i += 1) {
      const score = this._effectivePriority(this._jobs[i], nowMs);
      if (score > bestScore || (score === bestScore && this._jobs[i].enqueuedAtMs < this._jobs[bestIndex].enqueuedAtMs)) {
        bestScore = score;
        bestIndex = i;
      }
    }
    return this._jobs.splice(bestIndex, 1)[0];
  }

  /** Removes a specific queued job by id without dispatching it (used for cancellation of a job that never started). */
  remove(jobId) {
    const index = this._jobs.findIndex((job) => job.jobId === jobId);
    if (index === -1) return null;
    return this._jobs.splice(index, 1)[0];
  }

  peekAll() {
    return this._jobs.slice();
  }
}

module.exports = { ExecutionQueue };
