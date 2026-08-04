const test = require("node:test");
const assert = require("node:assert/strict");
const { buildAiSummary } = require("./aiSummary");

function countSentences(text) {
  return text.split(/(?<=[.])\s+/).filter(Boolean).length;
}

function baseReport(overrides = {}) {
  return {
    dataAvailable: true,
    unavailableReason: null,
    valuationStatus: "FAIRLY_VALUED",
    estimatedFairValue: 100,
    unavailableForFairValueReason: null,
    discountToFairValue: 0,
    attractiveRange: false,
    attractiveRangeCaveat: null,
    highMarginOfSafety: false,
    confidence: 60,
    supportingMetrics: [{ method: "PE", impliedPrice: 100, weight: 1, contributionPercent: 100 }],
    inputs: { price: 100 },
    ...overrides,
  };
}

test("no data available => a single honest sentence naming the real reason, never a fabricated estimate", () => {
  const summary = buildAiSummary(baseReport({ dataAvailable: false, unavailableReason: "No Finnhub API key is configured.", estimatedFairValue: null }));
  assert.match(summary, /No real valuation data source is currently connected/);
  assert.match(summary, /No Finnhub API key is configured/);
});

test("data available but no usable method => an honest 'could not be computed' sentence with a non-directive disclaimer", () => {
  const summary = buildAiSummary(baseReport({ estimatedFairValue: null, unavailableForFairValueReason: "insufficient usable valuation methods this window" }));
  assert.match(summary, /could not be honestly computed/);
  assert.match(summary, /not a recommendation/);
});

test("the summary is always 2-4 sentences across a range of real scenarios", () => {
  const scenarios = [
    baseReport({ valuationStatus: "UNDERVALUED", discountToFairValue: 0.2, confidence: 70 }),
    baseReport({ valuationStatus: "OVERVALUED", discountToFairValue: -0.15, confidence: 55 }),
    baseReport({ valuationStatus: "FAIRLY_VALUED", discountToFairValue: 0.01, confidence: 30 }),
    baseReport({ valuationStatus: "UNDERVALUED", discountToFairValue: 0.3, confidence: 75, highMarginOfSafety: true }),
  ];
  for (const report of scenarios) {
    const summary = buildAiSummary(report);
    const count = countSentences(summary);
    assert.ok(count >= 2 && count <= 4, `expected 2-4 sentences, got ${count}: "${summary}"`);
  }
});

test("never uses directive ('buy'/'sell') language, per FAIR_VALUE_METHODOLOGY.md §4's naming governance", () => {
  const report = baseReport({ valuationStatus: "UNDERVALUED", discountToFairValue: 0.3, confidence: 75, highMarginOfSafety: true });
  const summary = buildAiSummary(report);
  assert.ok(!/\bbuy\b/i.test(summary));
  assert.ok(!/\bsell\b/i.test(summary));
});

test("the real price and fair value figures are named explicitly", () => {
  const report = baseReport({ valuationStatus: "UNDERVALUED", discountToFairValue: 0.2, estimatedFairValue: 125, inputs: { price: 100 } });
  const summary = buildAiSummary(report);
  assert.match(summary, /\$100\.00/);
  assert.match(summary, /\$125\.00/);
  assert.match(summary, /20%/);
});

test("the top contributing method is named explicitly when supporting metrics exist", () => {
  const report = baseReport({ supportingMetrics: [{ method: "EV_EBITDA", impliedPrice: 100, weight: 2, contributionPercent: 67 }] });
  const summary = buildAiSummary(report);
  assert.match(summary, /EV\/EBITDA method contributed most/);
  assert.match(summary, /67% weight/);
});

test("a low confidence report discloses that limitation explicitly, never silently", () => {
  const report = baseReport({ confidence: 25 });
  const summary = buildAiSummary(report);
  assert.match(summary, /indicative only/);
});

test("a High Margin of Safety result names the genuine value-creation evidence", () => {
  const report = baseReport({ valuationStatus: "UNDERVALUED", discountToFairValue: 0.3, confidence: 75, highMarginOfSafety: true });
  const summary = buildAiSummary(report);
  assert.match(summary, /genuine value-creation evidence/);
});

test("an Attractive Range value-trap caveat is surfaced verbatim in the summary", () => {
  const report = baseReport({ valuationStatus: "UNDERVALUED", discountToFairValue: 0.15, attractiveRange: false, attractiveRangeCaveat: "Trades at a discount to estimated fair value, but return on invested capital is below its sector's typical cost of capital — a discount alone may not indicate an attractive opportunity." });
  const summary = buildAiSummary(report);
  assert.match(summary, /return on invested capital is below/);
});
