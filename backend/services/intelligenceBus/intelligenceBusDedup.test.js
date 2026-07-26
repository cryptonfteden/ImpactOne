require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { computeDedupKey, computeIdentityKey } = require("./intelligenceBusDedup");

const BASE = { engineId: "options", eventType: "SWEEP", symbols: ["NVDA"], publishedAt: "2026-07-26T14:30:00.000Z", payload: { anomalyScore: 80 } };

test("deduplication: identical event fields always produce the identical dedup key", () => {
  assert.equal(computeDedupKey(BASE), computeDedupKey({ ...BASE }));
});

test("deduplication: dedup key is independent of symbol array order and case", () => {
  const a = computeDedupKey({ ...BASE, symbols: ["NVDA", "META"] });
  const b = computeDedupKey({ ...BASE, symbols: ["meta", "nvda"] });
  assert.equal(a, b);
});

test("deduplication: a genuinely different payload produces a different dedup key", () => {
  const a = computeDedupKey(BASE);
  const b = computeDedupKey({ ...BASE, payload: { anomalyScore: 81 } });
  assert.notEqual(a, b);
});

test("deduplication: a different publishedAt produces a different dedup key", () => {
  const a = computeDedupKey(BASE);
  const b = computeDedupKey({ ...BASE, publishedAt: "2026-07-26T14:31:00.000Z" });
  assert.notEqual(a, b);
});

test("identity key: same engine/eventType/symbols is the same series regardless of publishedAt/payload", () => {
  const a = computeIdentityKey(BASE);
  const b = computeIdentityKey({ ...BASE, publishedAt: "2026-07-27T00:00:00.000Z", payload: { anomalyScore: 10 } });
  assert.equal(a, b);
});

test("identity key: a different eventType is a different series", () => {
  const a = computeIdentityKey(BASE);
  const b = computeIdentityKey({ ...BASE, eventType: "BLOCK_TRADE" });
  assert.notEqual(a, b);
});
