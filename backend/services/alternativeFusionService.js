const { getAltDataSummary } = require("./altDataService");
const { getQuote } = require("./finnhubService");

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

async function getUnifiedFusion({ symbol = "AAPL" } = {}) {
  const normalized = String(symbol || "AAPL").toUpperCase();

  const [alt, quoteResult] = await Promise.all([
    getAltDataSummary({ symbol: normalized }).catch(() => null),
    getQuote(normalized).catch(() => null),
  ]);

  const confidenceBase = Number(alt?.signals?.confidenceScore || 55);
  const priceChange = Number(quoteResult?.quote?.change || 0);
  const fearGreed = Number(quoteResult?.fearGreed?.value || 50);

  const unifiedConfidence = clamp(confidenceBase + (priceChange > 0 ? 3 : -2) + (fearGreed > 60 ? 3 : fearGreed < 40 ? -3 : 0), 0, 100);

  return {
    symbol: normalized,
    unifiedConfidence,
    sourcesUsed: {
      news: Boolean(quoteResult?.news?.length),
      cot: Boolean(alt?.cot),
      polymarket: Boolean(alt?.polymarket?.length),
      macro: Boolean(alt?.macro),
      sec: Boolean(alt?.sec),
      congress: Boolean(alt?.congress),
      economicCalendar: Boolean(alt?.events?.length),
      fearGreed: Boolean(quoteResult?.fearGreed),
      marketData: Boolean(quoteResult?.quote),
    },
    evidence: [
      alt?.signals?.smartMoneyPositioning?.signal || "Smart money positioning unavailable.",
      alt?.signals?.secFilingSignal || "SEC filing signal unavailable.",
      alt?.signals?.politicalTradingSignal || "Political trading signal unavailable.",
      `Price action today: ${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}%.`,
    ],
    risks: [
      alt?.signals?.macroRegime?.inflationPressure === "high" ? "Elevated inflation pressure may amplify volatility." : "Macro inflation pressure currently contained.",
      alt?.signals?.macroRegime?.recessionRisk === "high" ? "Recession risk regime remains elevated." : "Recession risk not in high-alert state.",
    ],
    alt,
    market: quoteResult,
  };
}

module.exports = { getUnifiedFusion };
