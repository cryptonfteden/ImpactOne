require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const symbolIntelligenceService = require("./symbolIntelligenceService");
const priceAlertService = require("./priceAlertService");
const finnhubService = require("./finnhubService");
const { truncateAll } = require("../test/dbHelpers");
const betaUserRepository = require("./betaUserRepository");

test.beforeEach(async () => {
  await truncateAll();
});

test("rejects an empty symbol", async () => {
  await assert.rejects(() => symbolIntelligenceService.getSymbolIntelligence(""), /symbol is required/);
});

test("composes real fields from every underlying service, uppercased, for a symbol with no data", async () => {
  const result = await symbolIntelligenceService.getSymbolIntelligence("zzzz");
  assert.equal(result.symbol, "ZZZZ");
  assert.equal(result.impactGraph.status, "NO_DATA");
  assert.equal(result.aiSummary, null);
});

test("without a beta user identity, alerts is honestly reported as unavailable — never a fabricated empty list", async () => {
  const result = await symbolIntelligenceService.getSymbolIntelligence("AAPL");
  assert.equal(result.alerts.unavailable, true);
});

test("with a real beta user identity, alerts reflects that user's real, symbol-filtered alerts", async () => {
  const inviteCode = "TEST-SYMBOL-INTEL";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const betaUser = existing || (await betaUserRepository.createBetaUser({ label: "Symbol Intel Test User", inviteCode }));
  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async (symbol) => ({ quote: { symbol, price: 100 } });
  try {
    await priceAlertService.createAlert(betaUser.id, { symbol: "AAPL", direction: "ABOVE", targetPrice: 200 });
    await priceAlertService.createAlert(betaUser.id, { symbol: "MSFT", direction: "ABOVE", targetPrice: 300 });

    const result = await symbolIntelligenceService.getSymbolIntelligence("AAPL", { betaUserId: betaUser.id });
    assert.equal(Array.isArray(result.alerts), true);
    assert.equal(result.alerts.length, 1);
    assert.equal(result.alerts[0].symbol, "AAPL");
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});
