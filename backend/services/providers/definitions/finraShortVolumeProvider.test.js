require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { toFinraEvent } = require("./finraShortVolumeProvider");

test("FINRA provider labels daily short volume without calling it short interest", () => {
  const event = toFinraEvent({
    symbol: "AAPL",
    date: "20260806",
    shortVolume: 25,
    shortExemptVolume: 0,
    totalVolume: 100,
    shortVolumeRatio: 0.25,
  });
  assert.equal(event.eventType, "finra-daily-short-volume");
  assert.match(event.summary, /25.0%/);
  assert.match(event.summary, /not total short interest/);
});
