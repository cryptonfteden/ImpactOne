const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeRiskLevel, atrPercentOfPrice } = require("./riskLevelAnalyzer");

function signals({ regimeSignal = "NORMAL_VOLATILITY", regimeStatus = "SUFFICIENT", atrValue = 2, lastClose = 100, atrStatus = "SUFFICIENT", breakoutSignal = "NO_BREAKOUT" } = {}) {
  return {
    volatilityRegime: { signal: regimeSignal, enoughDataStatus: regimeStatus },
    atr: { enoughDataStatus: atrStatus, calculationInputs: { value: atrValue, lastClose } },
    breakout: { signal: breakoutSignal },
  };
}

test("atrPercentOfPrice computes a real, scale-independent percentage", () => {
  assert.equal(atrPercentOfPrice({ enoughDataStatus: "SUFFICIENT", calculationInputs: { value: 2, lastClose: 100 } }), 2);
  assert.equal(atrPercentOfPrice({ enoughDataStatus: "INSUFFICIENT", calculationInputs: {} }), null);
  assert.equal(atrPercentOfPrice(null), null);
});

test("analyzeRiskLevel: HIGH_VOLATILITY regime + high ATR% => HIGH risk", () => {
  const result = analyzeRiskLevel(signals({ regimeSignal: "HIGH_VOLATILITY", atrValue: 5, lastClose: 100 }));
  assert.equal(result.riskLevel, "HIGH");
});

test("analyzeRiskLevel: LOW_VOLATILITY regime + low ATR% => LOW risk", () => {
  const result = analyzeRiskLevel(signals({ regimeSignal: "LOW_VOLATILITY", atrValue: 0.5, lastClose: 100 }));
  assert.equal(result.riskLevel, "LOW");
});

test("analyzeRiskLevel: NORMAL_VOLATILITY + moderate ATR% => MODERATE risk", () => {
  const result = analyzeRiskLevel(signals({ regimeSignal: "NORMAL_VOLATILITY", atrValue: 1, lastClose: 100 }));
  assert.equal(result.riskLevel, "MODERATE");
});

test("analyzeRiskLevel: a recently failed breakout nudges risk upward", () => {
  const withoutFail = analyzeRiskLevel(signals({ regimeSignal: "HIGH_VOLATILITY", atrValue: 1, lastClose: 100, breakoutSignal: "NO_BREAKOUT" }));
  const withFail = analyzeRiskLevel(signals({ regimeSignal: "HIGH_VOLATILITY", atrValue: 1, lastClose: 100, breakoutSignal: "FAILED_BREAKOUT" }));
  assert.equal(withoutFail.riskLevel, "MODERATE");
  assert.equal(withFail.riskLevel, "HIGH");
});

test("analyzeRiskLevel: with no usable volatility data at all, honestly defaults to MODERATE rather than guessing LOW/HIGH", () => {
  const result = analyzeRiskLevel(signals({ regimeStatus: "INSUFFICIENT", atrStatus: "INSUFFICIENT" }));
  assert.equal(result.riskLevel, "MODERATE");
  assert.equal(result.atrPercentOfPrice, null);
  assert.equal(result.volatilityRegime, null);
});

test("analyzeRiskLevel reports the real ATR% and volatility regime used, for auditability", () => {
  const result = analyzeRiskLevel(signals({ regimeSignal: "HIGH_VOLATILITY", atrValue: 4, lastClose: 100 }));
  assert.equal(result.atrPercentOfPrice, 4);
  assert.equal(result.volatilityRegime, "HIGH_VOLATILITY");
});
