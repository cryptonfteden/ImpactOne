// Phase AI-ENGINE-001.1 — Unusual Options Agent foundation. Persistence
// per OPTIONS_AGENT_DATA_MODEL.md. OptionsFlowPrint/OptionsOpenInterestSnapshot
// are create+read only; OptionsSignal is append-only with exactly one
// disclosed exception (confirmOpenInterest, §4 of the data model doc) —
// never a general-purpose update.
const { getPrismaClient } = require("../../db/prismaClient");

/**
 * Inserts normalized prints, skipping any that already exist in the DB
 * under the same natural key (symbol, expiry, strike, optionType,
 * exchange, tradeTimestamp, price, size) — the in-batch dedup the
 * normalizer already does is not sufficient once ingestion runs more than
 * once against overlapping vendor windows (architecture §9's 3-5 minute
 * polling cadence means real overlap is expected, not exceptional).
 */
async function createPrints(prints = []) {
  if (!prints.length) return { created: 0, skippedExisting: 0 };

  const prisma = getPrismaClient();
  const symbols = [...new Set(prints.map((print) => print.symbol))];
  const existing = await prisma.optionsFlowPrint.findMany({
    where: { symbol: { in: symbols } },
    select: { symbol: true, expiry: true, strike: true, optionType: true, exchange: true, tradeTimestamp: true, price: true, size: true },
  });
  const existingKeys = new Set(
    existing.map((row) => [row.symbol, row.expiry.toISOString().slice(0, 10), row.strike.toString(), row.optionType, row.exchange, row.tradeTimestamp.toISOString(), row.price.toString(), row.size].join("|"))
  );

  const toCreate = prints.filter((print) => {
    const key = [print.symbol, print.expiry.toISOString().slice(0, 10), String(print.strike), print.optionType, print.exchange, print.tradeTimestamp.toISOString(), String(print.price), print.size].join("|");
    return !existingKeys.has(key);
  });

  if (!toCreate.length) {
    return { created: 0, skippedExisting: prints.length };
  }

  // `openInterest` is a normalizer-level validated field (a raw print may
  // arrive with it attached for context) but has no column on
  // OptionsFlowPrint — OI lives on its own OptionsOpenInterestSnapshot
  // table (data model doc §2) — so it's dropped here, not persisted twice.
  const rowsToInsert = toCreate.map(({ openInterest: _openInterest, ...row }) => row);
  await prisma.optionsFlowPrint.createMany({ data: rowsToInsert });
  return { created: toCreate.length, skippedExisting: prints.length - toCreate.length };
}

async function findRecentPrints(symbol, sinceDate) {
  const prisma = getPrismaClient();
  return prisma.optionsFlowPrint.findMany({
    where: { symbol, tradeTimestamp: { gte: sinceDate } },
    orderBy: { tradeTimestamp: "asc" },
  });
}

// Phase OPTIONS-AGENT-001 — the one read the new Options Flow Domain
// Agent needs that no existing repository function provided: every OI
// snapshot for a symbol at/after a given date, across every contract
// (not one specific contract, per findOpenInterestSnapshot above).
// Read-only; OptionsOpenInterestSnapshot's own write path (upsert) is
// untouched.
async function findRecentOpenInterestSnapshots(symbol, sinceDate) {
  const prisma = getPrismaClient();
  return prisma.optionsOpenInterestSnapshot.findMany({
    where: { symbol, snapshotDate: { gte: sinceDate } },
    orderBy: { snapshotDate: "desc" },
  });
}

/**
 * Upserts one OI snapshot — @@unique([symbol, expiry, strike, optionType,
 * snapshotDate]) makes this naturally idempotent for a re-run of the same
 * day's OI-confirmation job.
 */
async function upsertOpenInterestSnapshot(snapshot) {
  const prisma = getPrismaClient();
  const where = { symbol_expiry_strike_optionType_snapshotDate: { symbol: snapshot.symbol, expiry: snapshot.expiry, strike: snapshot.strike, optionType: snapshot.optionType, snapshotDate: snapshot.snapshotDate } };
  return prisma.optionsOpenInterestSnapshot.upsert({
    where,
    create: snapshot,
    update: { openInterest: snapshot.openInterest, ingestedAt: new Date() },
  });
}

async function findOpenInterestSnapshot(symbol, expiry, strike, optionType, snapshotDate) {
  const prisma = getPrismaClient();
  return prisma.optionsOpenInterestSnapshot.findUnique({
    where: { symbol_expiry_strike_optionType_snapshotDate: { symbol, expiry, strike, optionType, snapshotDate } },
  });
}

/**
 * Append-only create — the durable evidence record. Never call
 * prisma.optionsSignal.update directly outside confirmOpenInterest below.
 */
// Prisma returns Decimal-typed columns as Decimal.js instances, not plain
// JS numbers — every numeric field the API contract documents as a plain
// number (strike, volumeMultiple, notionalValue, putCallSkewZScore,
// anomalyScore) is converted here, once, so every caller downstream gets
// real plain numbers rather than needing to know which columns are
// Decimal-backed.
function toPlainSignal(row) {
  if (!row) return row;
  return {
    ...row,
    strike: row.strike === null || row.strike === undefined ? row.strike : Number(row.strike),
    volumeMultiple: row.volumeMultiple === null || row.volumeMultiple === undefined ? row.volumeMultiple : Number(row.volumeMultiple),
    notionalValue: row.notionalValue === null || row.notionalValue === undefined ? row.notionalValue : Number(row.notionalValue),
    putCallSkewZScore: row.putCallSkewZScore === null || row.putCallSkewZScore === undefined ? row.putCallSkewZScore : Number(row.putCallSkewZScore),
    anomalyScore: row.anomalyScore === null || row.anomalyScore === undefined ? row.anomalyScore : Number(row.anomalyScore),
  };
}

async function createSignal(signalData) {
  const prisma = getPrismaClient();
  const created = await prisma.optionsSignal.create({ data: signalData });
  return toPlainSignal(created);
}

/**
 * The ONE disclosed, bounded exception to append-only (data model doc
 * §4): transitions a PENDING signal's oiConfirmationStatus exactly once,
 * the session after detection. Never a general-purpose update — this is
 * the only field this repository will ever mutate on an existing row.
 */
async function confirmOpenInterest(signalId, { oiConfirmationStatus, openInterestDelta }) {
  const prisma = getPrismaClient();
  const updated = await prisma.optionsSignal.update({
    where: { id: signalId },
    data: { oiConfirmationStatus, openInterestDelta },
  });
  return toPlainSignal(updated);
}

async function listSignals({ symbol, signalType, since, minAnomalyScore = 0, limit = 50 } = {}) {
  const prisma = getPrismaClient();
  const where = {};
  if (symbol) where.symbol = symbol;
  if (signalType) where.signalType = signalType;
  if (since) where.detectedAt = { gte: since };
  if (minAnomalyScore) where.anomalyScore = { gte: minAnomalyScore };

  const rows = await prisma.optionsSignal.findMany({
    where,
    orderBy: { detectedAt: "desc" },
    take: Math.min(limit, 200),
  });
  return rows.map(toPlainSignal);
}

async function getSignalById(signalId) {
  const prisma = getPrismaClient();
  const row = await prisma.optionsSignal.findUnique({ where: { id: signalId } });
  return toPlainSignal(row);
}

async function listPendingSignalsBefore(sessionCutoff) {
  const prisma = getPrismaClient();
  const rows = await prisma.optionsSignal.findMany({ where: { oiConfirmationStatus: "PENDING", detectedAt: { lt: sessionCutoff } } });
  return rows.map(toPlainSignal);
}

module.exports = {
  createPrints,
  findRecentPrints,
  findRecentOpenInterestSnapshots,
  upsertOpenInterestSnapshot,
  findOpenInterestSnapshot,
  createSignal,
  confirmOpenInterest,
  listSignals,
  getSignalById,
  listPendingSignalsBefore,
  toPlainSignal,
};
