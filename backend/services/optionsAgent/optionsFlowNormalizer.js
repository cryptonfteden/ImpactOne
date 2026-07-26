// Phase AI-ENGINE-001.1 — Unusual Options Agent foundation. Canonical
// normalization per OPTIONS_AGENT_ARCHITECTURE.md §4 step 2 and
// OPTIONS_AGENT_DATA_MODEL.md's OptionsFlowPrint. Converts one raw vendor
// print (whatever shape a real vendor eventually sends) into one internal,
// validated contract shape — or rejects it, safely, with a specific reason.
// Never throws on malformed input: a bad record from an external vendor is
// an expected, routine event, not an exceptional one — the caller always
// gets back a { valid, print, errors } result it can log and skip.

const VALID_OPTION_TYPES = new Set(["CALL", "PUT"]);

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Validates and normalizes one raw options print. Returns
 * { valid: true, print, errors: [] } or { valid: false, print: null, errors: [...] }.
 * `errors` always lists every violation found (not just the first), so a
 * caller logging a rejected record can see the whole picture at once.
 */
function normalizeRawPrint(raw = {}) {
  const errors = [];

  const symbol = typeof raw.symbol === "string" ? raw.symbol.trim().toUpperCase() : null;
  if (!isNonEmptyString(symbol)) errors.push("symbol: required, non-empty string");

  const expiry = toDate(raw.expiry);
  if (!expiry) errors.push("expiry: required, valid date");

  const strike = Number(raw.strike);
  if (!isFiniteNumber(strike) || strike <= 0) errors.push("strike: required, finite number > 0");

  const optionType = typeof raw.optionType === "string" ? raw.optionType.trim().toUpperCase() : null;
  if (!VALID_OPTION_TYPES.has(optionType)) errors.push('optionType: required, must be "CALL" or "PUT"');

  const exchange = typeof raw.exchange === "string" ? raw.exchange.trim().toUpperCase() : null;
  if (!isNonEmptyString(exchange)) errors.push("exchange: required, non-empty string");

  const tradeTimestamp = toDate(raw.tradeTimestamp);
  if (!tradeTimestamp) errors.push("tradeTimestamp: required, valid date");

  // Premium — the per-contract execution price. Must be a real positive
  // number; a print with a zero or negative premium is not a real trade.
  const price = Number(raw.price);
  if (!isFiniteNumber(price) || price <= 0) errors.push("price (premium): required, finite number > 0");

  const size = Number(raw.size);
  if (!Number.isInteger(size) || size <= 0) errors.push("size (volume): required, positive integer");

  // Open interest is optional on a raw trade print (it's a separate,
  // end-of-day feed per the architecture doc's §5e) — but if present, it
  // must be a real non-negative integer, never a fabricated placeholder.
  let openInterest = null;
  if (raw.openInterest !== undefined && raw.openInterest !== null) {
    const parsedOi = Number(raw.openInterest);
    if (!Number.isInteger(parsedOi) || parsedOi < 0) {
      errors.push("openInterest: when present, must be a non-negative integer");
    } else {
      openInterest = parsedOi;
    }
  }

  // Bid/ask at trade time — optional, but if present must be real
  // positive numbers. Both are required together for aggressor-side
  // inference (architecture §5c) — never inferred from only one side.
  let bidAtTrade = null;
  let askAtTrade = null;
  if (raw.bidAtTrade !== undefined && raw.bidAtTrade !== null) {
    const parsedBid = Number(raw.bidAtTrade);
    if (!isFiniteNumber(parsedBid) || parsedBid <= 0) errors.push("bidAtTrade: when present, must be a finite number > 0");
    else bidAtTrade = parsedBid;
  }
  if (raw.askAtTrade !== undefined && raw.askAtTrade !== null) {
    const parsedAsk = Number(raw.askAtTrade);
    if (!isFiniteNumber(parsedAsk) || parsedAsk <= 0) errors.push("askAtTrade: when present, must be a finite number > 0");
    else askAtTrade = parsedAsk;
  }

  const sourceProviderId = typeof raw.sourceProviderId === "string" && raw.sourceProviderId.trim() ? raw.sourceProviderId.trim() : "optionsFlow";

  if (errors.length) {
    return { valid: false, print: null, errors };
  }

  // Aggressor side — inferred only when both real bid and ask are
  // present (architecture §5c: "never guessed from price alone without
  // the recorded bid/ask"). A print at/above ask is aggressor-buy; at/
  // below bid is aggressor-sell; otherwise UNKNOWN, never guessed.
  let aggressorSide = "UNKNOWN";
  if (bidAtTrade !== null && askAtTrade !== null) {
    if (price >= askAtTrade) aggressorSide = "BUY";
    else if (price <= bidAtTrade) aggressorSide = "SELL";
  }

  const notionalValue = Math.round(price * size * 100 * 100) / 100; // per-contract multiplier (100 shares), 2dp

  const print = {
    symbol,
    expiry,
    strike,
    optionType,
    exchange,
    tradeTimestamp,
    price,
    size,
    notionalValue,
    bidAtTrade,
    askAtTrade,
    aggressorSide,
    openInterest,
    sourceProviderId,
  };

  return { valid: true, print, errors: [] };
}

/**
 * Deterministic natural key for one print — the same real trade reported
 * twice (a duplicate vendor delivery, a retried request) always produces
 * the same key, so duplicate detection never depends on insertion order
 * or a database round-trip to work correctly.
 */
function computePrintDedupKey(print) {
  return [
    print.symbol,
    print.expiry.toISOString().slice(0, 10),
    print.strike,
    print.optionType,
    print.exchange,
    print.tradeTimestamp.toISOString(),
    print.price,
    print.size,
  ].join("|");
}

/**
 * Normalizes a batch of raw prints, rejecting malformed records safely
 * and dropping in-batch duplicates (same natural key) — never silently
 * double-counting the same real trade toward a detector's volume total.
 */
function normalizeBatch(rawRecords = []) {
  const validPrints = [];
  const rejected = [];
  const seenKeys = new Set();
  let duplicateCount = 0;

  for (const raw of rawRecords) {
    const result = normalizeRawPrint(raw);
    if (!result.valid) {
      rejected.push({ raw, errors: result.errors });
      continue;
    }
    const key = computePrintDedupKey(result.print);
    if (seenKeys.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seenKeys.add(key);
    validPrints.push(result.print);
  }

  return { validPrints, rejected, duplicateCount };
}

/**
 * Data-freshness check — a real, disclosed field on every emitted signal
 * (see the architecture doc's required-fields list). Never assumes data
 * is fresh; always computed from a real timestamp against "now."
 */
function computeDataFreshness(mostRecentTimestamp, { staleAfterMs = 15 * 60 * 1000, now = new Date() } = {}) {
  if (!mostRecentTimestamp) {
    return { isStale: true, ageMs: null, mostRecentTimestamp: null };
  }
  const timestamp = toDate(mostRecentTimestamp);
  if (!timestamp) {
    return { isStale: true, ageMs: null, mostRecentTimestamp: null };
  }
  const ageMs = now.getTime() - timestamp.getTime();
  return { isStale: ageMs > staleAfterMs, ageMs, mostRecentTimestamp: timestamp.toISOString() };
}

module.exports = {
  normalizeRawPrint,
  normalizeBatch,
  computePrintDedupKey,
  computeDataFreshness,
};
