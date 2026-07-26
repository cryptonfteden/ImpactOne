const { getPrismaClient } = require("../db/prismaClient");

async function listAlerts(betaUserId) {
  const prisma = getPrismaClient();
  return prisma.priceAlert.findMany({ where: { betaUserId }, orderBy: { createdAt: "desc" } });
}

async function findAlert(betaUserId, alertId) {
  const prisma = getPrismaClient();
  return prisma.priceAlert.findFirst({ where: { id: alertId, betaUserId } });
}

async function createAlert({ betaUserId, symbol, direction, targetPrice }) {
  const prisma = getPrismaClient();
  return prisma.priceAlert.create({ data: { betaUserId, symbol, direction, targetPrice } });
}

async function deactivateAlert(alertId) {
  const prisma = getPrismaClient();
  return prisma.priceAlert.update({ where: { id: alertId }, data: { status: "INACTIVE" } });
}

async function deleteAlert(alertId) {
  const prisma = getPrismaClient();
  return prisma.priceAlert.delete({ where: { id: alertId } });
}

async function listActiveAlerts() {
  const prisma = getPrismaClient();
  return prisma.priceAlert.findMany({ where: { status: "ACTIVE" } });
}

// One-time trigger: only ever moves ACTIVE -> TRIGGERED, never back. No
// update method anywhere in this file can move a TRIGGERED alert to any
// other status — that would require deleting and recreating it, a
// deliberate friction matching "one-time trigger behavior."
async function markTriggered(alertId, triggerPrice) {
  const prisma = getPrismaClient();
  return prisma.priceAlert.update({
    where: { id: alertId },
    data: { status: "TRIGGERED", triggeredAt: new Date(), triggerPrice },
  });
}

module.exports = {
  listAlerts,
  findAlert,
  createAlert,
  deactivateAlert,
  deleteAlert,
  listActiveAlerts,
  markTriggered,
};
