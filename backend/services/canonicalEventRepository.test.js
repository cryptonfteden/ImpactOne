require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const canonicalEventRepository = require("./canonicalEventRepository");
const eventEnvelope = require("./eventEnvelope");

test.beforeEach(async () => {
  await truncateAll();
});

function sampleEnvelope(overrides = {}) {
  return eventEnvelope.buildEventEnvelope({
    eventType: "regulation",
    sourceType: "sec-filing",
    sourceName: "SEC",
    sourceUrl: "https://sec.example.gov/filing/1",
    publishedAt: new Date().toISOString(),
    summary: "Example filing",
    confidence: 70,
    credibilityScore: 90,
    ...overrides,
  });
}

test("upsertIfNew persists a new envelope and reports isNew: true", async () => {
  const envelope = sampleEnvelope();
  const result = await canonicalEventRepository.upsertIfNew(envelope, { providerId: "sec" });
  assert.equal(result.isNew, true);

  const stored = await canonicalEventRepository.findByDeduplicationKey(envelope.deduplicationKey);
  assert.ok(stored);
  assert.equal(stored.providerId, "sec");
  assert.equal(stored.sourceName, "SEC");
});

test("upsertIfNew is idempotent for the same deduplicationKey (DB-level skip, not create-then-catch)", async () => {
  const envelope = sampleEnvelope();
  const first = await canonicalEventRepository.upsertIfNew(envelope, { providerId: "sec" });
  const second = await canonicalEventRepository.upsertIfNew(envelope, { providerId: "sec" });

  assert.equal(first.isNew, true);
  assert.equal(second.isNew, false);

  const all = await canonicalEventRepository.listRecent({ providerId: "sec" });
  assert.equal(all.length, 1);
});

test("listRecent filters by providerId", async () => {
  await canonicalEventRepository.upsertIfNew(sampleEnvelope({ sourceUrl: "https://a.example.com/1" }), { providerId: "sec" });
  await canonicalEventRepository.upsertIfNew(sampleEnvelope({ sourceUrl: "https://b.example.com/1" }), { providerId: "reutersBloombergWire" });

  const secOnly = await canonicalEventRepository.listRecent({ providerId: "sec" });
  assert.equal(secOnly.length, 1);
  assert.equal(secOnly[0].providerId, "sec");
});

test("findByDeduplicationKey returns null for an unknown key", async () => {
  const result = await canonicalEventRepository.findByDeduplicationKey("does-not-exist");
  assert.equal(result, null);
});
