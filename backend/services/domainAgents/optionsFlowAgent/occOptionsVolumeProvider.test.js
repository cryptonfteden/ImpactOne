const test = require("node:test");
const assert = require("node:assert/strict");
const { fetchOccCustomerVolume, parseQuantityCsv, summarizeHistory } = require("./occOptionsVolumeProvider");

test("parseQuantityCsv sums official OCC quantity rows", () => {
  const csv = "quantity,underlying,symbol,actype,porc\n100,AAPL,AAPL,C,C\n250,AAPL,AAPL,C,C\n";
  assert.equal(parseQuantityCsv(csv), 350);
});

test("summarizeHistory identifies an end-of-day anomaly without pretending it is intraday flow", () => {
  const result = summarizeHistory([
    { reportDate: "2026-08-19", callVolume: 1600, putVolume: 800, totalVolume: 2400 },
    { reportDate: "2026-08-18", callVolume: 400, putVolume: 400, totalVolume: 800 },
    { reportDate: "2026-08-17", callVolume: 500, putVolume: 500, totalVolume: 1000 },
  ]);
  assert.equal(result.baselineSessions, 2);
  assert.equal(result.activityLevel, "UNUSUALLY_HIGH");
  assert.equal(result.volumeVsAverage, 2400 / 900);
});

test("fetchOccCustomerVolume returns a source-labelled EOD aggregate", async () => {
  const calls = [];
  const httpGet = async (_url, options) => {
    calls.push(options.params.porc);
    const quantity = options.params.porc === "C" ? 900 : 300;
    return { data: `quantity,underlying,symbol,actype,porc\n${quantity},AAPL,AAPL,C,${options.params.porc}\n` };
  };
  const result = await fetchOccCustomerVolume("aapl", { now: new Date("2026-08-18T12:00:00Z"), httpGet, historySessions: 3 });
  assert.equal(result.dataAvailable, true);
  assert.equal(result.callVolume, 900);
  assert.equal(result.putVolume, 300);
  assert.equal(result.putCallRatio, 1 / 3);
  assert.equal(result.source, "OCC Volume Query");
  assert.equal(result.freshness, "end-of-day");
  assert.equal(result.historicalContext.baselineSessions, 2);
  assert.equal(result.historicalContext.activityLevel, "NORMAL");
  assert.deepEqual(calls.sort(), ["C", "C", "C", "P", "P", "P"]);
});
