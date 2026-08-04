const test = require("node:test");
const assert = require("node:assert/strict");
const { detectDrift } = require("./agentDriftDetector");

function makeEvidence(count, { confidence, correct, startDate = "2026-01-01" }) {
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + i);
    entries.push({ stance: "SUPPORTS", confidence, directionCorrect: correct, addedAt: date.toISOString() });
  }
  return entries;
}

test("detectDrift: honestly reports insufficient data below the real minimum sample size", () => {
  const evidence = makeEvidence(5, { confidence: 80, correct: true });
  const result = detectDrift(evidence);
  assert.equal(result.driftPts, null);
  assert.match(result.reason, /need at least 10/);
});

test("detectDrift: detects real worsening calibration (later half has higher error than earlier half)", () => {
  const earlier = makeEvidence(5, { confidence: 90, correct: true, startDate: "2026-01-01" }); // low error
  const later = makeEvidence(5, { confidence: 90, correct: false, startDate: "2026-02-01" }); // high error
  const result = detectDrift([...earlier, ...later]);
  assert.ok(result.driftPts > 0, "driftPts must be positive when calibration got worse over real time");
});

test("detectDrift: detects real improving calibration (later half has lower error than earlier half)", () => {
  const earlier = makeEvidence(5, { confidence: 90, correct: false, startDate: "2026-01-01" }); // high error
  const later = makeEvidence(5, { confidence: 90, correct: true, startDate: "2026-02-01" }); // low error
  const result = detectDrift([...earlier, ...later]);
  assert.ok(result.driftPts < 0, "driftPts must be negative when calibration improved over real time");
});

test("detectDrift: re-sorts out-of-order real evidence by its own real addedAt before splitting", () => {
  const earlier = makeEvidence(5, { confidence: 90, correct: true, startDate: "2026-01-01" });
  const later = makeEvidence(5, { confidence: 90, correct: false, startDate: "2026-02-01" });
  const shuffled = [...later, ...earlier]; // deliberately out of chronological order
  const result = detectDrift(shuffled);
  assert.ok(result.driftPts > 0);
});

test("detectDrift: excludes ungraded/unconfident real evidence from the real sample count", () => {
  const graded = makeEvidence(10, { confidence: 80, correct: true });
  const ungraded = [{ stance: "SUPPORTS", confidence: 80, directionCorrect: null, addedAt: "2026-03-01T00:00:00Z" }];
  const result = detectDrift([...graded, ...ungraded]);
  assert.notEqual(result.driftPts, null); // the 10 real graded entries alone still meet the threshold
});
