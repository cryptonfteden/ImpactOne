// Sprint 37 Priority 10 — Cross-Source Evidence Matrix.
//
// SAFETY-CRITICAL: this is a read-only aggregation view. It never computes
// a single blended score and never feeds canonicalVerdict/the committee —
// the mission is explicit that "the canonical recommendation system
// remains the only source of the final verdict." Each category is shown
// independently; a caller wanting a verdict must go to the existing
// recommendation engine, not here.
const technicalIntelligenceService = require("./technicalIntelligenceService");
const analystConsensusService = require("./analystConsensusService");
const socialInfluenceService = require("./socialInfluenceService");
const cryptoDerivativesService = require("./cryptoDerivativesService");
const optionsIntelligenceService = require("./optionsIntelligenceService");
const researchAgentService = require("../researchAgentService");

const MATRIX_CATEGORIES = ["NEWS", "SOCIAL", "INSTITUTIONS", "ANALYSTS", "OPTIONS", "TECHNICAL", "SENTIMENT", "COT", "FUNDAMENTALS", "RESEARCH"];

function unavailableRow(category, reason) {
  return { category, stance: "UNAVAILABLE", confidence: 0, uncertainty: 100, sourceCount: 0, newestSource: null, strongestCounterEvidence: null, reason };
}

function buildTechnicalRow(analysis) {
  if (analysis.enoughDataStatus !== "SUFFICIENT") {
    return unavailableRow("TECHNICAL", "Not enough real price history yet for a reliable read.");
  }
  const trend = analysis.signals.trend;
  const rsi = analysis.signals.rsi;
  const contradicting = trend.signal === "UPTREND" && rsi.signal === "OVERBOUGHT";

  return {
    category: "TECHNICAL",
    stance: contradicting ? "CONTRADICTORY" : trend.signal === "UPTREND" ? "SUPPORTIVE" : trend.signal === "DOWNTREND" ? "CONTRADICTORY" : "NEUTRAL",
    confidence: trend.strength || 40,
    uncertainty: 100 - (trend.strength || 40),
    sourceCount: 1,
    newestSource: analysis.freshness?.lastBarDate || null,
    strongestCounterEvidence: contradicting ? `RSI is ${rsi.signal.toLowerCase()} while trend is ${trend.signal.toLowerCase()} — momentum may be overextended.` : null,
    isStale: (analysis.freshness?.ageDays || 0) > 5,
  };
}

function buildAnalystsRow(consensus) {
  if (!consensus.hasEnoughData) return unavailableRow("ANALYSTS", "Fewer than 2 recognized ratings available.");
  return {
    category: "ANALYSTS",
    stance: consensus.disagreement ? "CONTRADICTORY" : consensus.highRating?.scaleValue >= 4 ? "SUPPORTIVE" : consensus.lowRating?.scaleValue <= 2 ? "CONTRADICTORY" : "NEUTRAL",
    confidence: consensus.disagreement ? 25 : 55,
    uncertainty: consensus.disagreement ? 75 : 45,
    sourceCount: consensus.ratings.length,
    newestSource: consensus.ratings.map((rating) => rating.ratingDate).filter(Boolean).sort().reverse()[0] || null,
    strongestCounterEvidence: consensus.disagreement
      ? `${consensus.lowRating?.providerId} rates this "${consensus.lowRating?.rawRating}" while ${consensus.highRating?.providerId} rates it "${consensus.highRating?.rawRating}" — providers disagree, this is not consensus.`
      : null,
    disagreement: consensus.disagreement,
    isFixture: consensus.status === "FIXTURE",
  };
}

function buildSocialRow(feed) {
  if (!feed.posts.length) return unavailableRow("SOCIAL", "No watchlisted-account activity in this window.");
  const withImpact = feed.posts.filter((post) => post.potentialMarketImpact && post.potentialMarketImpact !== "UNKNOWN");
  return {
    category: "SOCIAL",
    stance: withImpact.length ? "NEUTRAL" : "UNAVAILABLE", // never a directional stance from posts alone
    confidence: Math.min(...feed.posts.map((post) => post.confidence)),
    uncertainty: Math.max(...feed.posts.map((post) => post.uncertainty)),
    sourceCount: feed.posts.length,
    newestSource: feed.posts.map((post) => post.publicationTimestamp).filter(Boolean).sort().reverse()[0] || null,
    strongestCounterEvidence: null,
    isFixture: feed.status === "FIXTURE",
  };
}

function buildCryptoRow(snapshot) {
  return {
    category: "SENTIMENT",
    stance: snapshot.crowdingRisk === "HIGH" ? "CONTRADICTORY" : "NEUTRAL", // crowding is a counter-signal, never confirmation
    confidence: 35,
    uncertainty: 65,
    sourceCount: 1,
    newestSource: snapshot.dataFreshness?.asOf || null,
    strongestCounterEvidence: snapshot.crowdingRisk === "HIGH" ? `${snapshot.longShort.longPct}% of positioning is long — historically a crowded-long extreme, a contrarian counter-signal, not confirmation.` : null,
    isFixture: snapshot.status === "FIXTURE",
  };
}

function buildOptionsRow(optionsSnapshot) {
  const definitiveBias = optionsSnapshot.snapshots.filter((snap) => snap.directionalBias.includes("BIAS"));
  return {
    category: "OPTIONS",
    stance: definitiveBias.length ? "NEUTRAL" : "UNAVAILABLE",
    confidence: definitiveBias.length ? 40 : 0,
    uncertainty: definitiveBias.length ? 60 : 100,
    sourceCount: optionsSnapshot.snapshots.length,
    newestSource: null,
    strongestCounterEvidence: optionsSnapshot.snapshots.some((snap) => snap.directionalBias === "HEDGING_OR_STRATEGY_AMBIGUOUS")
      ? "At least one large trade is part of a spread/hedge, not a directional bet — do not read raw call volume as bullish."
      : null,
    isFixture: optionsSnapshot.status === "FIXTURE",
  };
}

function buildResearchRow(evidenceItems) {
  if (!evidenceItems.length) return unavailableRow("RESEARCH", "No principle in the research registry references this symbol yet.");
  return {
    category: "RESEARCH",
    stance: "NEUTRAL", // a research principle is never a directional call by itself
    confidence: 30,
    uncertainty: 70,
    sourceCount: evidenceItems.length,
    newestSource: null,
    strongestCounterEvidence: null,
    reason: `${evidenceItems.length} registry principle(s) apply — see attributed source(s) for regime-scoped detail, not a directional signal.`,
  };
}

/**
 * Builds the full matrix for a symbol. Categories with no real integration
 * yet (News beyond the existing feed, Institutions, COT for an equity
 * symbol, Fundamentals beyond existing earnings data, Research) are
 * honestly UNAVAILABLE rather than populated with invented rows.
 */
async function buildEvidenceMatrix(symbol) {
  const [technical, socialFeed, researchEvidence] = await Promise.all([
    technicalIntelligenceService.analyzeSymbol(symbol),
    Promise.resolve(socialInfluenceService.getFixtureFeed()),
    researchAgentService.supplyResearchEvidence({}),
  ]);
  const analystConsensus = analystConsensusService.getFixtureConsensus(symbol);
  const cryptoSnapshot = cryptoDerivativesService.getFixtureSnapshot(symbol);
  const optionsSnapshot = optionsIntelligenceService.getFixtureSnapshot(symbol);

  const rows = {
    NEWS: unavailableRow("NEWS", "Not yet wired into this matrix — existing Daily Feed data covers this separately."),
    SOCIAL: buildSocialRow(socialFeed),
    INSTITUTIONS: unavailableRow("INSTITUTIONS", "SEC/SPDR institutional adapters are UNCONFIGURED this sprint."),
    ANALYSTS: buildAnalystsRow(analystConsensus),
    OPTIONS: buildOptionsRow(optionsSnapshot),
    TECHNICAL: buildTechnicalRow(technical),
    SENTIMENT: buildCryptoRow(cryptoSnapshot),
    COT: unavailableRow("COT", "COT reports are scoped to futures markets, not individual equity symbols."),
    FUNDAMENTALS: unavailableRow("FUNDAMENTALS", "Not yet wired into this matrix — existing earnings provider covers this separately."),
    RESEARCH: buildResearchRow(researchEvidence),
  };

  return {
    symbol,
    generatedAt: new Date().toISOString(),
    categories: MATRIX_CATEGORIES.map((category) => rows[category]),
    isVerdict: false, // the canonical recommendation system remains the only verdict source
  };
}

module.exports = { buildEvidenceMatrix, MATRIX_CATEGORIES };
