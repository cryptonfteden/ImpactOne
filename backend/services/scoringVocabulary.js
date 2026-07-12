// Sprint 18A — Canonical Decision Architecture.
//
// The single documented scoring contract named in
// INTELLIGENCE_PLATFORM_REVIEW.md §10 item 2: "the one source of truth for
// evidence quality, adopted by both the Recommendation Engine and the
// (merged) Committee." This module documents and normalizes; it does not
// reimplement — sourceCredibility/evidenceFreshness wrap the existing,
// already-tested autonomousMarketService.sourceQualityScore/recencyScore
// rather than duplicating their logic.
//
// SCORE_DEFINITIONS is the contract itself. Its range/meaning/formula/
// fallback fields are what API_CONTRACTS.md's Shared Scoring Vocabulary
// section describes in prose, and what scoringVocabulary.test.js asserts
// against directly, so the documented contract and the tested behavior
// cannot silently drift apart.
const autonomousMarketService = require("./autonomousMarketService");
const portfolioRiskMetrics = require("../utils/portfolioRiskMetrics");

const { clamp } = portfolioRiskMetrics;

const SCORE_DEFINITIONS = {
  confidence: {
    range: [0, 100],
    meaning: "How strongly the engine's underlying signal supports the recommended action, for this specific symbol.",
    formula: "Equal to conviction today — see the conviction entry's note.",
    fallback: "Not applicable — always computed from rankingItem inputs, never missing.",
    apiField: "Recommendation.confidenceScore",
    uiRepresentation: "\"Confidence NN/100\" text, no color threshold.",
  },
  conviction: {
    range: [0, 100],
    meaning: "The engine's raw signal strength (opportunity/risk/momentum blend) that determines which action tier (BUY/REDUCE/EXIT) triggers.",
    formula: "autonomousMarketService.computeConvictionScore(rankingItem).",
    fallback: "Not applicable — always computed from rankingItem inputs.",
    apiField: "DecisionTrace.rankingResult.convictionScore",
    uiRepresentation: "Not shown directly; drives the action pill and scenario price-impact tiers.",
    note: "confidence, conviction, and qualityComponents.modelConfidence are currently the same underlying number under three names. This is an intentional, documented simplification pending real calibration data (see FIVE_YEAR_ARCHITECTURE_ROADMAP.md's Alpha Attribution Engine milestone) — not a bug. Differentiating them requires outcome history this platform does not yet have.",
  },
  quality: {
    range: [0, 100],
    meaning: "Weighted rollup of six components describing how trustworthy this recommendation's evidence base is.",
    formula: "autonomousRecommendationEngine.computeQualityScore — weighted average per QUALITY_WEIGHTS (sourceQuality 15%, evidenceFreshness 15%, portfolioRelevance 20%, evidenceAgreement 20%, dataCompleteness 10%, modelConfidence 20%).",
    fallback: "Each component has its own fallback (see sourceCredibility/evidenceFreshness/relevance/evidenceAgreement below); the rollup is always computable.",
    apiField: "Recommendation.qualityScore + Recommendation.qualityComponents",
    uiRepresentation: "\"Quality NN/100\" pill — opportunity-colored ≥75, neutral ≥50, risk-colored below.",
  },
  risk: {
    range: [0, 100],
    meaning: "How much downside/volatility risk this specific recommendation carries, folding in concentration and macro exposure.",
    formula: "computeSymbolRiskScore in autonomousRecommendationEngine.js — baseRisk*0.7 + concentration/recession/inflation penalties.",
    fallback: "baseRisk defaults to 50 when rankingItem.riskScore is missing.",
    apiField: "Recommendation.riskScore + Recommendation.riskLabel",
    uiRepresentation: "\"Risk {Low|Moderate|High}\" text, via portfolioRiskMetrics.riskLevelLabel.",
  },
  relevance: {
    range: [0, 100],
    meaning: "How directly this evidence/recommendation applies to the user's actual portfolio or watchlist, vs. a generic market scan.",
    formula: "portfolioRelevance quality component — 100 (portfolio) / 70 (watchlist) / 40 (market-scan) base, plus a capped weight boost when held.",
    fallback: "40 (market-scan baseline) when symbolSource is unknown.",
    apiField: "Recommendation.qualityComponents.portfolioRelevance",
    uiRepresentation: "Symbol-source badge (\"From your portfolio\" / \"On your watchlist\" / \"Market scan\"), not the raw number.",
  },
  sourceCredibility: {
    range: [0, 100],
    meaning: "How reliable the outlet/source of a piece of evidence is.",
    formula: "autonomousMarketService.sourceQualityScore(sourceName) — 95 for a known high-quality outlet, 60 default.",
    fallback: "60 when sourceName is missing or unrecognized.",
    apiField: "Recommendation.qualityComponents.sourceQuality",
    uiRepresentation: "Not shown per-source directly; rolled into the quality score breakdown panel.",
  },
  evidenceFreshness: {
    range: [0, 100],
    meaning: "How recent a piece of evidence is, decayed over time.",
    formula: "autonomousMarketService.recencyScore(publishedAt) — 100 within 6h, decaying to 10 beyond 168h.",
    fallback: "40 when publishedAt is missing.",
    apiField: "Recommendation.qualityComponents.evidenceFreshness",
    uiRepresentation: "Timestamp shown per citation; the score itself appears in the quality score breakdown panel.",
  },
  evidenceAgreement: {
    range: [0, 100],
    meaning: "What fraction of directional (supporting + opposing) matched evidence supports the recommended action.",
    formula: "supportingCount / (supportingCount + opposingCount) * 100.",
    fallback: "50 (neutral) when there is no directional evidence at all.",
    apiField: "Recommendation.qualityComponents.evidenceAgreement",
    uiRepresentation: "Quality score breakdown panel row.",
  },
  uncertainty: {
    range: [0, 100],
    meaning: "How much genuine disagreement exists across evidence and (when available) committee expert opinion — distinct from confidence, which reflects signal strength, not agreement.",
    formula: "computeUncertainty() — 100 minus the average of evidenceAgreement and the committee's consensusLevel; falls back to evidenceAgreement alone when no committee debate exists.",
    fallback: "50 when neither evidenceAgreement nor a committee consensusLevel is available.",
    apiField: "DecisionTrace.confidenceCalculation.uncertainty",
    uiRepresentation: "Not yet surfaced as its own UI element in this sprint; available via the decision-trace API for now.",
  },
};

const CANONICAL_SCORE_NAMES = Object.keys(SCORE_DEFINITIONS);

function getScoreDefinition(name) {
  return SCORE_DEFINITIONS[name] || null;
}

function normalizeSourceCredibility(sourceName) {
  return autonomousMarketService.sourceQualityScore(sourceName);
}

function normalizeEvidenceFreshness(publishedAt) {
  return autonomousMarketService.recencyScore(publishedAt);
}

/**
 * Sprint 18A — a genuinely new score, not an alias of confidence.
 * Confidence reflects signal strength; uncertainty reflects how much
 * evidence and (once available) committee opinion actually agree.
 */
function computeUncertainty({ evidenceAgreement, consensusLevel } = {}) {
  const agreement = Number.isFinite(evidenceAgreement) ? evidenceAgreement : null;
  const consensus = Number.isFinite(consensusLevel) ? consensusLevel : null;

  if (agreement === null && consensus === null) {
    return 50;
  }
  if (agreement !== null && consensus !== null) {
    return clamp(Math.round(100 - (agreement + consensus) / 2), 0, 100);
  }
  return clamp(Math.round(100 - (agreement ?? consensus)), 0, 100);
}

module.exports = {
  SCORE_DEFINITIONS,
  CANONICAL_SCORE_NAMES,
  getScoreDefinition,
  normalizeSourceCredibility,
  normalizeEvidenceFreshness,
  computeUncertainty,
};
