const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeCrowdedness, REFERENCE_MAX_RATIO } = require("./crowdednessAnalyzer");

test("analyzeCrowdedness honestly reports 0 with no real days", () => {
  const result = analyzeCrowdedness([]);
  assert.equal(result.crowdednessScore, 0);
  assert.equal(result.mostRecentRatio, null);
});

test("analyzeCrowdedness uses only the real most recent day's ratio", () => {
  const result = analyzeCrowdedness([{ shortVolumeRatio: 0.1 }, { shortVolumeRatio: 0.3 }]);
  assert.equal(result.mostRecentRatio, 0.3);
});

test("analyzeCrowdedness scales a real ratio at the disclosed reference ceiling to a full 100", () => {
  const result = analyzeCrowdedness([{ shortVolumeRatio: REFERENCE_MAX_RATIO }]);
  assert.equal(result.crowdednessScore, 100);
});

test("analyzeCrowdedness never exceeds 100 even for a real ratio above the disclosed reference ceiling", () => {
  const result = analyzeCrowdedness([{ shortVolumeRatio: 1 }]);
  assert.equal(result.crowdednessScore, 100);
});

test("analyzeCrowdedness scales a real zero ratio to 0", () => {
  const result = analyzeCrowdedness([{ shortVolumeRatio: 0 }]);
  assert.equal(result.crowdednessScore, 0);
});
