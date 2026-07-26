// Phase X5 — Part 3, Market Intelligence Layer.
//
// Named "symbolIntelligence", not "marketIntelligence": the codebase
// already has a large, unrelated `marketIntelligenceService`-shaped
// system mounted at `/api/v2/market-intelligence` (provider inventory,
// evidence matrix, technical/social/analyst/crypto/options/COT
// intelligence, research agent principles — see
// `controllers/marketIntelligenceController.js`). Reusing that name here
// would have silently collided with a real, already-mounted route.
// Conceptually this module fills the mission's "Market Intelligence
// Layer" role for the six named consumers (Impact Graph, Decision
// Center, Market Positioning, Opportunity Score, Alerts, AI Summary);
// see MARKET_INTELLIGENCE_SPEC.md for the full naming note.
//
// This module computes nothing new. Every field below is a direct call
// into an already-real, already-tested service (impactGraphService,
// marketPositioningService, opportunityScoreService, priceAlertService,
// autonomousRecommendationRepository) — the audit behind
// SCORING_ARCHITECTURE.md found zero duplicated scoring/business logic
// across those services, so this layer's job is composition, not
// reimplementation: one real object per symbol that every consumer can
// be read from, instead of independently re-fetching overlapping pieces.
//
// This is the foundation, not a completed migration: existing consumers
// (decisionCenterService, the Market Positioning screen, etc.) are
// unchanged in this phase — rewiring them to consume this object instead
// of calling their own dependency directly is deliberately left as
// documented follow-up work (see MARKET_INTELLIGENCE_SPEC.md's Migration
// Plan) rather than rushed across six live, tested modules in one pass.
const impactGraphService = require("./impactGraphService");
const marketPositioningService = require("./marketPositioningService");
const opportunityScoreService = require("./opportunityScoreService");
const priceAlertService = require("./priceAlertService");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

// Real per-field disclosure — if one of the five underlying services
// fails or has nothing to say, that shows up as a real null/empty entry
// with its own reason, never a fabricated placeholder standing in for
// the whole object.
async function settleField(promiseOrValue) {
  try {
    return await promiseOrValue;
  } catch (error) {
    return { unavailable: true, reason: error?.message || "Unavailable right now." };
  }
}

async function getSymbolIntelligence(symbol, { betaUserId } = {}) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  if (!normalizedSymbol) {
    throw badRequest("A symbol is required.");
  }

  const [impactGraph, marketPositioning, opportunityScore, recommendation, alerts] = await Promise.all([
    settleField(impactGraphService.getImpactGraph(normalizedSymbol)),
    settleField(marketPositioningService.getMarketPositioning({ symbols: [normalizedSymbol] })),
    settleField(opportunityScoreService.getOpportunityScore(normalizedSymbol)),
    settleField(autonomousRecommendationRepository.getActiveForSymbol(normalizedSymbol)),
    // Alerts are per-beta-user by design (Phase H2 isolation) — with no
    // identity, this is honestly reported as unavailable, never a
    // fabricated empty list implying "no alerts exist."
    betaUserId
      ? settleField(priceAlertService.listAlerts(betaUserId).then((all) => all.filter((alert) => alert.symbol === normalizedSymbol)))
      : { unavailable: true, reason: "No beta user identity — alerts are personal and require one." },
  ]);

  return {
    symbol: normalizedSymbol,
    generatedAt: new Date().toISOString(),
    impactGraph,
    marketPositioning,
    opportunityScore,
    // "AI Summary" — the symbol's real active recommendation, if one
    // exists. Never a separately generated summary; this is Family 1's
    // real quality/confidence/reasoning (see SCORING_ARCHITECTURE.md),
    // read once.
    aiSummary: recommendation
      ? { action: recommendation.action, qualityScore: recommendation.qualityScore, riskLabel: recommendation.riskLabel, reasoning: recommendation.reasoning }
      : null,
    alerts,
  };
}

module.exports = { getSymbolIntelligence };
