// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. Read-mostly
// access to the real, internal plan catalog (never fetched from a
// billing vendor — see the Plan model's own schema comment).
const { getPrismaClient } = require("../db/prismaClient");

async function listPlans() {
  const prisma = getPrismaClient();
  return prisma.plan.findMany({ orderBy: [{ priceCents: "asc" }] });
}

async function findByKey(key) {
  const prisma = getPrismaClient();
  return prisma.plan.findUnique({ where: { key } });
}

async function findById(id) {
  const prisma = getPrismaClient();
  return prisma.plan.findUnique({ where: { id } });
}

async function upsertPlan({ key, name, priceCents, billingPeriod, features }) {
  const prisma = getPrismaClient();
  return prisma.plan.upsert({
    where: { key },
    update: { name, priceCents, billingPeriod, features },
    create: { key, name, priceCents, billingPeriod, features },
  });
}

module.exports = { listPlans, findByKey, findById, upsertPlan };
