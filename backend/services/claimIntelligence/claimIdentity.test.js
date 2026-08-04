require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { computeIdentityKey, computeSubjectHorizonKey, isOpposingDirection } = require("./claimIdentity");

const BASE = { subject: "NVDA", expectedDirection: "BULLISH", timeHorizon: "D1", symbols: ["NVDA"], sectors: [], regions: [], causalContext: "options:SWEEP" };

test("identity: semantically identical claims (same subject/direction/horizon/symbols/causal context) share one identity key", () => {
  assert.equal(computeIdentityKey(BASE), computeIdentityKey({ ...BASE }));
});

test("identity: symbol order/case never affects identity", () => {
  const a = computeIdentityKey({ ...BASE, symbols: ["NVDA", "MSFT"] });
  const b = computeIdentityKey({ ...BASE, symbols: ["msft", "nvda"] });
  assert.equal(a, b);
});

test("identity: contradictory claims (opposite direction, same everything else) get DIFFERENT identity keys — never silently merged", () => {
  const bullish = computeIdentityKey(BASE);
  const bearish = computeIdentityKey({ ...BASE, expectedDirection: "BEARISH" });
  assert.notEqual(bullish, bearish);
});

test("identity: different time horizons for the same claim get DIFFERENT identity keys — never silently merged", () => {
  const shortTerm = computeIdentityKey(BASE);
  const longTerm = computeIdentityKey({ ...BASE, timeHorizon: "M3" });
  assert.notEqual(shortTerm, longTerm);
});

test("identity: different causal context for the same subject/direction/horizon is a different claim", () => {
  const sweepDriven = computeIdentityKey(BASE);
  const sentimentDriven = computeIdentityKey({ ...BASE, causalContext: "sentiment:overall" });
  assert.notEqual(sweepDriven, sentimentDriven);
});

test("subject/horizon key ignores direction and causal context — used to find a contradicting claim regardless of its reasoning", () => {
  const a = computeSubjectHorizonKey({ subject: "NVDA", timeHorizon: "D1", symbols: ["NVDA"] });
  const b = computeSubjectHorizonKey({ subject: "NVDA", timeHorizon: "D1", symbols: ["NVDA"] });
  assert.equal(a, b);
});

test("isOpposingDirection correctly identifies real opposites, never NEUTRAL as an opposite of anything", () => {
  assert.equal(isOpposingDirection("BULLISH", "BEARISH"), true);
  assert.equal(isOpposingDirection("BEARISH", "BULLISH"), true);
  assert.equal(isOpposingDirection("BULLISH", "BULLISH"), false);
  assert.equal(isOpposingDirection("BULLISH", "NEUTRAL"), false);
});
