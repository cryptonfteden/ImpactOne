require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { capAndRedistributeWeights, computeRollup, computeTrend, computeTrendDirection } = require("./marketSentimentRollup");
const { MAX_SINGLE_DIMENSION_WEIGHT, MIN_CONTRIBUTOR_BREADTH } = require("./marketSentimentDimensions");

function available(dimension, score, confidence) {
  return { dimension, score, confidence, unavailable: false, reason: null, contributors: [], missingInputs: [] };
}

function unavailable(dimension, reason) {
  return { dimension, score: null, confidence: null, unavailable: true, reason, contributors: [], missingInputs: [] };
}

test("single-indicator dominance prevention: no raw weight is ever allowed to exceed the cap", () => {
  const rawWeights = [0.85, 0.1, 0.05];
  const capped = capAndRedistributeWeights(rawWeights, MAX_SINGLE_DIMENSION_WEIGHT);
  for (const weight of capped) {
    assert.ok(weight <= MAX_SINGLE_DIMENSION_WEIGHT + 1e-9);
  }
});

test("capAndRedistributeWeights always sums to 1 regardless of how skewed the input is", () => {
  const capped = capAndRedistributeWeights([0.7, 0.2, 0.1], 0.4);
  const sum = capped.reduce((total, weight) => total + weight, 0);
  assert.ok(Math.abs(sum - 1) < 1e-6);
});

test("capAndRedistributeWeights leaves already-balanced weights unchanged", () => {
  const capped = capAndRedistributeWeights([0.34, 0.33, 0.33], 0.4);
  assert.deepEqual(capped.map((weight) => Math.round(weight * 100) / 100), [0.34, 0.33, 0.33]);
});

test("computeRollup: a single dimension cannot dominate the overall score even with a hugely higher confidence than the others", () => {
  const dimensionReadings = [
    available("NEWS_SENTIMENT", 100, 99), // would dominate on confidence-share alone without the cap
    available("VOLATILITY", 0, 40),
    available("MACRO_EVENTS", 0, 40),
  ];
  const rollup = computeRollup({ dimensionReadings });
  // Uncapped, NEWS_SENTIMENT's confidence share would be ~99/179 ≈ 0.55,
  // pulling the score close to 100. With the 0.4 cap, its actual pull is
  // bounded — assert the score does NOT land near the single dimension's
  // own extreme value.
  assert.ok(rollup.score < 70, `expected the dominant dimension's pull to be capped, got ${rollup.score}`);
});

test("computeRollup: minimum contributor breadth — fewer than the minimum available dimensions yields an honestly null overall score", () => {
  const dimensionReadings = [available("NEWS_SENTIMENT", 80, 70), unavailable("VOLATILITY", "no data"), unavailable("MACRO_EVENTS", "no data")];
  const rollup = computeRollup({ dimensionReadings });
  assert.equal(rollup.score, null);
  assert.equal(rollup.confidence, null);
  assert.ok(rollup.missingInputs.some((entry) => entry.includes("insufficient breadth")));
});

test(`computeRollup: exactly ${MIN_CONTRIBUTOR_BREADTH} available dimensions is enough to produce a real score`, () => {
  const dimensionReadings = Array.from({ length: MIN_CONTRIBUTOR_BREADTH }, (_, index) => available(`DIM_${index}`, 60, 70));
  const rollup = computeRollup({ dimensionReadings });
  assert.ok(Number.isFinite(rollup.score));
});

test("computeRollup: null-not-zero — an unavailable dimension never drags the score toward zero", () => {
  const withMissing = computeRollup({ dimensionReadings: [available("NEWS_SENTIMENT", 90, 80), available("VOLATILITY", 90, 80), unavailable("MACRO_EVENTS", "no data")] });
  const withoutMissing = computeRollup({ dimensionReadings: [available("NEWS_SENTIMENT", 90, 80), available("VOLATILITY", 90, 80)] });
  // The unavailable dimension must contribute nothing — the two available
  // dimensions alone should produce the identical score whether or not a
  // third, unavailable dimension is present in the input.
  assert.equal(withMissing.score, withoutMissing.score);
});

test("computeRollup: overall confidence is honestly degraded when dimensions are missing, never held artificially high", () => {
  const fewAvailable = computeRollup({
    dimensionReadings: [available("NEWS_SENTIMENT", 70, 90), available("VOLATILITY", 70, 90), unavailable("A", "x"), unavailable("B", "x"), unavailable("C", "x"), unavailable("D", "x"), unavailable("E", "x"), unavailable("F", "x")],
  });
  const allAvailable = computeRollup({
    dimensionReadings: [available("NEWS_SENTIMENT", 70, 90), available("VOLATILITY", 70, 90), available("A", 70, 90), available("B", 70, 90), available("C", 70, 90), available("D", 70, 90), available("E", 70, 90), available("F", 70, 90)],
  });
  assert.ok(fewAvailable.confidence < allAvailable.confidence);
});

test("computeRollup: deterministic — identical input always produces identical output, contributor order included", () => {
  const dimensionReadings = [available("VOLATILITY", 55, 60), available("NEWS_SENTIMENT", 80, 70), available("MACRO_EVENTS", 40, 50)];
  const first = computeRollup({ dimensionReadings });
  const second = computeRollup({ dimensionReadings: [...dimensionReadings] });
  assert.deepEqual(first, second);
  assert.deepEqual(
    first.contributors.map((contributor) => contributor.dimension),
    ["MACRO_EVENTS", "NEWS_SENTIMENT", "VOLATILITY"] // alphabetical, regardless of input order
  );
});

test("computeRollup: deterministic regardless of input array order", () => {
  const a = computeRollup({ dimensionReadings: [available("NEWS_SENTIMENT", 80, 70), available("VOLATILITY", 55, 60)] });
  const b = computeRollup({ dimensionReadings: [available("VOLATILITY", 55, 60), available("NEWS_SENTIMENT", 80, 70)] });
  assert.deepEqual(a, b);
});

test("computeTrendDirection: honestly INSUFFICIENT_HISTORY when either value is missing", () => {
  assert.equal(computeTrendDirection(60, null).direction, "INSUFFICIENT_HISTORY");
  assert.equal(computeTrendDirection(null, 60).direction, "INSUFFICIENT_HISTORY");
});

test("computeTrendDirection: real IMPROVING/DETERIORATING/STABLE classification from real deltas", () => {
  assert.equal(computeTrendDirection(70, 60).direction, "IMPROVING");
  assert.equal(computeTrendDirection(50, 60).direction, "DETERIORATING");
  assert.equal(computeTrendDirection(61, 60).direction, "STABLE");
});

test("computeTrend: daily and weekly are both honestly INSUFFICIENT_HISTORY with zero prior snapshots", () => {
  const trend = computeTrend(60, []);
  assert.equal(trend.daily.direction, "INSUFFICIENT_HISTORY");
  assert.equal(trend.weekly.direction, "INSUFFICIENT_HISTORY");
});

test("computeTrend: daily trend compares against the most recent prior snapshot", () => {
  const priorSnapshots = [{ score: 55 }, { score: 50 }, { score: 48 }, { score: 46 }, { score: 44 }];
  const trend = computeTrend(60, priorSnapshots);
  assert.equal(trend.daily.direction, "IMPROVING");
  assert.equal(trend.daily.changeAbs, 5);
});

test("computeTrend: weekly trend requires at least 5 prior snapshots, else honestly insufficient", () => {
  const trend = computeTrend(60, [{ score: 55 }, { score: 50 }]);
  assert.equal(trend.weekly.direction, "INSUFFICIENT_HISTORY");
});

test("computeTrend: weekly trend compares against the snapshot from ~5 sessions ago once enough history exists", () => {
  const priorSnapshots = [{ score: 58 }, { score: 56 }, { score: 54 }, { score: 52 }, { score: 40 }, { score: 38 }];
  const trend = computeTrend(60, priorSnapshots);
  assert.equal(trend.weekly.direction, "IMPROVING");
  assert.equal(trend.weekly.changeAbs, 20);
});

test("computeTrend: honestly INSUFFICIENT_HISTORY when the current score itself is null", () => {
  const trend = computeTrend(null, [{ score: 55 }, { score: 50 }, { score: 48 }, { score: 46 }, { score: 44 }]);
  assert.equal(trend.daily.direction, "INSUFFICIENT_HISTORY");
  assert.equal(trend.weekly.direction, "INSUFFICIENT_HISTORY");
});
