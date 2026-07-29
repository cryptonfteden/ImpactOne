const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeMomentum, MOMENTUM_STATES } = require("./momentumAnalyzer");

function signals({ rsiSignal = "NEUTRAL", rsiValue = 50, macdSignal = "NONE", macdHistogram = 0, sufficient = true } = {}) {
  const status = sufficient ? "SUFFICIENT" : "INSUFFICIENT";
  return {
    rsi: { signal: rsiSignal, enoughDataStatus: status, calculationInputs: { value: rsiValue } },
    macd: { signal: macdSignal, enoughDataStatus: status, calculationInputs: { histogram: macdHistogram } },
  };
}

test("analyzeMomentum: RSI overbought takes priority regardless of MACD", () => {
  const result = analyzeMomentum(signals({ rsiSignal: "OVERBOUGHT", macdSignal: "BULLISH_CROSSOVER" }));
  assert.equal(result.state, MOMENTUM_STATES.OVERBOUGHT_CAUTION);
});

test("analyzeMomentum: RSI oversold takes priority regardless of MACD", () => {
  const result = analyzeMomentum(signals({ rsiSignal: "OVERSOLD", macdSignal: "BEARISH_CROSSOVER" }));
  assert.equal(result.state, MOMENTUM_STATES.OVERSOLD_OPPORTUNITY);
});

test("analyzeMomentum: bullish MACD crossover + RSI above 50 => STRONG_BULLISH", () => {
  const result = analyzeMomentum(signals({ rsiValue: 60, macdSignal: "BULLISH_CROSSOVER" }));
  assert.equal(result.state, MOMENTUM_STATES.STRONG_BULLISH);
});

test("analyzeMomentum: bearish MACD crossover + RSI below 50 => STRONG_BEARISH", () => {
  const result = analyzeMomentum(signals({ rsiValue: 40, macdSignal: "BEARISH_CROSSOVER" }));
  assert.equal(result.state, MOMENTUM_STATES.STRONG_BEARISH);
});

test("analyzeMomentum: bullish MACD crossover alone (RSI below 50) => plain BULLISH, not STRONG", () => {
  const result = analyzeMomentum(signals({ rsiValue: 40, macdSignal: "BULLISH_CROSSOVER" }));
  assert.equal(result.state, MOMENTUM_STATES.BULLISH);
});

test("analyzeMomentum: no crossover, neutral RSI => NEUTRAL", () => {
  const result = analyzeMomentum(signals());
  assert.equal(result.state, MOMENTUM_STATES.NEUTRAL);
});

test("analyzeMomentum: insufficient data reports null rsi/macd fields but never throws", () => {
  const result = analyzeMomentum(signals({ sufficient: false }));
  assert.equal(result.rsi.value, null);
  assert.equal(result.rsi.signal, null);
  assert.equal(result.macd.signal, null);
  assert.equal(result.state, MOMENTUM_STATES.NEUTRAL);
});
