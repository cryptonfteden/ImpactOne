require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { toEarningsEvent, formatReleaseTime } = require("./earningsProvider");

test("earnings provider maps a Finnhub calendar item into a canonical event", () => {
  const event = toEarningsEvent({
    symbol: "AAPL",
    date: "2026-08-10",
    hour: "amc",
    quarter: 3,
    year: 2026,
    epsEstimate: 1.2,
  });

  assert.equal(event.eventType, "earnings-release");
  assert.deepEqual(event.symbols, ["AAPL"]);
  assert.match(event.summary, /after market close/);
  assert.equal(event.rawReference.epsEstimate, 1.2);
});

test("earnings provider rejects an item without a valid ticker and date", () => {
  assert.equal(toEarningsEvent({ symbol: "", date: "2026-08-10" }), null);
  assert.equal(toEarningsEvent({ symbol: "AAPL", date: "10-08-2026" }), null);
  assert.equal(formatReleaseTime("bmo"), "before market open");
});
