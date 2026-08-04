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

test("LIVE-DATA-FINAL-001 — 'Shipping rates surge' (freight pricing) must not falsely match 'Rate Hikes' via a substring inside 'rates'", () => {
  const matches = getHistoricalMatches("Shipping rates surge");
  const rateHikesMatch = matches.find((m) => m.event === "Rate Hikes");
  assert.equal(rateHikesMatch, undefined, "'rates' (freight) is not the same word as 'rate' (interest) and must not match");
});

test("LIVE-DATA-FINAL-001 — 'Semiconductor capacity constraint' must not falsely match 'AI Boom' via a substring inside 'constraint'", () => {
  const matches = getHistoricalMatches("Semiconductor capacity constraint");
  const aiBoomMatch = matches.find((m) => m.event === "AI Boom");
  assert.equal(aiBoomMatch, undefined, "'constraint' contains the letters 'ai' but is not the word 'ai' and must not match");
});

test("LIVE-DATA-FINAL-001 — genuinely Fed-policy headlines still, correctly, share the same real historical analog", () => {
  const a = getHistoricalMatches("Fed rate hike");
  const b = getHistoricalMatches("FOMC Rate Decision");
  assert.equal(a[0].event, "Rate Hikes");
  assert.equal(b[0].event, "Rate Hikes");
  assert.equal(a[0].similarity, b[0].similarity, "two genuinely Fed-rate-related headlines sharing one real analog is not a defect");
});
