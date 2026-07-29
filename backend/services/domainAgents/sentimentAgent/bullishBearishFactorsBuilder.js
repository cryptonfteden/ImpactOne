// Phase SENTIMENT-AGENT-001 — "Bullish Factors", "Bearish Factors",
// "Risks". Every string here is a deterministic template over a real,
// already-computed field — never an invented observation, and never an
// LLM call. `risks` are methodology/data-quality caveats (distinct from
// bearish sentiment content), consistent with how VALUATION_AGENT.js's
// `excludedMethods`/earnings' own `risks` field work in this codebase.
const MIN_ARTICLE_COUNT_FOR_CONFIDENCE = 5;
const MIN_SOURCE_DIVERSITY = 3;
const STRONG_RATIO_THRESHOLD = 1.5;

function buildBullishFactors({ sentimentState, sentimentScore, trend, velocity, articleRatio, divergence, priceChangePercent }) {
  const factors = [];
  if (sentimentState === "POSITIVE") factors.push(`Overall sentiment is positive (score ${sentimentScore}/100).`);
  if (trend === "IMPROVING") factors.push(`Sentiment trend is improving (${velocity.value} score points/day).`);
  if (Number.isFinite(articleRatio.ratio) && articleRatio.ratio >= STRONG_RATIO_THRESHOLD) {
    factors.push(`Positive articles outnumber negative articles ${articleRatio.ratio}x (${articleRatio.positiveCount} positive vs. ${articleRatio.negativeCount} negative).`);
  }
  if (divergence === "BULLISH_DIVERGENCE") {
    factors.push(`Bullish sentiment-price divergence: price fell ${Math.abs(priceChangePercent)}% while sentiment genuinely improved.`);
  }
  return factors;
}

function buildBearishFactors({ sentimentState, sentimentScore, trend, velocity, articleRatio, divergence, priceChangePercent }) {
  const factors = [];
  if (sentimentState === "NEGATIVE") factors.push(`Overall sentiment is negative (score ${sentimentScore}/100).`);
  if (trend === "DETERIORATING") factors.push(`Sentiment trend is deteriorating (${velocity.value} score points/day).`);
  if (articleRatio.negativeCount > articleRatio.positiveCount && articleRatio.negativeCount > 0) {
    factors.push(`Negative articles outnumber positive articles (${articleRatio.negativeCount} negative vs. ${articleRatio.positiveCount} positive).`);
  }
  if (divergence === "BEARISH_DIVERGENCE") {
    factors.push(`Bearish sentiment-price divergence: price rose ${priceChangePercent}% while sentiment genuinely deteriorated.`);
  }
  return factors;
}

function buildRisks({ socialSentimentAvailable, socialUnavailableReason, sourceQuality, articleCount, abnormalActivity }) {
  const risks = [];
  if (!socialSentimentAvailable) risks.push(`Social sentiment could not be assessed: ${socialUnavailableReason}`);
  if (sourceQuality.distinctSourceCount < MIN_SOURCE_DIVERSITY) {
    risks.push(`Low source diversity (${sourceQuality.distinctSourceCount} distinct source(s)) — this read may be skewed by a small number of outlets.`);
  }
  if (articleCount < MIN_ARTICLE_COUNT_FOR_CONFIDENCE) {
    risks.push(`Small real sample size (${articleCount} article(s)) — this sentiment read has limited statistical power.`);
  }
  for (const spike of abnormalActivity.volumeSpikes) {
    risks.push(`Abnormal article volume on ${spike.date} (z-score ${spike.zScore}) — may reflect a one-off news event rather than a sustained trend.`);
  }
  return risks;
}

module.exports = { buildBullishFactors, buildBearishFactors, buildRisks, MIN_ARTICLE_COUNT_FOR_CONFIDENCE, MIN_SOURCE_DIVERSITY, STRONG_RATIO_THRESHOLD };
