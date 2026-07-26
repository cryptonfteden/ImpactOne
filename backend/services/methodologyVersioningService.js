// Phase X11 — Part 3, Methodology Versioning. Every real change to a
// scoring weight/model this phase introduces (Outcome Feedback Loop,
// Dynamic Source Scoring) must be recorded here first — version, reason,
// evidence, affected models, expected impact — before it can be applied.
// Append-only: recordVersion always creates a new row; rollback creates a
// NEW row referencing what it restored, it never edits or deletes the row
// being rolled back. Same immutable-history convention as World Memory.
const { getPrismaClient } = require("../db/prismaClient");

function requireFields(data, fields) {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      const error = new Error(`${field} is required to record a methodology version.`);
      error.statusCode = 400;
      throw error;
    }
  }
}

async function recordVersion({ version, reason, evidence, affectedModels, expectedImpact }) {
  requireFields({ version, reason, evidence, affectedModels, expectedImpact }, ["version", "reason", "evidence", "affectedModels", "expectedImpact"]);
  const prisma = getPrismaClient();

  const existing = await prisma.methodologyVersion.findUnique({ where: { version } });
  if (existing) {
    const error = new Error(`Methodology version "${version}" already exists — versions are immutable, use a new version string.`);
    error.statusCode = 409;
    throw error;
  }

  return prisma.methodologyVersion.create({
    data: { version, reason, evidence, affectedModels, expectedImpact },
  });
}

async function getActiveVersion(affectedModel) {
  const prisma = getPrismaClient();
  const candidates = await prisma.methodologyVersion.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
  if (!affectedModel) return candidates[0] || null;
  return candidates.find((version) => Array.isArray(version.affectedModels) && version.affectedModels.includes(affectedModel)) || null;
}

async function listVersions({ affectedModel } = {}) {
  const prisma = getPrismaClient();
  const all = await prisma.methodologyVersion.findMany({ orderBy: { createdAt: "desc" } });
  if (!affectedModel) return all;
  return all.filter((version) => Array.isArray(version.affectedModels) && version.affectedModels.includes(affectedModel));
}

// Rollback never deletes or edits the version being rolled back — it
// marks it inactive and creates a brand-new version row that carries the
// prior version's real weights/reasoning forward as its own evidence,
// with an explicit rollback lineage.
async function rollbackToVersion(targetVersionString, { reason } = {}) {
  const prisma = getPrismaClient();
  const target = await prisma.methodologyVersion.findUnique({ where: { version: targetVersionString } });
  if (!target) {
    const error = new Error(`No methodology version "${targetVersionString}" to roll back to.`);
    error.statusCode = 404;
    throw error;
  }

  const currentActive = await prisma.methodologyVersion.findMany({ where: { isActive: true } });
  for (const active of currentActive) {
    await prisma.methodologyVersion.update({ where: { id: active.id }, data: { isActive: false, rolledBackAt: new Date(), rolledBackFrom: active.version } });
  }

  const rollbackVersion = `${targetVersionString}-rollback-${Date.now()}`;
  return prisma.methodologyVersion.create({
    data: {
      version: rollbackVersion,
      reason: reason || `Rolled back to ${targetVersionString}.`,
      evidence: target.evidence,
      affectedModels: target.affectedModels,
      expectedImpact: `Restores the behavior of ${targetVersionString}: ${target.expectedImpact}`,
    },
  });
}

module.exports = { recordVersion, getActiveVersion, listVersions, rollbackToVersion };
