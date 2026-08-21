require("../test/testEnv");
const test = require("node:test");
const assert = require("node:assert/strict");
const intelligence = require("./marketNewsIntelligence");

test("official market-moving events outrank generic mentions", () => {
  const now = Date.parse("2026-08-20T12:00:00Z");
  const official = { summary: "Department of Energy awards grid infrastructure funding", sourceName: "U.S. Department of Energy", sourceUrl: "https://energy.gov/release", publishedAt: "2026-08-20T11:00:00Z", relevanceScore: 85 };
  const generic = { summary: "Technology shares were discussed today", sourceName: "Unknown blog", sourceUrl: "https://example.com/post", publishedAt: "2026-08-20T11:00:00Z", relevanceScore: 85 };
  assert.ok(intelligence.scoreEvent(official, { now }).score > intelligence.scoreEvent(generic, { now }).score);
  assert.equal(intelligence.sourceAuthority(official), 100);
});

test("impact enrichment explains energy infrastructure without inventing a company", () => {
  const [event] = intelligence.enrichAndRankEvents([{ summary: "Federal grid and nuclear infrastructure funding announced", sourceName: "Federal Register", sourceUrl: "https://federalregister.gov/example", publishedAt: new Date().toISOString(), symbols: [] }], { minScore: 0 });
  assert.ok(event.themes.includes("Energy infrastructure"));
  assert.match(event.whyItMatters, /utilities|power equipment/i);
  assert.deepEqual(event.symbols, []);
  assert.equal(event.evidenceClass, "PRIMARY_OFFICIAL");
});
