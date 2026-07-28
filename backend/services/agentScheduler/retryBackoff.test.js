const test = require("node:test");
const assert = require("node:assert/strict");
const { computeBackoffDelayMs, abortableDelay } = require("./retryBackoff");

test("computeBackoffDelayMs grows exponentially with attempt number, capped at maxDelayMs", () => {
  const alwaysMax = () => 1; // random() = 1 => the full, uncapped-by-jitter delay
  assert.equal(computeBackoffDelayMs(1, { baseDelayMs: 10, maxDelayMs: 1000, random: alwaysMax }), 10);
  assert.equal(computeBackoffDelayMs(2, { baseDelayMs: 10, maxDelayMs: 1000, random: alwaysMax }), 20);
  assert.equal(computeBackoffDelayMs(3, { baseDelayMs: 10, maxDelayMs: 1000, random: alwaysMax }), 40);
  assert.equal(computeBackoffDelayMs(10, { baseDelayMs: 10, maxDelayMs: 1000, random: alwaysMax }), 1000, "exponential growth is capped at maxDelayMs");
});

test("computeBackoffDelayMs is real jitter — a random() of 0 always yields 0 delay", () => {
  assert.equal(computeBackoffDelayMs(5, { baseDelayMs: 10, maxDelayMs: 1000, random: () => 0 }), 0);
});

test("abortableDelay resolves after the given delay when never aborted", async () => {
  const start = Date.now();
  await abortableDelay(15);
  assert.ok(Date.now() - start >= 10);
});

test("abortableDelay rejects immediately if the signal is already aborted", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => abortableDelay(1000, controller.signal), /CANCELLED/);
});

test("abortableDelay rejects early (well before the delay elapses) when aborted mid-wait", async () => {
  const controller = new AbortController();
  const start = Date.now();
  const pending = abortableDelay(5000, controller.signal);
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(() => pending, /CANCELLED/);
  assert.ok(Date.now() - start < 1000, "must not wait anywhere close to the full 5000ms delay");
});
