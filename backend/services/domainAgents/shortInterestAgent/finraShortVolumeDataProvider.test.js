const test = require("node:test");
const assert = require("node:assert/strict");
const { createFinraShortVolumeDataProvider, emptyMetrics } = require("./finraShortVolumeDataProvider");

function fixtureFileFor(date, symbol) {
  return `Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market\n${date}|${symbol}|100|1|200|Q`;
}

test("emptyMetrics honestly reports dataAvailable: false with the given reason, never fabricated rows", () => {
  const metrics = emptyMetrics("XYZ", "no data");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "no data");
  assert.deepEqual(metrics.dailyShortVolume, []);
});

test("createFinraShortVolumeDataProvider: only requests real weekdays, never a real Saturday/Sunday file", async () => {
  // A fixed 'now' of Wednesday 2026-07-29 (UTC).
  const now = () => new Date("2026-07-29T12:00:00Z");
  const requestedDates = [];
  const originalGet = require("axios").get;
  require("axios").get = (url) => {
    const match = url.match(/CNMSshvol(\d{8})\.txt/);
    requestedDates.push(match[1]);
    return Promise.resolve({ data: fixtureFileFor(match[1], "AAPL") });
  };
  try {
    const provider = createFinraShortVolumeDataProvider({ lookbackTradingDays: 5, now });
    await provider.getSymbolShortVolumeData("AAPL");
    for (const dateStr of requestedDates) {
      const date = new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00Z`);
      const day = date.getUTCDay();
      assert.ok(day !== 0 && day !== 6, `${dateStr} must never be a real Saturday/Sunday`);
    }
  } finally {
    require("axios").get = originalGet;
  }
});

test("createFinraShortVolumeDataProvider: returns real rows sorted oldest-first, trimmed to the real lookback count", async () => {
  const now = () => new Date("2026-07-29T12:00:00Z");
  const originalGet = require("axios").get;
  require("axios").get = (url) => {
    const match = url.match(/CNMSshvol(\d{8})\.txt/);
    return Promise.resolve({ data: fixtureFileFor(match[1], "AAPL") });
  };
  try {
    const provider = createFinraShortVolumeDataProvider({ lookbackTradingDays: 3, now });
    const metrics = await provider.getSymbolShortVolumeData("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.dailyShortVolume.length, 3);
    const dates = metrics.dailyShortVolume.map((day) => day.date);
    assert.deepEqual([...dates].sort(), dates, "real rows must be sorted oldest-first");
  } finally {
    require("axios").get = originalGet;
  }
});

test("createFinraShortVolumeDataProvider: a real missing day (holiday/network failure) is honestly skipped, never fabricated", async () => {
  const now = () => new Date("2026-07-29T12:00:00Z");
  const originalGet = require("axios").get;
  let callCount = 0;
  require("axios").get = (url) => {
    callCount += 1;
    const match = url.match(/CNMSshvol(\d{8})\.txt/);
    if (callCount === 1) return Promise.reject(new Error("simulated missing file"));
    return Promise.resolve({ data: fixtureFileFor(match[1], "AAPL") });
  };
  try {
    const provider = createFinraShortVolumeDataProvider({ lookbackTradingDays: 3, now });
    const metrics = await provider.getSymbolShortVolumeData("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.ok(metrics.dailyShortVolume.length <= 3);
  } finally {
    require("axios").get = originalGet;
  }
});

test("createFinraShortVolumeDataProvider: honestly reports unavailable when the real symbol has no data in the whole window", async () => {
  const now = () => new Date("2026-07-29T12:00:00Z");
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: "Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market\n" });
  try {
    const provider = createFinraShortVolumeDataProvider({ lookbackTradingDays: 3, now });
    const metrics = await provider.getSymbolShortVolumeData("NOPE");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /No real FINRA daily short-volume data/);
  } finally {
    require("axios").get = originalGet;
  }
});
