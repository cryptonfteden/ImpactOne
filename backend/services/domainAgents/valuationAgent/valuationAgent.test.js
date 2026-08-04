const test = require("node:test");
const assert = require("node:assert/strict");

const { generateReport } = require("./valuationAgent");
const { emptyMetrics } = require("./valuationDataProvider");

function fakeMetricsProvider(metrics) {
  return { async getSymbolValuation() { return metrics; } };
}

function fakePeerProvider(reference) {
  return { async getSectorReference() { return reference; } };
}

const REFERENCE = { industry: "Software", source: "broad-market-reference", peerGroupSize: 0, multiples: { pe: 20, forwardPe: 18, peg: 1.5, evEbitda: 12, ps: 3, pb: 3, fcfYield: 4 }, wacc: 8 };

test("no data available => the full honest-empty report shape", async () => {
  const provider = fakeMetricsProvider(emptyMetrics("NVDA", "not connected"));
  const report = await generateReport("NVDA", { provider, peerProvider: fakePeerProvider(REFERENCE) });

  assert.equal(report.dataAvailable, false);
  assert.equal(report.valuationStatus, "UNKNOWN");
  assert.equal(report.estimatedFairValue, null);
  assert.equal(report.confidence, 0);
  assert.deepEqual(report.supportingMetrics, []);
  assert.equal(typeof report.aiSummary, "string");
});

test("a genuinely unresolvable company (no usable method survives exclusion) returns an honest insufficientData report, never a forced estimate", async () => {
  const metrics = emptyMetrics("BIOTECH", null);
  metrics.dataAvailable = true;
  metrics.price = 10;
  // Negative everything, no revenue — the pre-revenue biotech case §2.3 names explicitly.
  const provider = fakeMetricsProvider(metrics);
  const report = await generateReport("BIOTECH", { provider, peerProvider: fakePeerProvider(REFERENCE) });

  assert.equal(report.dataAvailable, true);
  assert.equal(report.estimatedFairValue, null);
  assert.ok(report.unavailableForFairValueReason);
  assert.equal(report.valuationStatus, "UNKNOWN");
  assert.match(report.aiSummary, /could not be honestly computed/);
});

test("a healthy, profitable company produces a real, complete composite Fair Value report", async () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  metrics.price = 90;
  metrics.industry = "Software";
  metrics.eps = { trailing: 5, forward: 6 };
  metrics.epsGrowthYoY = 15;
  metrics.revenuePerShare = 20;
  metrics.bookValuePerShare = 10;
  metrics.fcfPerShare = 4;
  metrics.ebitdaPerShare = 8;
  metrics.netDebtPerShare = 2;
  metrics.roic = 15;

  const provider = fakeMetricsProvider(metrics);
  const report = await generateReport("NVDA", { provider, peerProvider: fakePeerProvider(REFERENCE) });

  assert.equal(report.dataAvailable, true);
  assert.ok(Number.isFinite(report.estimatedFairValue));
  assert.ok(report.fairValueRange);
  assert.ok(["UNDERVALUED", "FAIRLY_VALUED", "OVERVALUED"].includes(report.valuationStatus));
  assert.ok(Number.isFinite(report.confidence));
  assert.ok(report.confidence >= 0 && report.confidence <= 100);
  assert.equal(report.supportingMetrics.length, 7, "all 7 methods are applicable and usable for this fully healthy company");
  assert.equal(typeof report.aiSummary, "string");
});

test("negative earnings automatically switches to FCF/EV-EBITDA/P-S/P-B — P/E and PEG never contribute, never a meaningless value", async () => {
  const metrics = emptyMetrics("UNPROFITABLE_CO", null);
  metrics.dataAvailable = true;
  metrics.price = 50;
  metrics.industry = "Software";
  metrics.eps = { trailing: -2, forward: -1 };
  metrics.revenuePerShare = 20;
  metrics.bookValuePerShare = 8;
  metrics.fcfPerShare = 3;
  metrics.ebitdaPerShare = 5;

  const provider = fakeMetricsProvider(metrics);
  const report = await generateReport("UNPROFITABLE_CO", { provider, peerProvider: fakePeerProvider(REFERENCE) });

  assert.ok(!report.supportingMetrics.some((m) => m.method === "PE" || m.method === "PEG"));
  assert.ok(report.excludedMethods.some((e) => e.method === "PE"));
  assert.ok(report.excludedMethods.some((e) => e.method === "FORWARD_PE"));
  assert.ok(report.supportingMetrics.some((m) => m.method === "FCF_YIELD" || m.method === "PS" || m.method === "PB" || m.method === "EV_EBITDA"));
});

test("a large discount with strong ROIC produces highMarginOfSafety: true and an UNDERVALUED status", async () => {
  const metrics = emptyMetrics("CHEAP_CO", null);
  metrics.dataAvailable = true;
  metrics.price = 50; // well below the composite fair value implied by the reference multiples
  metrics.industry = "Software";
  metrics.eps = { trailing: 5, forward: 6 };
  metrics.epsGrowthYoY = 15;
  metrics.revenuePerShare = 20;
  metrics.bookValuePerShare = 10;
  metrics.fcfPerShare = 4;
  metrics.ebitdaPerShare = 8;
  metrics.netDebtPerShare = 0;
  metrics.roic = 20; // well above the 8% WACC proxy

  const provider = fakeMetricsProvider(metrics);
  const report = await generateReport("CHEAP_CO", { provider, peerProvider: fakePeerProvider(REFERENCE) });

  assert.equal(report.valuationStatus, "UNDERVALUED");
  assert.ok(report.discountToFairValue > 0.25);
});

test("never emits a forbidden governance key (action/decision/verdict/recommendation) anywhere in the report", async () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  metrics.price = 90;
  metrics.eps = { trailing: 5, forward: 6 };
  const provider = fakeMetricsProvider(metrics);
  const report = await generateReport("NVDA", { provider, peerProvider: fakePeerProvider(REFERENCE) });

  const serialized = JSON.stringify(report);
  for (const forbiddenKey of ["\"action\"", "\"decision\"", "\"verdict\"", "\"recommendation\"", "\"finalDecision\""]) {
    assert.ok(!serialized.includes(forbiddenKey), `report must never include the forbidden key ${forbiddenKey}`);
  }
});

test("generateReport retains the full raw inputs for auditability", async () => {
  const provider = fakeMetricsProvider(emptyMetrics("NVDA", "x"));
  const report = await generateReport("NVDA", { provider, peerProvider: fakePeerProvider(REFERENCE) });
  assert.ok(report.inputs);
  assert.equal(report.inputs.symbol, "NVDA");
});
