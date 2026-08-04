const { getPrismaClient } = require("../db/prismaClient");

async function createNotification(data) {
  const prisma = getPrismaClient();
  return prisma.notification.create({ data });
}

async function listNotifications(betaUserId) {
  const prisma = getPrismaClient();
  return prisma.notification.findMany({ where: { betaUserId }, orderBy: { createdAt: "desc" } });
}

async function findNotification(betaUserId, notificationId) {
  const prisma = getPrismaClient();
  return prisma.notification.findFirst({ where: { id: notificationId, betaUserId } });
}

async function countUnread(betaUserId) {
  const prisma = getPrismaClient();
  return prisma.notification.count({ where: { betaUserId, isRead: false } });
}

async function markRead(notificationId) {
  const prisma = getPrismaClient();
  return prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
}

// Phase X4 — real, persisted pin state (mirrors DecisionState's
// pin/dismiss/complete pattern, but lives directly on Notification since
// a notification's identity IS the notification row, unlike a Decision
// item which is synthesized from several sources).
async function setPinned(notificationId, isPinned) {
  const prisma = getPrismaClient();
  return prisma.notification.update({ where: { id: notificationId }, data: { isPinned } });
}

async function deleteNotification(notificationId) {
  const prisma = getPrismaClient();
  return prisma.notification.delete({ where: { id: notificationId } });
}

module.exports = { createNotification, listNotifications, findNotification, countUnread, markRead, setPinned, deleteNotification };
