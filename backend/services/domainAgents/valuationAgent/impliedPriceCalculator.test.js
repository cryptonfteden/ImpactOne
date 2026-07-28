const test = require("node:test");
const assert = require("node:assert/strict");
const { computeImpliedPrices } = require("./impliedPriceCalculator");
const { emptyMetrics } = require("./valuationDataProvider");

const SECTOR_REFERENCE = {
  industry: "Software",
  source: "broad-market-reference",
  peerGroupSize: 0,
  multiples: { pe: 20, forwardPe: 18, peg: 1.5, evEbitda: 12, ps: 3, pb: 3, fcfYield: 4 },
  wacc: 8,
};

function metricsWith(overrides = {}) {
  const base = emptyMetrics("NVDA", null);
  base.dataAvailable = true;
  Object.assign(base.eps, overrides.eps);
  for (const key of ["epsGrowthYoY", "revenuePerShare", "bookValuePerShare", "fcfPerShare", "ebitdaPerShare", "netDebtPerShare"]) {
    if (key in overrides) base[key] = overrides[key];
  }
  return base;
}

test("P/E-implied price = sector median P/E x company trailing EPS", () => {
  const metrics = metricsWith({ eps: { trailing: 5, forward: null } });
  const { impliedPrices } = computeImpliedPrices(metrics, SECTOR_REFERENCE);
  const pe = impliedPrices.find((p) => p.method === "PE");
  assert.equal(pe.impliedPrice, 20 * 5);
});

test("Forward P/E-implied price uses the forward EPS estimate, not trailing", () => {
  const metrics = metricsWith({ eps: { trailing: 5, forward: 7 } });
  const { impliedPrices } = computeImpliedPrices(metrics, SECTOR_REFERENCE);
  const forwardPe = impliedPrices.find((p) => p.method === "FORWARD_PE");
  assert.equal(forwardPe.impliedPrice, 18 * 7);
});

test("PEG-implied price = (sector median PEG x company growth rate) x company EPS", () => {
  const metrics = metricsWith({ eps: { trailing: 5, forward: null }, epsGrowthYoY: 20 });
  const { impliedPrices } = computeImpliedPrices(metrics, SECTOR_REFERENCE);
  const peg = impliedPrices.find((p) => p.method === "PEG");
  assert.equal(peg.impliedPrice, 1.5 * 20 * 5);
});

test("EV/EBITDA-implied price subtracts real net debt per share (equity conversion), a step the research explicitly flags as easy to omit", () => {
  const metrics = metricsWith({ eps: { trailing: null, forward: null }, ebitdaPerShare: 4, netDebtPerShare: 10 });
  const { impliedPrices } = computeImpliedPrices(metrics, SECTOR_REFERENCE);
  const evEbitda = impliedPrices.find((p) => p.method === "EV_EBITDA");
  assert.equal(evEbitda.impliedPrice, 12 * 4 - 10);
});

test("EV/EBITDA-implied price with zero net debt (or unavailable, treated as zero) simply uses the raw enterprise-value-per-share figure", () => {
  const metrics = metricsWith({ eps: { trailing: null, forward: null }, ebitdaPerShare: 4 });
  const { impliedPrices } = computeImpliedPrices(metrics, SECTOR_REFERENCE);
  const evEbitda = impliedPrices.find((p) => p.method === "EV_EBITDA");
  assert.equal(evEbitda.impliedPrice, 12 * 4);
});

test("P/S-implied price = sector median P/S x company revenue per share", () => {
  const metrics = metricsWith({ eps: { trailing: null, forward: null }, revenuePerShare: 15 });
  const { impliedPrices } = computeImpliedPrices(metrics, SECTOR_REFERENCE);
  assert.equal(impliedPrices.find((p) => p.method === "PS").impliedPrice, 3 * 15);
});

test("P/B-implied price = sector median P/B x company book value per share", () => {
  const metrics = metricsWith({ eps: { trailing: null, forward: null }, bookValuePerShare: 12 });
  const { impliedPrices } = computeImpliedPrices(metrics, SECTOR_REFERENCE);
  assert.equal(impliedPrices.find((p) => p.method === "PB").impliedPrice, 3 * 12);
});

test("FCF-Yield-implied price = company FCF per share / (sector median FCF yield as a decimal) — the inverted direction the research calls out", () => {
  const metrics = metricsWith({ eps: { trailing: null, forward: null }, fcfPerShare: 2 });
  const { impliedPrices } = computeImpliedPrices(metrics, SECTOR_REFERENCE);
  assert.equal(impliedPrices.find((p) => p.method === "FCF_YIELD").impliedPrice, 2 / 0.04);
});

test("a method with no sector-relative reference multiple available is excluded, never silently defaulted to a fabricated multiple", () => {
  const noPeReference = { ...SECTOR_REFERENCE, multiples: { ...SECTOR_REFERENCE.multiples, pe: null } };
  const metrics = metricsWith({ eps: { trailing: 5, forward: null } });
  const { impliedPrices, excludedMethods } = computeImpliedPrices(metrics, noPeReference);
  assert.ok(!impliedPrices.some((p) => p.method === "PE"));
  assert.match(excludedMethods.find((e) => e.method === "PE").reason, /No sector-relative P\/E reference/);
});

test("methods structurally inapplicable per negativeEarningsHandler never even attempt a calculation", () => {
  const metrics = metricsWith({ eps: { trailing: -2, forward: null } });
  const { impliedPrices, excludedMethods } = computeImpliedPrices(metrics, SECTOR_REFERENCE);
  assert.ok(!impliedPrices.some((p) => p.method === "PE"));
  assert.ok(excludedMethods.some((e) => e.method === "PE" && /zero or negative/.test(e.reason)));
});

test("a fully healthy company with a complete sector reference produces all 7 real implied prices", () => {
  const metrics = metricsWith({
    eps: { trailing: 5, forward: 6 },
    epsGrowthYoY: 15,
    revenuePerShare: 20,
    bookValuePerShare: 10,
    fcfPerShare: 4,
    ebitdaPerShare: 8,
    netDebtPerShare: 2,
  });
  const { impliedPrices, excludedMethods } = computeImpliedPrices(metrics, SECTOR_REFERENCE);
  assert.equal(impliedPrices.length, 7);
  assert.deepEqual(excludedMethods, []);
});
