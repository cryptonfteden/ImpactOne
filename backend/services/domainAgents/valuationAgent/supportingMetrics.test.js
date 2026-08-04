const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSupportingMetrics } = require("./supportingMetrics");

test("empty input returns an empty list, never a fabricated entry", () => {
  assert.deepEqual(buildSupportingMetrics([]), []);
});

test("contributionPercent reflects each method's real share of the total weight", () => {
  const result = buildSupportingMetrics([
    { method: "PE", impliedPrice: 100, weight: 1 },
    { method: "PS", impliedPrice: 120, weight: 3 },
  ]);
  const pe = result.find((r) => r.method === "PE");
  const ps = result.find((r) => r.method === "PS");
  assert.equal(pe.contributionPercent, 25);
  assert.equal(ps.contributionPercent, 75);
});

test("results are sorted by contribution, highest first", () => {
  const result = buildSupportingMetrics([
    { method: "PE", impliedPrice: 100, weight: 1 },
    { method: "PS", impliedPrice: 120, weight: 3 },
    { method: "PB", impliedPrice: 90, weight: 2 },
  ]);
  assert.deepEqual(result.map((r) => r.method), ["PS", "PB", "PE"]);
});

test("a single contributing method gets 100% of the contribution", () => {
  const result = buildSupportingMetrics([{ method: "PE", impliedPrice: 100, weight: 1 }]);
  assert.equal(result[0].contributionPercent, 100);
});
