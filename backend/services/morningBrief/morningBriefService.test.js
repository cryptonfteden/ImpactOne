require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const finnhubService = require("../finnhubService");
const portfolioEngineService = require("../portfolioEngineService");
const portfolioRepository = require("../portfolioRepository");
const claimFormationService = require("../claimIntelligence/claimFormationService");
const morningBriefService = require("./morningBriefService");

function optionsBusEvent({ symbol = "NVDA", aggressorSide = "BUY", confidence = 78, publishedAt = "2026-07-26T14:30:00.000Z" } = {}) {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    engineId: "options",
    symbols: [symbol],
    payload: { signalType: "SWEEP", aggressorSide, explanation: `${symbol} calls swept multiple exchanges.` },
    provenance: { sourceEngine: "options", sourceProvider: "optionsFlow" },
    publishedAt,
    confidence,
  };
}

async function makeActiveClaim(symbol, now) {
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol }), { now });
  return claimFormationService.ingestBusEvent(
    optionsBusEvent({ symbol, confidence: 85, publishedAt: new Date(now.getTime() + 60000).toISOString() }),
    { now: new Date(now.getTime() + 60000) }
  );
}

async function withMockedQuote(price, run) {
  const original = finnhubService.getQuote;
  finnhubService.getQuote = async (symbol) => ({ quote: { symbol: String(symbol).toUpperCase(), price, change: 0, changePercent: 0 } });
  try {
    return await run();
  } finally {
    finnhubService.getQuote = original;
  }
}

test.beforeEach(async () => {
  await truncateAll();
});

test("generateMorningBrief is honestly empty (never fabricated) when nothing real exists yet", async () => {
  const brief = await morningBriefService.generateMorningBrief({ now: new Date("2026-07-27T12:00:00.000Z") });
  assert.deepEqual(brief.items, []);
  assert.equal(brief.itemCount, 0);
  assert.equal(brief.summary, "No meaningful intelligence to surface yet today.");
});

test("generateMorningBrief never exceeds 8 items even with many real active claims", async () => {
  const now = new Date("2026-07-27T12:00:00.000Z");
  const symbols = ["NVDA", "AMD", "META", "GOOG", "MSFT", "AAPL", "TSLA", "AMZN", "NFLX", "INTC"];
  for (const symbol of symbols) {
    await makeActiveClaim(symbol, now);
  }
  const brief = await morningBriefService.generateMorningBrief({ now: new Date(now.getTime() + 120000) });
  assert.ok(brief.items.length <= morningBriefService.MAX_ITEMS);
});

test("generateMorningBrief ranks a held-symbol claim above an otherwise-identical unheld one", async () => {
  const now = new Date("2026-07-27T12:00:00.000Z");
  await makeActiveClaim("NVDA", now);
  await makeActiveClaim("ZZZZ", now);

  await withMockedQuote(100, async () => {
    await portfolioEngineService.placeOrder({ symbol: "NVDA", side: "BUY", quantity: 10 });
  });

  const brief = await morningBriefService.generateMorningBrief({ now: new Date(now.getTime() + 120000) });
  const nvdaItem = brief.items.find((item) => item.affectedAssets?.includes("NVDA"));
  const zzzzItem = brief.items.find((item) => item.affectedAssets?.includes("ZZZZ"));
  assert.ok(nvdaItem);
  assert.ok(zzzzItem);
  assert.ok(nvdaItem.attentionScore > zzzzItem.attentionScore);
});

test("generateMorningBrief includes a real portfolio-value change item when one exists since yesterday", async () => {
  const portfolio = await portfolioEngineService.getOrCreateDefaultPortfolio();
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  await portfolioRepository.createPerformanceSnapshot({
    portfolioId: portfolio.id,
    capturedAt: yesterday,
    totalValue: 100000,
    cashBalance: 100000,
    positionsValue: 0,
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalReturnPct: 0,
    benchmarkReturnPct: null,
  });

  // Buy at $100, then mark to market at $150 — a real 5% total-value gain,
  // comfortably above the meaningful-change threshold (unlike a same-price
  // buy, which leaves total value unchanged since cash just converts to
  // position value at cost).
  await withMockedQuote(100, async () => {
    await portfolioEngineService.placeOrder({ symbol: "AMZN", side: "BUY", quantity: 100 });
  });

  const brief = await withMockedQuote(150, () => morningBriefService.generateMorningBrief({}));
  assert.ok(brief.items.some((item) => item.type === "portfolio-change"));
});

test("generateMorningBrief items are sorted strictly by attentionScore descending", async () => {
  const now = new Date("2026-07-27T12:00:00.000Z");
  await makeActiveClaim("NVDA", now);
  await makeActiveClaim("AMD", now);

  const brief = await morningBriefService.generateMorningBrief({ now: new Date(now.getTime() + 120000) });
  for (let i = 1; i < brief.items.length; i += 1) {
    assert.ok(brief.items[i - 1].attentionScore >= brief.items[i].attentionScore);
  }
});

test("every real brief item carries the required fields — headline, why it matters, affected assets, portfolio impact, confidence, recommended attention level", async () => {
  const now = new Date("2026-07-27T12:00:00.000Z");
  await makeActiveClaim("NVDA", now);

  const brief = await morningBriefService.generateMorningBrief({ now: new Date(now.getTime() + 120000) });
  assert.ok(brief.items.length >= 1);
  for (const item of brief.items) {
    assert.ok(item.headline);
    assert.ok(item.whyItMatters);
    assert.ok(Array.isArray(item.affectedAssets));
    assert.ok("portfolioImpact" in item);
    assert.ok("confidence" in item);
    assert.ok(["High", "Medium", "Low"].includes(item.recommendedAttentionLevel));
  }
});
