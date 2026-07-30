const test = require("node:test");
const assert = require("node:assert/strict");
const { computeConfidence } = require("./confidenceModel");

function avail(count) {
  const map = {};
  for (let i = 0; i < count; i += 1) map[`s${i}`] = { dataAvailable: true };
  return map;
}
function unavail(count) {
  const map = {};
  for (let i = 0; i < count; i += 1) map[`s${i}`] = { dataAvailable: false };
  return map;
}

test("returns 100 when every real source (7 FRED + 4 proxies) is available", () => {
  const result = computeConfidence(avail(7), avail(4));
  assert.equal(result.confidence, 100);
  assert.equal(result.availableSourceCount, 11);
  assert.equal(result.totalSourceCount, 11);
});

test("returns 0 when no real source is available", () => {
  const result = computeConfidence(unavail(7), unavail(4));
  assert.equal(result.confidence, 0);
});

test("weights real FRED availability more heavily than real proxy availability", () => {
  const fredOnly = computeConfidence(avail(7), unavail(4));
  const proxyOnly = computeConfidence(unavail(7), avail(4));
  assert.ok(fredOnly.confidence > proxyOnly.confidence);
});
