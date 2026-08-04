const test = require("node:test");
const assert = require("node:assert/strict");
const { findConfluenceZones, selectHighProbabilityZones, HIGH_PROBABILITY_MIN_SCORE } = require("./confluenceZoneAnalyzer");

test("findConfluenceZones returns an empty array for no real levels", () => {
  assert.deepEqual(findConfluenceZones([]), []);
});

test("findConfluenceZones clusters real levels from different sources that land within tolerance into one zone", () => {
  const levels = [
    { price: 100, source: "Fibonacci 0.5 retracement" },
    { price: 100.5, source: "recent pivot high" }, // within 1.5% tolerance of 100
  ];
  const zones = findConfluenceZones(levels, { toleranceRatio: 0.015 });
  assert.equal(zones.length, 1);
  assert.equal(zones[0].confluenceScore, 2);
  assert.ok(zones[0].sources.includes("Fibonacci 0.5 retracement"));
  assert.ok(zones[0].sources.includes("recent pivot high"));
});

test("findConfluenceZones keeps real levels that are far apart as separate zones", () => {
  const levels = [
    { price: 100, source: "A" },
    { price: 200, source: "B" },
  ];
  const zones = findConfluenceZones(levels, { toleranceRatio: 0.015 });
  assert.equal(zones.length, 2);
  assert.equal(zones[0].confluenceScore, 1);
  assert.equal(zones[1].confluenceScore, 1);
});

test("findConfluenceZones never counts the same source twice within one zone (duplicate labels don't inflate the score)", () => {
  const levels = [
    { price: 100, source: "recent pivot high" },
    { price: 100.1, source: "recent pivot high" },
  ];
  const zones = findConfluenceZones(levels, { toleranceRatio: 0.015 });
  assert.equal(zones.length, 1);
  assert.equal(zones[0].confluenceScore, 1);
});

test("findConfluenceZones filters out non-finite prices rather than crashing", () => {
  const zones = findConfluenceZones([{ price: null, source: "bad" }, { price: 100, source: "good" }]);
  assert.equal(zones.length, 1);
  assert.equal(zones[0].sources[0], "good");
});

test("selectHighProbabilityZones only keeps zones meeting the disclosed minimum score, sorted by score descending", () => {
  const zones = [
    { confluenceScore: 1 },
    { confluenceScore: 3 },
    { confluenceScore: HIGH_PROBABILITY_MIN_SCORE },
  ];
  const result = selectHighProbabilityZones(zones);
  assert.equal(result.length, 2);
  assert.equal(result[0].confluenceScore, 3);
});
