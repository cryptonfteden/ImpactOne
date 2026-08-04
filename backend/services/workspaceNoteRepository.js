const { getPrismaClient } = require("../db/prismaClient");

async function createNote({ folderId, betaUserId, text, isAiNote }) {
  const prisma = getPrismaClient();
  return prisma.workspaceNote.create({ data: { folderId, betaUserId, text, isAiNote: Boolean(isAiNote) } });
}

async function listNotes(folderId) {
  const prisma = getPrismaClient();
  return prisma.workspaceNote.findMany({ where: { folderId }, orderBy: { createdAt: "desc" } });
}

module.exports = { createNote, listNotes };
