require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { computeExpiry, computeFreshness, resolveLifecycleStatus } = require("./intelligenceBusLifecycle");

test("event expiry: options events (intraday-cadence) expire much sooner than sentiment events (daily-cadence)", () => {
  const publishedAt = new Date("2026-07-26T14:00:00.000Z");
  const optionsExpiry = computeExpiry({ engineId: "options", publishedAt });
  const sentimentExpiry = computeExpiry({ engineId: "sentiment", publishedAt });
  assert.ok(optionsExpiry.getTime() < sentimentExpiry.getTime());
});

test("event expiry: an explicit expiresAt from the engine is always honored over the registry default", () => {
  const publishedAt = new Date("2026-07-26T14:00:00.000Z");
  const explicit = new Date("2026-07-26T15:00:00.000Z");
  const expiry = computeExpiry({ engineId: "options", publishedAt, explicitExpiresAt: explicit });
  assert.equal(expiry.getTime(), explicit.getTime());
});

test("event expiry: a market-quiet engine (short interest, published twice monthly) gets a real, much longer horizon", () => {
  const publishedAt = new Date("2026-07-26T14:00:00.000Z");
  const shortInterestExpiry = computeExpiry({ engineId: "shortInterest", publishedAt });
  const newsExpiry = computeExpiry({ engineId: "news", publishedAt });
  assert.ok(shortInterestExpiry.getTime() > newsExpiry.getTime());
});

test("computeFreshness: real age in ms relative to now, never fabricated", () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const freshness = computeFreshness({ publishedAt: "2026-07-26T14:00:00.000Z", now });
  assert.equal(freshness.ageMs, 60 * 60 * 1000);
  assert.equal(freshness.isFresh, true);
});

test("computeFreshness: an invalid timestamp is honestly reported, never guessed", () => {
  const freshness = computeFreshness({ publishedAt: "not-a-date" });
  assert.equal(freshness.ageMs, null);
  assert.equal(freshness.isFresh, false);
});

test("event expiry / lifecycle: an event past its real expiry is resolved as EXPIRED at read time", () => {
  const now = new Date("2026-07-27T00:00:00.000Z");
  const status = resolveLifecycleStatus({ persistedStatus: "ACTIVE", expiresAt: new Date("2026-07-26T23:00:00.000Z"), now });
  assert.equal(status, "EXPIRED");
});

test("lifecycle: an event still within its real expiry window stays ACTIVE", () => {
  const now = new Date("2026-07-26T14:05:00.000Z");
  const status = resolveLifecycleStatus({ persistedStatus: "ACTIVE", expiresAt: new Date("2026-07-26T15:00:00.000Z"), now });
  assert.equal(status, "ACTIVE");
});

test("lifecycle: a persisted SUPERSEDED status always wins over a time-based recomputation", () => {
  const now = new Date("2026-07-26T14:05:00.000Z"); // well before expiresAt
  const status = resolveLifecycleStatus({ persistedStatus: "SUPERSEDED", expiresAt: new Date("2026-07-26T15:00:00.000Z"), now });
  assert.equal(status, "SUPERSEDED");
});

test("lifecycle: no expiresAt at all is honestly ACTIVE, never fabricated EXPIRED", () => {
  const status = resolveLifecycleStatus({ persistedStatus: "ACTIVE", expiresAt: null, now: new Date() });
  assert.equal(status, "ACTIVE");
});
