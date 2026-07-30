const test = require("node:test");
const assert = require("node:assert/strict");
const { getCompanyProfile, emptyProfile } = require("./companyProfileProvider");

test("emptyProfile honestly reports dataAvailable: false with the given reason", () => {
  const profile = emptyProfile("AAPL", "no data");
  assert.equal(profile.dataAvailable, false);
  assert.equal(profile.industry, null);
});

test("getCompanyProfile: parses a real successful response", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: { name: "Apple Inc", finnhubIndustry: "Technology" } });
  try {
    const profile = await getCompanyProfile("AAPL");
    assert.equal(profile.dataAvailable, true);
    assert.equal(profile.companyName, "Apple Inc");
    assert.equal(profile.industry, "Technology");
  } finally {
    require("axios").get = originalGet;
  }
});

test("getCompanyProfile: honestly reports unavailable on a real fetch failure", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.reject(new Error("simulated timeout"));
  try {
    const profile = await getCompanyProfile("AAPL");
    assert.equal(profile.dataAvailable, false);
    assert.match(profile.unavailableReason, /request failed/);
  } finally {
    require("axios").get = originalGet;
  }
});

test("getCompanyProfile: honestly reports unavailable with no symbol", async () => {
  const profile = await getCompanyProfile("");
  assert.equal(profile.dataAvailable, false);
});
