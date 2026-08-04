// Phase AI-CORE-001 — Claim Intelligence Layer. Canonical read services
// (mission §9) — no Express routes this phase; every function here is
// directly callable/testable. Every result is composed through
// claimContract.composeClaimView, so every consumer always sees the
// same sanitized, governance-clean, fully-shaped Claim, never a
// per-consumer reshaping.
const portfolioEngineService = require("../portfolioEngineService");
const repository = require("./claimRepository");
const { composeClaimView } = require("./claimContract");

async function composeWithEvidence(claimRow) {
  const evidenceRows = await repository.listEvidenceForClaim(claimRow.id);
  return composeClaimView(claimRow, evidenceRows);
}

async function composeMany(claimRows) {
  return Promise.all(claimRows.map((row) => composeWithEvidence(row)));
}

async function getActiveClaims({ limit = 100 } = {}) {
  const rows = await repository.listActive({ limit });
  return composeMany(rows);
}

async function getClaimsBySymbol(symbol, { limit = 100 } = {}) {
  const rows = await repository.listBySymbol(String(symbol).toUpperCase(), { limit });
  return composeMany(rows);
}

/**
 * Claims relevant to a real portfolio — filtered to symbols the caller
 * actually holds (portfolioEngineService.getPortfolioSummary()'s real
 * positions), never a generic market-wide feed under this name (same
 * "never surfaced for an untracked symbol" design intent as Decision
 * Center). Honestly empty when the portfolio holds nothing matching any
 * active claim.
 */
async function getClaimsByPortfolioRelevance({ betaUserId } = {}) {
  const summary = await portfolioEngineService.getPortfolioSummary(betaUserId);
  const heldSymbols = new Set((summary.positions || []).map((position) => position.symbol));
  if (!heldSymbols.size) return [];

  const active = await repository.listActive({ limit: 500 });
  const relevant = active.filter((claim) => (claim.symbols || []).some((symbol) => heldSymbols.has(symbol)));
  return composeMany(relevant);
}

async function getContestedClaims({ limit = 100 } = {}) {
  const rows = await repository.listContested({ limit });
  return composeMany(rows);
}

// Phase UI-INTEGRATION-001 — Mission Control's "Recently invalidated
// Claims" section.
async function getRecentlyInvalidatedClaims({ limit = 100 } = {}) {
  const rows = await repository.listInvalidated({ limit });
  return composeMany(rows);
}

async function getRecentlyResolvedClaims({ since, limit = 100 } = {}) {
  const rows = await repository.listRecentlyResolved({ since, limit });
  return composeMany(rows);
}

/**
 * Phase PRODUCT-001 — Mission Control's "Claims that changed overnight."
 * A real, deterministic filter (lastUpdatedAt within the given window) over
 * two already-real feeds (open + recently invalidated claims) — never a
 * new claim-forming computation. Defaults to a 24-hour window ending at
 * `now` (caller-supplied so this stays testable/deterministic).
 */
async function getClaimsChangedOvernight({ since, now = new Date(), limit = 100 } = {}) {
  const windowStart = since || new Date(new Date(now).getTime() - 24 * 60 * 60 * 1000);
  const [active, invalidated] = await Promise.all([repository.listActive({ limit: 500 }), repository.listInvalidated({ limit: 200 })]);
  const changed = [...active, ...invalidated].filter((claim) => new Date(claim.lastUpdatedAt) >= windowStart);
  return composeMany(changed.slice(0, limit));
}

async function getClaimHistory(claimId) {
  const claim = await repository.getById(claimId);
  if (!claim) return null;
  const [evidenceRows, transitions, outcome] = await Promise.all([
    repository.listEvidenceForClaim(claimId),
    repository.listTransitionsForClaim(claimId),
    repository.getOutcomeForClaim(claimId, claim.methodologyVersion),
  ]);
  return {
    claim: composeClaimView(claim, evidenceRows),
    transitions,
    outcome: outcome || null,
  };
}

/**
 * The strongest supporting and contradicting evidence for one claim —
 * ranked by each entry's real, already-computed `contributionToClaim`
 * (falling back to raw confidence when contribution hasn't been
 * computed), never re-scored here.
 */
async function getStrongestEvidence(claimId, { limit = 3 } = {}) {
  const evidenceRows = await repository.listEvidenceForClaim(claimId);
  const rank = (row) => (Number.isFinite(row.contributionToClaim) ? row.contributionToClaim : row.confidence ?? -1);
  const supporting = evidenceRows.filter((row) => row.stance === "SUPPORTS").sort((a, b) => rank(b) - rank(a)).slice(0, limit);
  const contradicting = evidenceRows.filter((row) => row.stance === "CONTRADICTS" || row.stance === "INVALIDATES").sort((a, b) => rank(b) - rank(a)).slice(0, limit);
  return { strongestSupporting: supporting, strongestContradicting: contradicting };
}

module.exports = {
  getActiveClaims,
  getClaimsBySymbol,
  getClaimsByPortfolioRelevance,
  getContestedClaims,
  getRecentlyInvalidatedClaims,
  getRecentlyResolvedClaims,
  getClaimsChangedOvernight,
  getClaimHistory,
  getStrongestEvidence,
};
