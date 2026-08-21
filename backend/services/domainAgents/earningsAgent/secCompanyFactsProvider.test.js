require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCompanyFacts, dedupeQuarterly } = require("./secCompanyFactsProvider");

function fact(units) { return { units }; }
function row(end, val, fy, fp, filed = `${end.slice(0, 4)}-05-01`) {
  const start = new Date(`${end}T00:00:00Z`); start.setUTCDate(start.getUTCDate() - 89);
  return { start: start.toISOString().slice(0, 10), end, val, fy, fp, filed, form: "10-Q" };
}

test("parseCompanyFacts derives only real quarterly SEC metrics and keeps unavailable fields null", () => {
  const payload = { facts: { "us-gaap": {
    RevenueFromContractWithCustomerExcludingAssessedTax: fact({ USD: [row("2025-03-31", 100, 2025, "Q1"), row("2026-03-31", 120, 2026, "Q1")] }),
    NetIncomeLoss: fact({ USD: [row("2025-03-31", 10, 2025, "Q1"), row("2026-03-31", 18, 2026, "Q1")] }),
    GrossProfit: fact({ USD: [row("2025-03-31", 40, 2025, "Q1"), row("2026-03-31", 54, 2026, "Q1")] }),
    EarningsPerShareDiluted: fact({ "USD/shares": [row("2025-03-31", 1, 2025, "Q1"), row("2026-03-31", 1.5, 2026, "Q1")] }),
  } } };
  const result = parseCompanyFacts("TEST", payload);
  assert.equal(result.dataAvailable, true);
  assert.equal(result.sourceProvider, "SEC EDGAR Company Facts");
  assert.equal(result.revenue.growthYoY, 20);
  assert.equal(result.eps.growthYoY, 50);
  assert.equal(result.margins.netProfitMargin, 15);
  assert.equal(result.margins.grossMargin, 45);
  assert.equal(result.guidance.direction, null);
  assert.equal(result.analystRevisions.direction, null);
});

test("dedupeQuarterly rejects annual duration facts and keeps the latest filed duplicate", () => {
  const annual = { start: "2025-01-01", end: "2025-12-31", val: 500, fy: 2025, fp: "FY", filed: "2026-02-01", form: "10-K" };
  const old = row("2026-03-31", 100, 2026, "Q1", "2026-04-20");
  const amended = row("2026-03-31", 101, 2026, "Q1", "2026-04-25");
  assert.deepEqual(dedupeQuarterly([annual, old, amended]).map((item) => item.val), [101]);
});
