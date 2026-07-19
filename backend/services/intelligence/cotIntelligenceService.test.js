const test = require("node:test");
const assert = require("node:assert/strict");

const cotIntelligenceService = require("./cotIntelligenceService");

function row({ reportDate, commLong, commShort, nonCommLong, nonCommShort }) {
  return cotIntelligenceService.normalizeRow({
    market_and_exchange_names: "GOLD - COMMODITY EXCHANGE INC.",
    report_date_as_yyyy_mm_dd: reportDate,
    comm_positions_long_all: String(commLong),
    comm_positions_short_all: String(commShort),
    noncomm_positions_long_all: String(nonCommLong),
    noncomm_positions_short_all: String(nonCommShort),
    open_interest_all: "500000",
    change_in_noncomm_long_all: "100",
    change_in_noncomm_short_all: "-50",
  });
}

test("normalizeRow computes real net positions and derives publicationDate 3 days after the report date (Tuesday -> Friday)", () => {
  const parsed = row({ reportDate: "2026-07-14T00:00:00.000", commLong: 100, commShort: 150, nonCommLong: 300, nonCommShort: 200 });
  assert.equal(parsed.reportDate, "2026-07-14");
  assert.equal(parsed.publicationDate, "2026-07-17");
  assert.equal(parsed.commercial.net, -50);
  assert.equal(parsed.nonCommercial.net, 100);
});

test("computeWeekOverWeek reports the real direction of change between two consecutive reports", () => {
  const current = row({ reportDate: "2026-07-14T00:00:00.000", commLong: 100, commShort: 150, nonCommLong: 300, nonCommShort: 200 }); // net +100
  const previous = row({ reportDate: "2026-07-07T00:00:00.000", commLong: 100, commShort: 150, nonCommLong: 250, nonCommShort: 220 }); // net +30
  const result = cotIntelligenceService.computeWeekOverWeek(current, previous);
  assert.equal(result.netPositioningChange, 70);
  assert.equal(result.direction, "MORE_NET_LONG");
});

test("computeWeekOverWeek returns null without two real data points to compare, never a fabricated delta", () => {
  const current = row({ reportDate: "2026-07-14T00:00:00.000", commLong: 100, commShort: 150, nonCommLong: 300, nonCommShort: 200 });
  assert.equal(cotIntelligenceService.computeWeekOverWeek(current, null), null);
});

test("computeStaleStatus honestly flags a report older than one missed weekly cycle as STALE, and a recent one as CURRENT", () => {
  const recentDate = new Date(Date.now() - 5 * 86400000).toISOString();
  const oldDate = new Date(Date.now() - 20 * 86400000).toISOString();
  assert.equal(cotIntelligenceService.computeStaleStatus(recentDate), "CURRENT");
  assert.equal(cotIntelligenceService.computeStaleStatus(oldDate), "STALE");
});

test("computeStaleStatus never treats the normal ~7-day weekly gap as stale (the report must not be labeled daily)", () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  assert.equal(cotIntelligenceService.computeStaleStatus(sevenDaysAgo), "CURRENT");
});

test("computePercentile requires real history depth before computing anything, never a percentile from 2 points", () => {
  const shortHistory = [row({ reportDate: "2026-07-14T00:00:00.000", commLong: 1, commShort: 1, nonCommLong: 1, nonCommShort: 1 })];
  assert.equal(cotIntelligenceService.computePercentile(shortHistory), null);
});
