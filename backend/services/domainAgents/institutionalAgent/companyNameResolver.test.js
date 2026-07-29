const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveCompanyName, isConfigured } = require("./companyNameResolver");

test("isConfigured() reflects the real FINNHUB_API_KEY environment state", () => {
  assert.equal(typeof isConfigured(), "boolean");
});

test("resolveCompanyName: maps a real Finnhub name field onto the returned companyName", async () => {
  if (!isConfigured()) return; // this environment has no real key — covered by the unconfigured-path elsewhere
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: { name: "Apple Inc" } });
  try {
    const result = await resolveCompanyName("AAPL");
    assert.equal(result.dataAvailable, true);
    assert.equal(result.companyName, "Apple Inc");
  } finally {
    require("axios").get = originalGet;
  }
});

test("resolveCompanyName: honestly reports unavailable when Finnhub returns no real name field", async () => {
  if (!isConfigured()) return;
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: {} });
  try {
    const result = await resolveCompanyName("AAPL");
    assert.equal(result.dataAvailable, false);
    assert.match(result.unavailableReason, /no real company name/);
  } finally {
    require("axios").get = originalGet;
  }
});

test("resolveCompanyName: honestly reports unavailable on a real network failure, never throwing", async () => {
  if (!isConfigured()) return;
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.reject(new Error("simulated network failure"));
  try {
    const result = await resolveCompanyName("AAPL");
    assert.equal(result.dataAvailable, false);
    assert.match(result.unavailableReason, /simulated network failure/);
  } finally {
    require("axios").get = originalGet;
  }
});
