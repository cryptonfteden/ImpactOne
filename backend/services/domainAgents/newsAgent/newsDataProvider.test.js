const test = require("node:test");
const assert = require("node:assert/strict");
const { createNewsDataProvider } = require("./newsDataProvider");
const companyProfileProvider = require("./companyProfileProvider");

function fakeNewsProvider(result) {
  return { async getSymbolNews() { return result; } };
}

test("getSymbolNewsData: combines real news articles and a real (attempted) company profile", async () => {
  const originalProfile = companyProfileProvider.getCompanyProfile;
  companyProfileProvider.getCompanyProfile = async () => ({ symbol: "AAPL", dataAvailable: true, unavailableReason: null, companyName: "Apple Inc", industry: "Technology" });
  try {
    const provider = createNewsDataProvider({
      newsProvider: fakeNewsProvider({ symbol: "AAPL", asOf: "2026-07-30T00:00:00Z", dataAvailable: true, unavailableReason: null, articles: [{ title: "t", description: "d", source: "Reuters", publishedAt: "2026-07-30T00:00:00Z", url: "u" }] }),
    });
    const metrics = await provider.getSymbolNewsData("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.articles.length, 1);
    assert.equal(metrics.profile.industry, "Technology");
  } finally {
    companyProfileProvider.getCompanyProfile = originalProfile;
  }
});

test("getSymbolNewsData: honestly reports unavailable when the real news source fails, regardless of the real profile", async () => {
  const originalProfile = companyProfileProvider.getCompanyProfile;
  companyProfileProvider.getCompanyProfile = async () => ({ symbol: "AAPL", dataAvailable: true, unavailableReason: null, companyName: "Apple Inc", industry: "Technology" });
  try {
    const provider = createNewsDataProvider({
      newsProvider: fakeNewsProvider({ symbol: "AAPL", asOf: "2026-07-30T00:00:00Z", dataAvailable: false, unavailableReason: "no key", articles: [] }),
    });
    const metrics = await provider.getSymbolNewsData("AAPL");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /no key/);
  } finally {
    companyProfileProvider.getCompanyProfile = originalProfile;
  }
});
