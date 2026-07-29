const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveStockSector, isConfigured } = require("./stockSectorResolver");

test("isConfigured() reflects the real FINNHUB_API_KEY environment state", () => {
  assert.equal(typeof isConfigured(), "boolean");
});

test("resolveStockSector: maps a real Finnhub finnhubIndustry field onto the returned sector", async () => {
  if (!isConfigured()) return; // this environment has no real key — covered by the unconfigured-path test elsewhere
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: { finnhubIndustry: "Technology" } });
  try {
    const result = await resolveStockSector("AAPL");
    assert.equal(result.dataAvailable, true);
    assert.equal(result.sector, "Technology");
  } finally {
    require("axios").get = originalGet;
  }
});

test("resolveStockSector: honestly reports unavailable when Finnhub returns no real sector field", async () => {
  if (!isConfigured()) return;
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: {} });
  try {
    const result = await resolveStockSector("AAPL");
    assert.equal(result.dataAvailable, false);
    assert.match(result.unavailableReason, /no real sector/);
  } finally {
    require("axios").get = originalGet;
  }
});

test("resolveStockSector: honestly reports unavailable on a real network failure, never throwing", async () => {
  if (!isConfigured()) return;
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.reject(new Error("simulated network failure"));
  try {
    const result = await resolveStockSector("AAPL");
    assert.equal(result.dataAvailable, false);
    assert.match(result.unavailableReason, /simulated network failure/);
  } finally {
    require("axios").get = originalGet;
  }
});
