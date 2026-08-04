require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const normalizer = require("./optionsFlowNormalizer");

const VALID_RAW_PRINT = {
  symbol: "nvda",
  expiry: "2026-08-21",
  strike: 150,
  optionType: "call",
  exchange: "cboe",
  tradeTimestamp: "2026-07-25T14:30:00.000Z",
  price: 12.5,
  size: 200,
  bidAtTrade: 12.3,
  askAtTrade: 12.55,
};

test("normalizeRawPrint accepts a well-formed raw print and normalizes casing/derived fields", () => {
  const result = normalizer.normalizeRawPrint(VALID_RAW_PRINT);
  assert.equal(result.valid, true);
  assert.equal(result.print.symbol, "NVDA");
  assert.equal(result.print.optionType, "CALL");
  assert.equal(result.print.exchange, "CBOE");
  assert.equal(result.print.notionalValue, 12.5 * 200 * 100);
  // price 12.5 >= ask 12.55? no — but let's confirm aggressor inference uses real bid/ask
  assert.ok(["BUY", "SELL", "UNKNOWN"].includes(result.print.aggressorSide));
});

test("normalizeRawPrint infers aggressor BUY only when price is at/above the real recorded ask", () => {
  const result = normalizer.normalizeRawPrint({ ...VALID_RAW_PRINT, price: 12.6, askAtTrade: 12.55, bidAtTrade: 12.3 });
  assert.equal(result.print.aggressorSide, "BUY");
});

test("normalizeRawPrint infers aggressor SELL only when price is at/below the real recorded bid", () => {
  const result = normalizer.normalizeRawPrint({ ...VALID_RAW_PRINT, price: 12.3, askAtTrade: 12.55, bidAtTrade: 12.3 });
  assert.equal(result.print.aggressorSide, "SELL");
});

test("normalizeRawPrint never guesses aggressor side when bid/ask are absent", () => {
  const result = normalizer.normalizeRawPrint({ ...VALID_RAW_PRINT, bidAtTrade: undefined, askAtTrade: undefined });
  assert.equal(result.print.aggressorSide, "UNKNOWN");
});

test("malformed input: missing symbol is rejected safely, not thrown", () => {
  const result = normalizer.normalizeRawPrint({ ...VALID_RAW_PRINT, symbol: "" });
  assert.equal(result.valid, false);
  assert.equal(result.print, null);
  assert.ok(result.errors.some((error) => error.startsWith("symbol")));
});

test("malformed input: invalid optionType is rejected with a specific reason", () => {
  const result = normalizer.normalizeRawPrint({ ...VALID_RAW_PRINT, optionType: "FUTURE" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("optionType")));
});

test("malformed input: non-finite / negative numeric fields are all rejected, not coerced to zero", () => {
  const result = normalizer.normalizeRawPrint({ ...VALID_RAW_PRINT, strike: -5, price: NaN, size: -10 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith("strike")));
  assert.ok(result.errors.some((error) => error.startsWith("price")));
  assert.ok(result.errors.some((error) => error.startsWith("size")));
});

test("malformed input: invalid expiry/tradeTimestamp dates are rejected", () => {
  const result = normalizer.normalizeRawPrint({ ...VALID_RAW_PRINT, expiry: "not-a-date", tradeTimestamp: "also-not-a-date" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith("expiry")));
  assert.ok(result.errors.some((error) => error.startsWith("tradeTimestamp")));
});

test("malformed input: a negative openInterest is rejected even though it's an optional field", () => {
  const result = normalizer.normalizeRawPrint({ ...VALID_RAW_PRINT, openInterest: -1 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith("openInterest")));
});

test("normalizeRawPrint reports every violation at once, not just the first", () => {
  const result = normalizer.normalizeRawPrint({});
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 6);
});

test("duplicate prints: normalizeBatch drops an exact repeat of the same real trade within one batch", () => {
  const { validPrints, duplicateCount, rejected } = normalizer.normalizeBatch([VALID_RAW_PRINT, { ...VALID_RAW_PRINT }]);
  assert.equal(validPrints.length, 1);
  assert.equal(duplicateCount, 1);
  assert.equal(rejected.length, 0);
});

test("duplicate prints: two distinct real trades (different price) are never treated as duplicates", () => {
  const { validPrints, duplicateCount } = normalizer.normalizeBatch([VALID_RAW_PRINT, { ...VALID_RAW_PRINT, price: 13.0 }]);
  assert.equal(validPrints.length, 2);
  assert.equal(duplicateCount, 0);
});

test("normalizeBatch separates malformed records from valid ones without dropping the whole batch", () => {
  const { validPrints, rejected } = normalizer.normalizeBatch([VALID_RAW_PRINT, { ...VALID_RAW_PRINT, symbol: "" }, "not-an-object"]);
  assert.equal(validPrints.length, 1);
  assert.equal(rejected.length, 2);
});

test("stale data: computeDataFreshness reports isStale honestly once past the threshold", () => {
  const now = new Date("2026-07-25T15:00:00.000Z");
  const stale = normalizer.computeDataFreshness("2026-07-25T14:00:00.000Z", { staleAfterMs: 15 * 60 * 1000, now });
  assert.equal(stale.isStale, true);
  assert.equal(stale.ageMs, 60 * 60 * 1000);
});

test("stale data: computeDataFreshness reports fresh honestly when within the threshold", () => {
  const now = new Date("2026-07-25T15:00:00.000Z");
  const fresh = normalizer.computeDataFreshness("2026-07-25T14:50:00.000Z", { staleAfterMs: 15 * 60 * 1000, now });
  assert.equal(fresh.isStale, false);
});

test("stale data: no timestamp at all is honestly reported as stale, never assumed fresh", () => {
  const result = normalizer.computeDataFreshness(null);
  assert.equal(result.isStale, true);
  assert.equal(result.ageMs, null);
});
