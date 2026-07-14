// Namespace-style (not destructured) so tests can monkey-patch these —
// repo-wide convention, see intelligenceCache.js's comment on why.
const altDataService = require("./altDataService");
const finnhubService = require("./finnhubService");

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

/**
 * Sprint 27 — Priority 1. The prior formula's confidenceScore was almost
 * entirely a function of whether each alt-data SOURCE was live vs.
 * fallback (a fixed +10/+10/+10/+10/+8/+7 bonus ladder in
 * altDataService.computeConfidenceScore), not what the data actually said —
 * in an environment with no live API keys configured, every source is in
 * fallback, so the score clustered at the same base value for nearly every
 * symbol regardless of real signal content. This replaces that with a
 * genuine evidenceAgreement-style score (the same pattern
 * scoringVocabulary.js already uses: supportingCount / totalCount), built
 * from each signal's actual DIRECTION, not its availability:
 *   - COT positioning (bullish/bearish/neutral)
 *   - Polymarket probability deviation from 50/50
 *   - Macro regime (risk-on/risk-off)
 *   - Today's price direction
 *   - Fear/Greed extremes
 * More real signals that genuinely agree → higher confidence. Signals that
 * disagree pull confidence back toward the neutral midpoint — uncertainty
 * naturally lowers confidence, it is never overridden upward. Zero
 * available signals honestly stays at the neutral prior (50), never
 * inflated.
 */
function signalLean({ cotSignal, polymarketProbability, macroRiskMode, priceChange, fearGreed }) {
  const leans = [];

  if (cotSignal) {
    if (/bullish|long/i.test(cotSignal)) leans.push(1);
    else if (/bearish|short/i.test(cotSignal)) leans.push(-1);
  }
  if (Number.isFinite(polymarketProbability)) {
    if (polymarketProbability > 0.55) leans.push(1);
    else if (polymarketProbability < 0.45) leans.push(-1);
  }
  if (macroRiskMode) {
    leans.push(macroRiskMode === "risk-on" ? 1 : -1);
  }
  if (Number.isFinite(priceChange) && priceChange !== 0) {
    leans.push(priceChange > 0 ? 1 : -1);
  }
  if (Number.isFinite(fearGreed)) {
    if (fearGreed > 60) leans.push(1);
    else if (fearGreed < 40) leans.push(-1);
  }

  return leans;
}

function computeAgreementConfidence(leans) {
  if (!leans.length) return 50;
  const bullishCount = leans.filter((lean) => lean > 0).length;
  const bearishCount = leans.length - bullishCount;
  const majorityCount = Math.max(bullishCount, bearishCount);
  const agreementRatio = majorityCount / leans.length;
  // More signals AND higher agreement both raise confidence away from the
  // neutral midpoint; a single signal (trivially 100% "agreement" with
  // itself) is deliberately capped lower than several genuinely agreeing
  // signals, so signal count matters, not just ratio.
  const signalWeight = clamp(leans.length / 5, 0.2, 1);
  const swing = (agreementRatio - 0.5) * 2 * 40 * signalWeight;
  return clamp(Math.round(50 + swing), 0, 100);
}

async function getUnifiedFusion({ symbol = "AAPL" } = {}) {
  const normalized = String(symbol || "AAPL").toUpperCase();

  const [alt, quoteResult] = await Promise.all([
    altDataService.getAltDataSummary({ symbol: normalized }).catch(() => null),
    finnhubService.getQuote(normalized).catch(() => null),
  ]);

  const priceChange = Number(quoteResult?.quote?.change || 0);
  const fearGreed = Number(quoteResult?.fearGreed?.value || 50);

  const leans = signalLean({
    cotSignal: alt?.signals?.smartMoneyPositioning?.signal,
    polymarketProbability: alt?.signals?.predictionMarketProbabilities?.probability,
    macroRiskMode: alt?.signals?.macroRegime?.riskMode,
    priceChange,
    fearGreed,
  });
  const unifiedConfidence = computeAgreementConfidence(leans);

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
