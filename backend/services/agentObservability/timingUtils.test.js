const test = require("node:test");
const assert = require("node:assert/strict");
const { Stopwatch, startTimer, durationMs } = require("./timingUtils");

test("Stopwatch.elapsedMs reflects injected clock advancement", () => {
  let now = 1000;
  const sw = new Stopwatch(() => now);
  now = 1250;
  assert.equal(sw.elapsedMs(), 250);
});

test("Stopwatch.startedAtIso returns a valid ISO string for the construction time", () => {
  const sw = new Stopwatch(() => 0);
  assert.equal(sw.startedAtIso(), new Date(0).toISOString());
});

test("startTimer returns a real Stopwatch instance", () => {
  const sw = startTimer();
  assert.ok(sw instanceof Stopwatch);
});

test("durationMs never returns a negative number even with an out-of-order end", () => {
  assert.equal(durationMs(1000, 1500), 500);
  assert.equal(durationMs(1500, 1000), 0);
});
