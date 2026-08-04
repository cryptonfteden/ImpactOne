require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_FIELDS,
  buildEventEnvelope,
  validateEventEnvelope,
  buildDeduplicationKey,
  adaptLegacyFeedItemToEnvelope,
  deriveThemes,
} = require("./eventEnvelope");

function legacyFeedItem(overrides = {}) {
  return {
    headline: "NVDA announces new AI chip partnership",
    importanceScore: 78,
    whyItMatters: "Expands NVDA's data-center AI compute footprint.",
    sourceUrl: "https://news.example.com/nvda-chip",
    sourceName: "Reuters",
    publishedAt: new Date().toISOString(),
    confidence: 82,
    reliability: "high",
    impactType: "opportunity",
    riskLevel: "low",
    timeHorizon: "3-6 months",
    counterarguments: [],
    invalidationSignals: [],
    personalRelevance: "Directly affects NVDA.",
    ...overrides,
  };
}

test("buildEventEnvelope produces an object with exactly the required fields", () => {
  const envelope = buildEventEnvelope({ sourceName: "Reuters", sourceUrl: "https://x.example.com/1" });
  assert.deepEqual(Object.keys(envelope).sort(), [...REQUIRED_FIELDS].sort());
});

test("buildEventEnvelope derives category/region/language defaults and themes from the summary", () => {
  const envelope = buildEventEnvelope({
    sourceName: "Reuters",
    summary: "Quantum computing breakthrough announced by IBM",
    countries: ["US"],
  });
  assert.equal(envelope.category, envelope.eventType);
  assert.equal(envelope.region, "US");
  assert.equal(envelope.language, "en");
  assert.deepEqual(envelope.companies, []);
  assert.ok(envelope.themes.includes("quantum"));
});

test("buildEventEnvelope honors explicit companies/themes/language/region/category overrides", () => {
  const envelope = buildEventEnvelope({
    sourceName: "SEC",
    companies: ["Apple Inc."],
    themes: ["ai"],
    language: "fr",
    region: "EU",
    category: "regulation",
  });
  assert.deepEqual(envelope.companies, ["Apple Inc."]);
  assert.deepEqual(envelope.themes, ["ai"]);
  assert.equal(envelope.language, "fr");
  assert.equal(envelope.region, "EU");
  assert.equal(envelope.category, "regulation");
});

test("deriveThemes matches known theme keys and returns [] for unrelated text", () => {
  assert.deepEqual(deriveThemes("Defense contractor wins new missile deal"), ["defense"]);
  assert.deepEqual(deriveThemes("Local bakery opens new storefront"), []);
  assert.deepEqual(deriveThemes(""), []);
});

test("validateEventEnvelope passes for a well-formed envelope", () => {
  const envelope = buildEventEnvelope({ sourceName: "Reuters" });
  const result = validateEventEnvelope(envelope);
  assert.equal(result.valid, true);
  assert.deepEqual(result.missingFields, []);
});

test("validateEventEnvelope reports every missing required field", () => {
  const result = validateEventEnvelope({ eventId: "abc" });
  assert.equal(result.valid, false);
  assert.ok(result.missingFields.includes("sourceType"));
  assert.ok(result.missingFields.includes("deduplicationKey"));
  assert.ok(!result.missingFields.includes("eventId"));
});

test("buildDeduplicationKey is deterministic for identical inputs", () => {
  const input = { sourceType: "news", sourceUrl: "https://x.example.com/1", publishedAt: "2026-01-01T00:00:00.000Z" };
  assert.equal(buildDeduplicationKey(input), buildDeduplicationKey({ ...input }));
});

test("buildDeduplicationKey differs when the underlying source differs", () => {
  const a = buildDeduplicationKey({ sourceType: "news", sourceUrl: "https://x.example.com/1", publishedAt: "2026-01-01T00:00:00.000Z" });
  const b = buildDeduplicationKey({ sourceType: "news", sourceUrl: "https://x.example.com/2", publishedAt: "2026-01-01T00:00:00.000Z" });
  assert.notEqual(a, b);
});

test("adaptLegacyFeedItemToEnvelope maps a real matched-event shape into a valid envelope", () => {
  const envelope = adaptLegacyFeedItemToEnvelope(legacyFeedItem(), { symbol: "NVDA" });
  const result = validateEventEnvelope(envelope);

  assert.equal(result.valid, true);
  assert.equal(envelope.sourceName, "Reuters");
  assert.equal(envelope.sourceUrl, "https://news.example.com/nvda-chip");
  assert.deepEqual(envelope.symbols, ["NVDA"]);
  assert.equal(envelope.summary, "Expands NVDA's data-center AI compute footprint.");
  assert.equal(envelope.confidence, 82);
  assert.ok(Number.isFinite(envelope.credibilityScore));
  assert.ok(Number.isFinite(envelope.freshnessScore));
  assert.equal(envelope.relevanceScore, 78);
});

test("adaptLegacyFeedItemToEnvelope gracefully degrades when source fields are missing", () => {
  const envelope = adaptLegacyFeedItemToEnvelope(legacyFeedItem({ sourceName: null, sourceUrl: null, publishedAt: null }), { symbol: "AAPL" });
  const result = validateEventEnvelope(envelope);

  assert.equal(result.valid, true);
  assert.equal(envelope.credibilityScore, 60, "falls back to the default source credibility");
  assert.equal(envelope.freshnessScore, 40, "falls back to the default freshness with no publishedAt");
});

test("two adaptations of the same underlying evidence produce the same deduplicationKey", () => {
  const item = legacyFeedItem();
  const first = adaptLegacyFeedItemToEnvelope(item, { symbol: "NVDA" });
  const second = adaptLegacyFeedItemToEnvelope({ ...item }, { symbol: "NVDA" });
  assert.equal(first.deduplicationKey, second.deduplicationKey);
});
