const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { DATABASE_URL } = require("../config/env");

let prisma = null;

function getPrismaClient() {
  if (prisma) {
    return prisma;
  }

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Add it to backend/.env to enable portfolio persistence.");
  }

  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  prisma = new PrismaClient({ adapter });
  return prisma;
}

module.exports = { getPrismaClient };
