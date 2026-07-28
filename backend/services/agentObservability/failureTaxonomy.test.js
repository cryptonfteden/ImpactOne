const test = require("node:test");
const assert = require("node:assert/strict");
const { FAILURE_CODES, classify, isFailure } = require("./failureTaxonomy");

test("classify maps every real orchestrator status to a stable taxonomy code", () => {
  assert.equal(classify({ status: "fulfilled" }), FAILURE_CODES.NONE);
  assert.equal(classify({ status: "unavailable" }), FAILURE_CODES.AGENT_UNAVAILABLE);
  assert.equal(classify({ status: "timeout" }), FAILURE_CODES.TIMEOUT);
  assert.equal(classify({ status: "error" }), FAILURE_CODES.AGENT_ERROR);
});

test("classify is honest about unrecognized or malformed input, never guesses", () => {
  assert.equal(classify({ status: "something-new" }), FAILURE_CODES.UNKNOWN);
  assert.equal(classify(null), FAILURE_CODES.UNKNOWN);
  assert.equal(classify(undefined), FAILURE_CODES.UNKNOWN);
});

test("isFailure is false only for a real success, true for unavailable/timeout/error/unknown", () => {
  assert.equal(isFailure({ status: "fulfilled" }), false);
  assert.equal(isFailure({ status: "timeout" }), true);
  assert.equal(isFailure({ status: "unavailable" }), true);
  assert.equal(isFailure({ status: "error" }), true);
});
