const test = require("node:test");
const assert = require("node:assert/strict");
const { ImpactOneTradingViewDatafeed } = require("./public/tradingViewDatafeed");

test("browser adapter translates UDF arrays into TradingView bars", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ s: "ok", t: [1_700_000_000], o: [100], h: [104], l: [99], c: [103], v: [900] }),
  });
  try {
    const adapter = new ImpactOneTradingViewDatafeed("http://localhost/datafeed");
    const result = await new Promise((resolve, reject) => adapter.getBars(
      { ticker: "NVDA" },
      "1D",
      { from: 0, to: 2_000_000_000 },
      (bars, meta) => resolve({ bars, meta }),
      reject,
    ));
    assert.deepEqual(result.bars, [{ time: 1_700_000_000_000, open: 100, high: 104, low: 99, close: 103, volume: 900 }]);
    assert.equal(result.meta.noData, false);
  } finally { global.fetch = originalFetch; }
});

test("browser adapter preserves an explicit no-data state", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ s: "no_data" }) });
  try {
    const adapter = new ImpactOneTradingViewDatafeed("http://localhost/datafeed");
    const result = await new Promise((resolve, reject) => adapter.getBars(
      { ticker: "NEWIPO" }, "1W", { from: 0, to: 2_000_000_000 },
      (bars, meta) => resolve({ bars, meta }), reject,
    ));
    assert.deepEqual(result.bars, []);
    assert.equal(result.meta.noData, true);
  } finally { global.fetch = originalFetch; }
});
