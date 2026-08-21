const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeEmployment } = require("./employmentAnalyzer");

function series(changeYoYPercentagePoints, value = 4.2, dataAvailable = true) {
  return { dataAvailable, changeYoYPercentagePoints, latest: { value } };
}

test("classifies IMPROVING when unemployment rate falls YoY beyond the stable band", () => {
  assert.equal(analyzeEmployment(series(-0.5)).trend, "IMPROVING");
});

test("classifies WORSENING when unemployment rate rises YoY beyond the stable band", () => {
  const result = analyzeEmployment(series(0.3)).trend;
  assert.equal(result, "WORSENING");
});

test("classifies STABLE within the noise band", () => {
  assert.equal(analyzeEmployment(series(0.1)).trend, "STABLE");
});

test("honestly reports UNKNOWN when real data is unavailable", () => {
  const result = analyzeEmployment(series(null, null, false));
  assert.equal(result.trend, "UNKNOWN");
  assert.equal(result.unemploymentRate, null);
});
