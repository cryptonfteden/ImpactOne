const test = require("node:test");
const assert = require("node:assert/strict");
const { determineApplicableMethods } = require("./negativeEarningsHandler");
const { emptyMetrics } = require("./valuationDataProvider");

function metricsWith(overrides = {}) {
  const base = emptyMetrics("NVDA", null);
  base.dataAvailable = true;
  Object.assign(base.eps, overrides.eps);
  if ("epsGrowthYoY" in overrides) base.epsGrowthYoY = overrides.epsGrowthYoY;
  if ("revenuePerShare" in overrides) base.revenuePerShare = overrides.revenuePerShare;
  if ("bookValuePerShare" in overrides) base.bookValuePerShare = overrides.bookValuePerShare;
  if ("fcfPerShare" in overrides) base.fcfPerShare = overrides.fcfPerShare;
  if ("ebitdaPerShare" in overrides) base.ebitdaPerShare = overrides.ebitdaPerShare;
  return base;
}

test("a fully healthy, profitable company has all 7 methods applicable", () => {
  const metrics = metricsWith({
    eps: { trailing: 5, forward: 6 },
    epsGrowthYoY: 15,
    revenuePerShare: 20,
    bookValuePerShare: 10,
    fcfPerShare: 4,
    ebitdaPerShare: 8,
  });
  const { applicableMethods, excludedMethods } = determineApplicableMethods(metrics);
  assert.deepEqual(applicableMethods.sort(), ["EV_EBITDA", "FCF_YIELD", "FORWARD_PE", "PB", "PE", "PEG", "PS"].sort());
  assert.deepEqual(excludedMethods, []);
});

test("negative trailing EPS excludes P/E, with a real disclosed reason — never computed", () => {
  const metrics = metricsWith({ eps: { trailing: -2, forward: 6 } });
  const { applicableMethods, excludedMethods } = determineApplicableMethods(metrics);
  assert.ok(!applicableMethods.includes("PE"));
  const peExclusion = excludedMethods.find((e) => e.method === "PE");
  assert.match(peExclusion.reason, /zero or negative/);
});

test("negative trailing EPS also excludes PEG (depends on P/E), with a reason naming that dependency", () => {
  const metrics = metricsWith({ eps: { trailing: -2, forward: null }, epsGrowthYoY: 20 });
  const { applicableMethods, excludedMethods } = determineApplicableMethods(metrics);
  assert.ok(!applicableMethods.includes("PEG"));
  const pegExclusion = excludedMethods.find((e) => e.method === "PEG");
  assert.match(pegExclusion.reason, /depends on trailing P\/E/);
});

test("a positive trailing EPS but negative growth rate excludes PEG independently (not a P/E dependency reason)", () => {
  const metrics = metricsWith({ eps: { trailing: 5, forward: null }, epsGrowthYoY: -10 });
  const { applicableMethods, excludedMethods } = determineApplicableMethods(metrics);
  assert.ok(applicableMethods.includes("PE"));
  assert.ok(!applicableMethods.includes("PEG"));
  const pegExclusion = excludedMethods.find((e) => e.method === "PEG");
  assert.match(pegExclusion.reason, /growth rate is zero or negative/);
});

test("negative trailing EPS but a positive forward EPS estimate keeps Forward P/E applicable independently", () => {
  const metrics = metricsWith({ eps: { trailing: -2, forward: 3 } });
  const { applicableMethods } = determineApplicableMethods(metrics);
  assert.ok(!applicableMethods.includes("PE"));
  assert.ok(applicableMethods.includes("FORWARD_PE"));
});

test("negative EBITDA excludes EV/EBITDA, with a real disclosed reason", () => {
  const metrics = metricsWith({ eps: { trailing: 5, forward: null }, ebitdaPerShare: -1 });
  const { applicableMethods, excludedMethods } = determineApplicableMethods(metrics);
  assert.ok(!applicableMethods.includes("EV_EBITDA"));
  assert.match(excludedMethods.find((e) => e.method === "EV_EBITDA").reason, /zero or negative/);
});

test("negative FCF excludes FCF Yield — the negative-earnings fallback signal is not fabricated when genuinely absent", () => {
  const metrics = metricsWith({ eps: { trailing: 5, forward: null }, fcfPerShare: -3 });
  const { applicableMethods } = determineApplicableMethods(metrics);
  assert.ok(!applicableMethods.includes("FCF_YIELD"));
});

test("a negative-earnings, negative-FCF, negative-EBITDA company still keeps P/S applicable as long as revenue is positive", () => {
  const metrics = metricsWith({ eps: { trailing: -1, forward: -1 }, fcfPerShare: -2, ebitdaPerShare: -1, revenuePerShare: 10, bookValuePerShare: null });
  const { applicableMethods } = determineApplicableMethods(metrics);
  assert.deepEqual(applicableMethods, ["PS"]);
});

test("a genuinely unresolvable company (no positive method anywhere) has zero applicable methods, every one excluded with a real reason", () => {
  const metrics = metricsWith({ eps: { trailing: -1, forward: -1 }, fcfPerShare: -2, ebitdaPerShare: -1, revenuePerShare: null, bookValuePerShare: null });
  const { applicableMethods, excludedMethods } = determineApplicableMethods(metrics);
  assert.deepEqual(applicableMethods, []);
  assert.equal(excludedMethods.length, 7);
  assert.ok(excludedMethods.every((e) => typeof e.reason === "string" && e.reason.length > 0));
});

test("null (unavailable) inputs are treated the same as excluded, never coerced to zero or a fabricated default", () => {
  const metrics = metricsWith({ eps: { trailing: null, forward: null } });
  const { excludedMethods } = determineApplicableMethods(metrics);
  assert.match(excludedMethods.find((e) => e.method === "PE").reason, /unavailable/);
});
