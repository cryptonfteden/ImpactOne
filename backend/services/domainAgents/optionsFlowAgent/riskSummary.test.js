const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRiskSummary } = require("./riskSummary");
const { emptyMetrics } = require("./optionsDataProvider");
const { buildSignals } = require("./signalsAnalyzer");
const { analyzeMarketBias } = require("./marketBiasAnalyzer");

function metricsWith(overrides = {}) {
  return {
    symbol: "NVDA",
    dataAvailable: true,
    optionVolume: { call: 500, put: 500, total: 1000 },
    openInterest: { call: 1000, put: 1000, total: 2000 },
    unusualContracts: [],
    largeBlockTrades: [],
    greeks: { iv: null, ivRank: null, ivPercentile: null, delta: null, gammaExposure: null },
    ...overrides,
  };
}

test("no data available => a single, honest 'no data source' note", () => {
  const metrics = emptyMetrics("NVDA", "not connected");
  const result = buildRiskSummary({ metrics, bias: analyzeMarketBias(metrics), signals: buildSignals(metrics) });
  assert.equal(result.notes.length, 1);
  assert.match(result.notes[0], /No options-flow data source/);
  assert.equal(result.dataConfidence, "NONE");
});

test("thin volume triggers a real low-statistical-weight note", () => {
  const metrics = metricsWith({ optionVolume: { call: 5, put: 5, total: 10 } });
  const result = buildRiskSummary({ metrics, bias: { bias: "NEUTRAL" }, signals: buildSignals(metrics) });
  assert.ok(result.notes.some((note) => /thin/.test(note)));
});

test("missing open interest triggers a real incomplete-positioning-context note", () => {
  const metrics = metricsWith({ openInterest: { call: null, put: null, total: null } });
  const result = buildRiskSummary({ metrics, bias: { bias: "NEUTRAL" }, signals: buildSignals(metrics) });
  assert.ok(result.notes.some((note) => /open-interest snapshot/.test(note)));
});

test("institutional activity alongside a directional bias triggers a real concentration-of-risk note", () => {
  const metrics = metricsWith({ unusualContracts: [{ signalType: "BLOCK_TRADE", notionalValue: 500000, expiry: "2026-08-21", strike: 900, optionType: "CALL" }] });
  const result = buildRiskSummary({ metrics, bias: { bias: "BULLISH" }, signals: buildSignals(metrics) });
  assert.ok(result.notes.some((note) => /block\/sweep activity/.test(note)));
});

test("no missing-IV note is duplicated beyond one clear statement, and always present without a Greeks data source", () => {
  const metrics = metricsWith();
  const result = buildRiskSummary({ metrics, bias: { bias: "NEUTRAL" }, signals: buildSignals(metrics) });
  const ivNotes = result.notes.filter((note) => /implied volatility/i.test(note));
  assert.equal(ivNotes.length, 1);
});

test("dataConfidence is MODERATE only with real volume >= 100 AND a real OI total", () => {
  const strong = metricsWith({ optionVolume: { call: 60, put: 60, total: 120 }, openInterest: { call: 1, put: 1, total: 2 } });
  const weakVolume = metricsWith({ optionVolume: { call: 5, put: 5, total: 10 }, openInterest: { call: 1, put: 1, total: 2 } });
  const noOi = metricsWith({ optionVolume: { call: 200, put: 200, total: 400 }, openInterest: { call: null, put: null, total: null } });

  assert.equal(buildRiskSummary({ metrics: strong, bias: { bias: "NEUTRAL" }, signals: buildSignals(strong) }).dataConfidence, "MODERATE");
  assert.equal(buildRiskSummary({ metrics: weakVolume, bias: { bias: "NEUTRAL" }, signals: buildSignals(weakVolume) }).dataConfidence, "LOW");
  assert.equal(buildRiskSummary({ metrics: noOi, bias: { bias: "NEUTRAL" }, signals: buildSignals(noOi) }).dataConfidence, "LOW");
});

test("a fully clean, high-confidence window still returns at least one real note, never an empty list", () => {
  const metrics = metricsWith({ optionVolume: { call: 500, put: 500, total: 1000 }, openInterest: { call: 1000, put: 1000, total: 2000 } });
  const result = buildRiskSummary({ metrics, bias: { bias: "NEUTRAL" }, signals: buildSignals(metrics) });
  assert.ok(result.notes.length >= 1);
});
