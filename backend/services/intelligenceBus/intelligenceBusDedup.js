// Phase AI-ENGINE-003 — Platform Intelligence Bus. Deduplication and
// series-identity keys — both deterministic, pure functions (same real
// trade/event in, same key out, always), mirroring
// eventEnvelope.buildDeduplicationKey's exact hashing approach rather
// than inventing a second one.
const crypto = require("crypto");

function sortedSymbols(symbols = []) {
  return [...symbols].map((symbol) => String(symbol).toUpperCase()).sort();
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

/**
 * Identifies one exact event — the same (engine, type, symbols,
 * publishedAt, payload) submitted twice (a retried request, an
 * overlapping poll window) always produces the same key, so the Bus
 * never double-counts the same real event as two.
 */
function computeDedupKey({ engineId, eventType, symbols = [], publishedAt, payload = {} }) {
  const publishedAtIso = publishedAt instanceof Date ? publishedAt.toISOString() : new Date(publishedAt).toISOString();
  const basis = [engineId, eventType, sortedSymbols(symbols).join(","), publishedAtIso, stableStringify(payload)].join("|");
  return crypto.createHash("sha256").update(basis).digest("hex");
}

/**
 * Identifies a *series* — e.g. "options sweep signals for NVDA" or
 * "overall sentiment for the US market" — independent of
 * publishedAt/payload, used for supersession (a new event in the same
 * series marks the previous ACTIVE one SUPERSEDED, architecture §7).
 */
function computeIdentityKey({ engineId, eventType, symbols = [] }) {
  const basis = [engineId, eventType, sortedSymbols(symbols).join(",")].join("|");
  return crypto.createHash("sha256").update(basis).digest("hex");
}

module.exports = { sortedSymbols, computeDedupKey, computeIdentityKey };
