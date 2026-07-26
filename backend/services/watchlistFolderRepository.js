const { getPrismaClient } = require("../db/prismaClient");

// Phase H3 — all raw Prisma access for WatchlistFolder/WatchlistFolderItem
// lives here, mirroring portfolioRepository.js's role. Every read/write is
// scoped by betaUserId — there is no global/legacy fallback for this
// feature (see schema.prisma's own comment on this model).

async function listFolders(betaUserId) {
  const prisma = getPrismaClient();
  return prisma.watchlistFolder.findMany({
    where: { betaUserId },
    orderBy: { createdAt: "asc" },
    include: { items: { orderBy: { addedAt: "asc" } } },
  });
}

async function findFolder(betaUserId, folderId) {
  const prisma = getPrismaClient();
  return prisma.watchlistFolder.findFirst({
    where: { id: folderId, betaUserId },
    include: { items: { orderBy: { addedAt: "asc" } } },
  });
}

async function createFolder(betaUserId, name) {
  const prisma = getPrismaClient();
  return prisma.watchlistFolder.create({ data: { betaUserId, name }, include: { items: true } });
}

async function renameFolder(folderId, name) {
  const prisma = getPrismaClient();
  return prisma.watchlistFolder.update({ where: { id: folderId }, data: { name }, include: { items: true } });
}

async function deleteFolder(folderId) {
  const prisma = getPrismaClient();
  return prisma.watchlistFolder.delete({ where: { id: folderId } });
}

async function addSymbol(folderId, symbol) {
  const prisma = getPrismaClient();
  return prisma.watchlistFolderItem.upsert({
    where: { folderId_symbol: { folderId, symbol } },
    update: {},
    create: { folderId, symbol },
  });
}

async function removeSymbol(folderId, symbol) {
  const prisma = getPrismaClient();
  return prisma.watchlistFolderItem.deleteMany({ where: { folderId, symbol } });
}

// Phase X5 — Part 4, Professional Watchlists. `flags` is a partial patch
// ({ pinned?, priority?, aiFocus? }) — only the provided keys change,
// matching this codebase's established PATCH-semantics precedent
// (investorProfileController's update).
async function setItemFlags(folderId, symbol, flags) {
  const prisma = getPrismaClient();
  return prisma.watchlistFolderItem.updateMany({ where: { folderId, symbol }, data: flags });
}

module.exports = {
  listFolders,
  findFolder,
  createFolder,
  renameFolder,
  deleteFolder,
  addSymbol,
  removeSymbol,
  setItemFlags,
};
