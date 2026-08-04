require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const altDataService = require("./altDataService");
const finnhubService = require("./finnhubService");
const alternativeFusionService = require("./alternativeFusionService");

function withMocks({ alt, quote }, run) {
  const originalAlt = altDataService.getAltDataSummary;
  const originalQuote = finnhubService.getQuote;
  altDataService.getAltDataSummary = async () => alt;
  finnhubService.getQuote = async () => quote;
  return Promise.resolve(run()).finally(() => {
    altDataService.getAltDataSummary = originalAlt;
    finnhubService.getQuote = originalQuote;
  });
}

function altSummary({ cotSignal = null, probability = null, riskMode = null } = {}) {
  return {
    signals: {
      smartMoneyPositioning: { signal: cotSignal },
      predictionMarketProbabilities: probability !== null ? { probability } : null,
      macroRegime: riskMode ? { riskMode } : null,
    },
  };
}

test("Sprint 27 — zero available real signals stays at the honest neutral prior (50), never inflated", async () => {
  await withMocks({ alt: altSummary(), quote: { quote: { change: 0 }, fearGreed: { value: 50 } } }, async () => {
    const result = await alternativeFusionService.getUnifiedFusion({ symbol: "ZZZQ" });
    assert.equal(result.unifiedConfidence, 50);
  });
});

test("Sprint 27 — genuinely agreeing signals produce meaningfully higher confidence than the neutral base", async () => {
  await withMocks(
    {
      alt: altSummary({ cotSignal: "Bullish buildup", probability: 0.75, riskMode: "risk-on" }),
      quote: { quote: { change: 2.5 }, fearGreed: { value: 70 } },
    },
    async () => {
      const result = await alternativeFusionService.getUnifiedFusion({ symbol: "AAPL" });
      assert.ok(result.unifiedConfidence > 70, `expected high agreement to push confidence well above neutral, got ${result.unifiedConfidence}`);
    }
  );
});

test("Sprint 27 — confidence reflects AGREEMENT, not direction: a strong bearish majority is high confidence, evenly split signals are not", async () => {
  await withMocks(
    {
      // 1 bullish (COT) vs 3 bearish (polymarket, macro, price) — a real,
      // meaningful majority in one direction. Confidence should be high
      // (we're confident the picture is bearish), just as a 3-1 bullish
      // split would be high confidence in the bullish direction.
      alt: altSummary({ cotSignal: "Bullish buildup", probability: 0.25, riskMode: "risk-off" }),
      quote: { quote: { change: -1.5 }, fearGreed: { value: 50 } },
    },
    async () => {
      const result = await alternativeFusionService.getUnifiedFusion({ symbol: "MSFT" });
      assert.ok(result.unifiedConfidence > 50, `a clear 3-1 majority should read as meaningfully confident (in the bearish direction), got ${result.unifiedConfidence}`);
    }
  );

  await withMocks(
    {
      // A genuine even split (2 bullish, 2 bearish) — real disagreement,
      // not a clear picture either way. This is where confidence must
      // naturally stay near the neutral midpoint.
      alt: altSummary({ cotSignal: "Bullish buildup", probability: 0.25, riskMode: "risk-on" }),
      quote: { quote: { change: -1.5 }, fearGreed: { value: 50 } },
    },
    async () => {
      const result = await alternativeFusionService.getUnifiedFusion({ symbol: "TSLA" });
      assert.ok(Math.abs(result.unifiedConfidence - 50) <= 15, `a genuine even split should stay near the neutral midpoint, got ${result.unifiedConfidence}`);
    }
  );
});

test("Sprint 27 — two different symbols with genuinely different signals produce genuinely different confidence, not a clustered value", async () => {
  const strongBullish = await (async () => {
    return withMocks(
      { alt: altSummary({ cotSignal: "Bullish buildup", probability: 0.8, riskMode: "risk-on" }), quote: { quote: { change: 3 }, fearGreed: { value: 75 } } },
      () => alternativeFusionService.getUnifiedFusion({ symbol: "NVDA" })
    );
  })();
  const noSignal = await withMocks({ alt: altSummary(), quote: { quote: { change: 0 }, fearGreed: { value: 50 } } }, () =>
    alternativeFusionService.getUnifiedFusion({ symbol: "ZZZQ" })
  );

  assert.notEqual(strongBullish.unifiedConfidence, noSignal.unifiedConfidence);
});
