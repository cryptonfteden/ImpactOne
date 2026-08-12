const test = require("node:test");
const assert = require("node:assert/strict");
const treasuryProvider = require("./treasuryProvider");

test("Treasury parser uses the newest CSV row and normalizes its date", () => {
  const csv = [
    'Date,"1 Mo","2 Yr","10 Yr","30 Yr"',
    "08/06/2026,4.10,3.75,4.20,4.85",
    "01/02/2026,3.72,3.47,4.19,4.86",
  ].join("\n");

  const latest = treasuryProvider.parseLatestYieldCurve(csv);
  assert.equal(latest.Date, "08/06/2026");
  assert.equal(latest["10 Yr"], "4.20");
  assert.equal(treasuryProvider.toIsoDate(latest.Date), "2026-08-06");
});
