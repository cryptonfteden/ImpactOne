// Phase AI-ENGINE-002.1 — Market Sentiment Engine foundation. Persistence
// per MARKET_SENTIMENT_DATA_MODEL.md. Append-only: create + read only —
// no update method is ever exposed here. A (market, dimension,
// snapshotDate) triple, once captured, is never revised; the real
// @@unique constraint enforces this at the DB level too, so a second
// capture attempt for the same day fails loudly rather than silently
// overwriting history.
const { getPrismaClient } = require("../../db/prismaClient");

function toPlainSnapshot(row) {
  if (!row) return row;
  return {
    ...row,
    score: row.score === null || row.score === undefined ? row.score : Number(row.score),
    confidence: row.confidence === null || row.confidence === undefined ? row.confidence : Number(row.confidence),
  };
}

async function createSnapshot({ market, dimension, snapshotDate, score, confidence, contributors, missingInputs, methodologyVersion }) {
  const prisma = getPrismaClient();
  const created = await prisma.marketSentimentSnapshot.create({
    data: { market, dimension, snapshotDate, score, confidence, contributors, missingInputs, methodologyVersion },
  });
  return toPlainSnapshot(created);
}

/**
 * Most-recent-first history for one (market, dimension) pair — the input
 * marketSentimentRollup.computeTrend() expects.
 */
async function listSnapshotHistory({ market, dimension, limit = 30 }) {
  const prisma = getPrismaClient();
  const rows = await prisma.marketSentimentSnapshot.findMany({
    where: { market, dimension },
    orderBy: { snapshotDate: "desc" },
    take: limit,
  });
  return rows.map(toPlainSnapshot);
}

async function getSnapshot({ market, dimension, snapshotDate }) {
  const prisma = getPrismaClient();
  const row = await prisma.marketSentimentSnapshot.findUnique({
    where: { market_dimension_snapshotDate: { market, dimension, snapshotDate } },
  });
  return toPlainSnapshot(row);
}

async function listSnapshotsForDate({ snapshotDate }) {
  const prisma = getPrismaClient();
  const rows = await prisma.marketSentimentSnapshot.findMany({ where: { snapshotDate } });
  return rows.map(toPlainSnapshot);
}

module.exports = {
  createSnapshot,
  listSnapshotHistory,
  getSnapshot,
  listSnapshotsForDate,
  toPlainSnapshot,
};
