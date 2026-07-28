const test = require("node:test");
const assert = require("node:assert/strict");
const { ExecutionQueue } = require("./executionQueue");

test("dequeue returns the highest-priority job first", () => {
  let clock = 0;
  const queue = new ExecutionQueue({ now: () => clock, agingFactorPerMs: 0 });
  queue.enqueue({ jobId: "low", priority: 1 });
  queue.enqueue({ jobId: "high", priority: 9 });
  queue.enqueue({ jobId: "mid", priority: 5 });

  assert.equal(queue.dequeue().jobId, "high");
  assert.equal(queue.dequeue().jobId, "mid");
  assert.equal(queue.dequeue().jobId, "low");
  assert.equal(queue.dequeue(), null);
});

test("equal-priority jobs are dequeued in FIFO (arrival) order — a real fairness guarantee, not arbitrary", () => {
  let clock = 0;
  const queue = new ExecutionQueue({ now: () => clock, agingFactorPerMs: 0 });
  queue.enqueue({ jobId: "first", priority: 5 });
  clock = 1;
  queue.enqueue({ jobId: "second", priority: 5 });
  clock = 2;
  queue.enqueue({ jobId: "third", priority: 5 });

  assert.equal(queue.dequeue().jobId, "first");
  assert.equal(queue.dequeue().jobId, "second");
  assert.equal(queue.dequeue().jobId, "third");
});

test("priority aging: a long-waiting low-priority job eventually outranks a freshly-arrived high-priority one", () => {
  let clock = 0;
  const queue = new ExecutionQueue({ now: () => clock, agingFactorPerMs: 1 }); // 1 point per ms, for a clean test
  queue.enqueue({ jobId: "low-but-old", priority: 1 });
  clock = 100; // "low-but-old" has now waited 100ms => effective priority 1 + 100*1 = 101
  queue.enqueue({ jobId: "high-but-new", priority: 50 }); // effective priority 50 + 0 = 50

  assert.equal(queue.dequeue().jobId, "low-but-old", "aging must let a long-starved low-priority job win over a fresh high-priority one");
});

test("size()/isEmpty() reflect real queue state as jobs are added and removed", () => {
  const queue = new ExecutionQueue();
  assert.equal(queue.isEmpty(), true);
  assert.equal(queue.size(), 0);
  queue.enqueue({ jobId: "a", priority: 1 });
  assert.equal(queue.size(), 1);
  assert.equal(queue.isEmpty(), false);
  queue.dequeue();
  assert.equal(queue.isEmpty(), true);
});

test("remove() takes a specific job out of the queue by id without disturbing the others", () => {
  const queue = new ExecutionQueue({ agingFactorPerMs: 0 });
  queue.enqueue({ jobId: "a", priority: 5 });
  queue.enqueue({ jobId: "b", priority: 5 });
  queue.enqueue({ jobId: "c", priority: 5 });

  const removed = queue.remove("b");
  assert.equal(removed.jobId, "b");
  assert.equal(queue.size(), 2);
  assert.equal(queue.remove("not-there"), null);
  assert.deepEqual(queue.peekAll().map((j) => j.jobId).sort(), ["a", "c"]);
});
