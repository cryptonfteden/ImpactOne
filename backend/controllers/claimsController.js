// Phase UI-INTEGRATION-001 — the first real HTTP surface for the Claim
// Intelligence Layer (built backend-only in Phase AI-CORE-001, with no
// routes by that phase's explicit scope). This controller is a thin
// pass-through to claimConsumerService — the one canonical read path —
// exactly the "controller adds no logic of its own" discipline every
// other v2 controller in this codebase already follows.
const claimConsumerService = require("../services/claimIntelligence/claimConsumerService");
const portfolioEngineService = require("../services/portfolioEngineService");
const attentionEngine = require("../services/attentionEngine/attentionEngine");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

/**
 * Phase PRODUCT-001 — "everything shown in the app receives an Attention
 * Score." Rather than duplicate this attach-step in every handler below,
 * one shared helper composes the real held-symbols set (from the real
 * portfolio) and decorates each real Claim with its real Attention Score
 * — the controller orchestrates two canonical services, it computes
 * nothing itself.
 */
async function attachAttentionScores(claims, betaUserId) {
  const summary = await portfolioEngineService.getPortfolioSummary(betaUserId);
  const heldSymbols = new Set((summary.positions || []).map((position) => position.symbol));
  const now = new Date();
  return claims.map((claim) => {
    const scored = attentionEngine.scoreClaimAttention(claim, { heldSymbols, now });
    return { ...claim, attentionScore: scored.score, attentionExplanation: scored.explanation };
  });
}

async function getActiveClaims(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const claims = await claimConsumerService.getActiveClaims({ limit });
    res.json({ claims: await attachAttentionScores(claims, req.betaUserId) });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getClaimsBySymbol(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const claims = await claimConsumerService.getClaimsBySymbol(req.params.symbol, { limit });
    res.json({ claims: await attachAttentionScores(claims, req.betaUserId) });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getPortfolioRelevantClaims(req, res, next) {
  try {
    const claims = await claimConsumerService.getClaimsByPortfolioRelevance({ betaUserId: req.betaUserId });
    res.json({ claims: await attachAttentionScores(claims, req.betaUserId) });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getOvernightChanges(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const claims = await claimConsumerService.getClaimsChangedOvernight({ limit });
    res.json({ claims: await attachAttentionScores(claims, req.betaUserId) });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getContestedClaims(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const claims = await claimConsumerService.getContestedClaims({ limit });
    res.json({ claims });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getRecentlyInvalidatedClaims(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const claims = await claimConsumerService.getRecentlyInvalidatedClaims({ limit });
    res.json({ claims });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getRecentlyResolvedClaims(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const since = req.query.since ? new Date(req.query.since) : undefined;
    const claims = await claimConsumerService.getRecentlyResolvedClaims({ since, limit });
    res.json({ claims });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getClaimHistory(req, res, next) {
  try {
    const history = await claimConsumerService.getClaimHistory(req.params.claimId);
    if (!history) {
      return res.status(404).json({ error: "Claim not found." });
    }
    res.json(history);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getStrongestEvidence(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const result = await claimConsumerService.getStrongestEvidence(req.params.claimId, { limit });
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = {
  getActiveClaims,
  getClaimsBySymbol,
  getPortfolioRelevantClaims,
  getContestedClaims,
  getRecentlyInvalidatedClaims,
  getRecentlyResolvedClaims,
  getOvernightChanges,
  getClaimHistory,
  getStrongestEvidence,
};
