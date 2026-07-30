// Phase ANALYST-CONSENSUS-AGENT-001 — "Rating changes" + "Upgrade/
// Downgrade momentum" → "Rating Trend" and "Revision Score". Neither
// Finnhub's real `/stock/upgrade-downgrade` nor its real `/stock/eps-
// estimate` / `/stock/revenue-estimate` endpoints are reachable on the
// free tier configured in this environment (confirmed live: real HTTP
// 403s) — so true individual rating-change events and estimate
// revisions cannot be sourced. This analyzer instead derives a
// disclosed, honest PROXY for both: the real change in the weighted
// Consensus Score (consensusScoreAnalyzer.js's own formula) between
// the two most recent real Finnhub reporting periods. A rising score
// mirrors what a real net-upgrade trend and net-positive estimate
// revisions would look like; a falling score mirrors the reverse. This
// proxy relationship is stated explicitly, never presented as the
// official metric.
const { computeWeightedScore } = require("./consensusScoreAnalyzer");

const STABLE_BAND = 5; // points of Consensus Score change treated as noise

function emptyResult() {
  return { ratingTrend: "UNKNOWN", revisionScore: null, priorConsensusScore: null, latestConsensusScore: null };
}

/**
 * @param {Array<{period:string, strongBuy:number, buy:number, hold:number, sell:number, strongSell:number}>} periods - oldest-first, real Finnhub reporting periods
 * @returns {{ ratingTrend: "IMPROVING"|"DETERIORATING"|"STABLE"|"UNKNOWN", revisionScore: number|null, priorConsensusScore: number|null, latestConsensusScore: number|null }}
 */
function analyzeRatingTrend(periods) {
  if (periods.length < 2) return emptyResult();

  const latest = periods[periods.length - 1];
  const prior = periods[periods.length - 2];
  const latestConsensusScore = computeWeightedScore(latest);
  const priorConsensusScore = computeWeightedScore(prior);

  if (!Number.isFinite(latestConsensusScore) || !Number.isFinite(priorConsensusScore)) {
    return emptyResult();
  }

  const delta = latestConsensusScore - priorConsensusScore;
  const revisionScore = Math.max(-100, Math.min(100, delta));

  let ratingTrend = "STABLE";
  if (delta > STABLE_BAND) ratingTrend = "IMPROVING";
  else if (delta < -STABLE_BAND) ratingTrend = "DETERIORATING";

  return { ratingTrend, revisionScore, priorConsensusScore, latestConsensusScore };
}

module.exports = { analyzeRatingTrend, STABLE_BAND };
