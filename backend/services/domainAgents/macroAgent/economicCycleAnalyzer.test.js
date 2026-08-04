const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeEconomicCycle } = require("./economicCycleAnalyzer");

function gdp(changeYoY, dataAvailable = true) {
  return { dataAvailable, changeYoY };
}

test("classifies EXPANSION for real solid positive growth with no warning signs", () => {
  const result = analyzeEconomicCycle(gdp(2.68), { trend: "STABLE" }, { classification: "NORMAL" });
  assert.equal(result.cycle, "EXPANSION");
});

test("classifies CONTRACTION when real GDP growth is negative", () => {
  const result = analyzeEconomicCycle(gdp(-1.2), { trend: "STABLE" }, { classification: "NORMAL" });
  assert.equal(result.cycle, "CONTRACTION");
});

test("classifies SLOWDOWN for real weak growth with worsening employment or an inverted curve", () => {
  const result = analyzeEconomicCycle(gdp(0.8), { trend: "WORSENING" }, { classification: "NORMAL" });
  assert.equal(result.cycle, "SLOWDOWN");
});

test("classifies RECOVERY for real weak growth with improving employment", () => {
  const result = analyzeEconomicCycle(gdp(0.8), { trend: "IMPROVING" }, { classification: "NORMAL" });
  assert.equal(result.cycle, "RECOVERY");
});

test("honestly reports UNKNOWN when real GDP data is unavailable", () => {
  const result = analyzeEconomicCycle(gdp(null, false), { trend: "STABLE" }, { classification: "NORMAL" });
  assert.equal(result.cycle, "UNKNOWN");
});
