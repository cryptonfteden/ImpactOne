// Phase AI-CORE-001 — Claim Intelligence Layer. Persistence.
// ClaimEvidence and ClaimTransition are strictly append-only (create
// only, no update/delete method is ever exposed here). Claim itself has
// exactly the bounded, disclosed update paths listed below — never a
// general-purpose update.
const { getPrismaClient } = require("../../db/prismaClient");

function toPlainDecimalFields(row, fields) {
  if (!row) return row;
  const copy = { ...row };
  for (const field of fields) {
    if (copy[field] !== null && copy[field] !== undefined) copy[field] = Number(copy[field]);
  }
  return copy;
}

function toPlainClaim(row) {
  return toPlainDecimalFields(row, ["probability", "confidence", "uncertainty"]);
}

function toPlainEvidence(row) {
  return toPlainDecimalFields(row, ["confidence", "contributionToClaim"]);
}

function toPlainOutcome(row) {
  return toPlainDecimalFields(row, ["magnitudeErrorPct", "timingErrorDays", "calibrationError", "windowReturnPct", "benchmarkReturnPct"]);
}

async function createClaim(data) {
  const prisma = getPrismaClient();
  const created = await prisma.claim.create({ data });
  return toPlainClaim(created);
}

async function findByIdentityKey(identityKey) {
  const prisma = getPrismaClient();
  const row = await prisma.claim.findUnique({ where: { identityKey } });
  return toPlainClaim(row);
}

async function getById(id) {
  const prisma = getPrismaClient();
  const row = await prisma.claim.findUnique({ where: { id } });
  return toPlainClaim(row);
}

/**
 * The one bounded, disclosed update path for scalar Claim fields
 * (confidence/probability/uncertainty/status/lastUpdatedAt is automatic
 * via @updatedAt/expiresAt/resolution/supersededByClaimId) — never a
 * general-purpose patch; every field this can touch is named here
 * explicitly, matching this platform's "narrow, single-purpose
 * repository method, never a generic update" convention (same precedent
 * as OptionsSignal's confirmOpenInterest).
 */
async function updateClaimScalars(id, { confidence, probability, uncertainty, status, expiresAt, resolution, supersededByClaimId, sourceAgents } = {}) {
  const prisma = getPrismaClient();
  const data = {};
  if (confidence !== undefined) data.confidence = confidence;
  if (probability !== undefined) data.probability = probability;
  if (uncertainty !== undefined) data.uncertainty = uncertainty;
  if (status !== undefined) data.status = status;
  if (expiresAt !== undefined) data.expiresAt = expiresAt;
  if (resolution !== undefined) data.resolution = resolution;
  if (supersededByClaimId !== undefined) data.supersededByClaimId = supersededByClaimId;
  if (sourceAgents !== undefined) data.sourceAgents = sourceAgents;
  const updated = await prisma.claim.update({ where: { id }, data });
  return toPlainClaim(updated);
}

async function listActive({ limit = 100 } = {}) {
  const prisma = getPrismaClient();
  const rows = await prisma.claim.findMany({
    where: { status: { in: ["ACTIVE", "STRENGTHENING", "WEAKENING", "CONTESTED"] } },
    orderBy: [{ lastUpdatedAt: "desc" }],
    take: limit,
  });
  return rows.map(toPlainClaim);
}

async function listOpenBySubjectHorizon({ subject, timeHorizon, symbols = [] } = {}) {
  const prisma = getPrismaClient();
  const rows = await prisma.claim.findMany({
    where: {
      subject,
      timeHorizon,
      status: { in: ["DRAFT", "ACTIVE", "STRENGTHENING", "WEAKENING", "CONTESTED"] },
      ...(symbols.length ? { symbols: { hasSome: symbols } } : {}),
    },
    orderBy: [{ firstObservedAt: "asc" }],
  });
  return rows.map(toPlainClaim);
}

async function listBySymbol(symbol, { limit = 100 } = {}) {
  const prisma = getPrismaClient();
  const rows = await prisma.claim.findMany({
    where: { symbols: { has: symbol } },
    orderBy: [{ lastUpdatedAt: "desc" }],
    take: limit,
  });
  return rows.map(toPlainClaim);
}

async function listContested({ limit = 100 } = {}) {
  const prisma = getPrismaClient();
  const rows = await prisma.claim.findMany({ where: { status: "CONTESTED" }, orderBy: [{ lastUpdatedAt: "desc" }], take: limit });
  return rows.map(toPlainClaim);
}

// Phase UI-INTEGRATION-001 — Mission Control's "Recently invalidated
// Claims" section needs this real status filter; no existing read
// function covered it. Same shape/precedent as listContested.
async function listInvalidated({ limit = 100 } = {}) {
  const prisma = getPrismaClient();
  const rows = await prisma.claim.findMany({ where: { status: "INVALIDATED" }, orderBy: [{ lastUpdatedAt: "desc" }], take: limit });
  return rows.map(toPlainClaim);
}

async function listRecentlyResolved({ since, limit = 100 } = {}) {
  const prisma = getPrismaClient();
  const rows = await prisma.claim.findMany({
    where: { status: { in: ["RESOLVED_CORRECT", "RESOLVED_PARTIAL", "RESOLVED_INCORRECT", "INSUFFICIENT_DATA"] }, ...(since ? { lastUpdatedAt: { gte: since } } : {}) },
    orderBy: [{ lastUpdatedAt: "desc" }],
    take: limit,
  });
  return rows.map(toPlainClaim);
}

async function listExpiredForGrading({ limit = 100 } = {}) {
  const prisma = getPrismaClient();
  const rows = await prisma.claim.findMany({ where: { status: { in: ["EXPIRED", "INVALIDATED"] } }, take: limit });
  return rows.map(toPlainClaim);
}

async function listOpenPastExpiry(now, { limit = 200 } = {}) {
  const prisma = getPrismaClient();
  const rows = await prisma.claim.findMany({
    where: { status: { in: ["DRAFT", "ACTIVE", "STRENGTHENING", "WEAKENING", "CONTESTED"] }, expiresAt: { lt: now } },
    take: limit,
  });
  return rows.map(toPlainClaim);
}

// --- Evidence ledger (append-only) ---

async function createEvidence(data) {
  const prisma = getPrismaClient();
  const created = await prisma.claimEvidence.create({ data });
  return toPlainEvidence(created);
}

async function listEvidenceForClaim(claimId) {
  const prisma = getPrismaClient();
  const rows = await prisma.claimEvidence.findMany({ where: { claimId }, orderBy: [{ addedAt: "asc" }] });
  return rows.map(toPlainEvidence);
}

// --- Transitions (append-only audit log) ---

async function createTransition(data) {
  const prisma = getPrismaClient();
  return prisma.claimTransition.create({ data });
}

async function listTransitionsForClaim(claimId) {
  const prisma = getPrismaClient();
  return prisma.claimTransition.findMany({ where: { claimId }, orderBy: [{ transitionedAt: "asc" }] });
}

// --- Outcomes ---

async function createOutcome(data) {
  const prisma = getPrismaClient();
  const created = await prisma.claimOutcome.create({ data });
  return toPlainOutcome(created);
}

async function getOutcomeForClaim(claimId, methodologyVersion) {
  const prisma = getPrismaClient();
  const row = await prisma.claimOutcome.findUnique({ where: { claimId_methodologyVersion: { claimId, methodologyVersion } } });
  return toPlainOutcome(row);
}

module.exports = {
  createClaim,
  findByIdentityKey,
  getById,
  updateClaimScalars,
  listActive,
  listOpenBySubjectHorizon,
  listBySymbol,
  listContested,
  listInvalidated,
  listRecentlyResolved,
  listExpiredForGrading,
  listOpenPastExpiry,
  createEvidence,
  listEvidenceForClaim,
  createTransition,
  listTransitionsForClaim,
  createOutcome,
  getOutcomeForClaim,
};
