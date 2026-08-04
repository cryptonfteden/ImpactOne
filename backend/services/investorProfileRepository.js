const { getPrismaClient } = require("../db/prismaClient");

// All raw Prisma access for InvestorProfile lives in this file, mirroring
// portfolioRepository.js's singleton pattern. Unlike Portfolio there is no
// sensible default to create-on-first-read — age has no universal default —
// so this file exposes find/create/update, not a find-or-create.

// Phase H2 — betaUserId optional, for the real "skipped the beta invite
// entirely" solo/legacy path (createInvestorProfile stores betaUserId:
// null for that path — see investorProfileService.js).
//
// Phase X8 — Part 1, Identity Correction. Before this phase, a request
// with no betaUserId (including a BRAND-NEW browser that hasn't resolved
// an identity yet, not just a genuine legacy user) matched
// `orderBy: { createdAt: "asc" }` with no `where` filter at all — "the
// first InvestorProfile ever created, by anyone." A real, reproduced bug:
// a fresh session would silently inherit another beta user's (or the
// founder's) onboarding state, skipping onboarding entirely — global
// application state deciding a session-scoped question. Fixed to match
// `betaUserId: null` explicitly: a real legacy/skipped-beta profile
// (which is genuinely stored with a null betaUserId) is still found
// correctly, but a real beta user's profile (stored with a real,
// non-null betaUserId) can never leak into a different, identity-less
// session. See IDENTITY_FLOW_AUDIT.md.
async function findDefaultInvestorProfile(betaUserId) {
  const prisma = getPrismaClient();
  if (betaUserId) {
    return prisma.investorProfile.findFirst({ where: { betaUserId } });
  }
  return prisma.investorProfile.findFirst({ where: { betaUserId: null }, orderBy: { createdAt: "asc" } });
}

async function createInvestorProfile(data) {
  const prisma = getPrismaClient();
  return prisma.investorProfile.create({ data });
}

async function updateInvestorProfile(id, data) {
  const prisma = getPrismaClient();
  return prisma.investorProfile.update({ where: { id }, data });
}

module.exports = {
  findDefaultInvestorProfile,
  createInvestorProfile,
  updateInvestorProfile,
};
