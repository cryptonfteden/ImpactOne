const test = require("node:test");
const assert = require("node:assert/strict");
const { CancellationToken } = require("./cancellationToken");

test("a fresh token is not cancelled and exposes a real, unaborted AbortSignal", () => {
  const token = new CancellationToken();
  assert.equal(token.isCancelled, false);
  assert.equal(token.signal.aborted, false);
  assert.equal(token.reason, null);
});

test("cancel() aborts the real signal and records the reason", () => {
  const token = new CancellationToken();
  token.cancel("user requested cancellation");
  assert.equal(token.isCancelled, true);
  assert.equal(token.signal.aborted, true);
  assert.equal(token.reason, "user requested cancellation");
});

test("cancel() is idempotent — calling it twice does not throw or change the recorded reason", () => {
  const token = new CancellationToken();
  token.cancel("first reason");
  token.cancel("second reason");
  assert.equal(token.reason, "first reason");
});

test("the signal fires a real 'abort' event listeners can observe", () => {
  const token = new CancellationToken();
  let fired = false;
  token.signal.addEventListener("abort", () => {
    fired = true;
  });
  token.cancel();
  assert.equal(fired, true);
});
