require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { getHistoricalMatches } = require("./historicalSimilarityService");

test("AI-TRUST-001 — an event with no genuine keyword match honestly returns zero historical analogs, never a fabricated flat-score default", () => {
  const matches = getHistoricalMatches("AAPL earnings");
  assert.deepEqual(matches, [], "an event matching none of the specific historical keywords must not fabricate a 'Covid' (or any) match");
});

test("AI-TRUST-001 — two genuinely unrelated, keyword-less events both return the same honest empty result, not a shared fabricated match", () => {
  const a = getHistoricalMatches("AAPL earnings");
  const b = getHistoricalMatches("Earnings calendar concentration");
  assert.deepEqual(a, []);
  assert.deepEqual(b, []);
});

test("AI-TRUST-001 — a genuine keyword match (Fed rate policy) still returns a real, non-zero, sourced similarity", () => {
  const matches = getHistoricalMatches("Fed rate hike");
  assert.ok(matches.length > 0, "a real keyword match must still be returned");
  assert.equal(matches[0].event, "Rate Hikes");
  assert.ok(matches[0].similarity > 0);
});

test("AI-TRUST-001 — a literal historical-event name in the text scores the real, highest (88) tier", () => {
  const matches = getHistoricalMatches("New pandemic wave prompts covid-style lockdowns");
  assert.ok(matches.length > 0);
  assert.equal(matches[0].event, "Covid");
  assert.equal(matches[0].similarity, 88);
});

test("AI-TRUST-001 — never returns a zero-similarity entry, since those are filtered as honestly-no-match", () => {
  const matches = getHistoricalMatches("A completely generic headline with no market keywords at all");
  for (const match of matches) {
    assert.ok(match.similarity > 0, "every returned match must be a real, non-fabricated match");
  }
});
