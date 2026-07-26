const test = require("node:test");
const assert = require("node:assert/strict");

const attentionEngine = require("./attentionEngine");

test("computeAttentionScore is deterministic — identical inputs always produce identical output", () => {
  const factors = { portfolioRelevance: 90, confidence: 70, urgency: 60, marketImpact: 50, freshness: 80 };
  const first = attentionEngine.computeAttentionScore(factors);
  const second = attentionEngine.computeAttentionScore(factors);
  assert.deepEqual(first, second);
});

test("computeAttentionScore never fabricates a missing factor as 0 — it renormalizes remaining weights instead", () => {
  const fewFactors = attentionEngine.computeAttentionScore({ confidence: 100 });
  // With only one real 100/100 input, renormalized weight is 100% of that
  // factor, so the score must be 100 — not diluted by phantom zeros for
  // every other factor.
  assert.equal(fewFactors.score, 100);
  assert.deepEqual(fewFactors.missingFactors.sort(), Object.keys(attentionEngine.FACTOR_WEIGHTS).filter((k) => k !== "confidence").sort());
});

test("computeAttentionScore with zero real inputs honestly returns 0 and says so, never a fabricated mid-range score", () => {
  const result = attentionEngine.computeAttentionScore({});
  assert.equal(result.score, 0);
  assert.equal(result.explanation, "No attention inputs available yet.");
});

test("computeAttentionScore produces a higher score for a strictly-better input set (monotonic ordering)", () => {
  const weak = attentionEngine.computeAttentionScore({ portfolioRelevance: 20, confidence: 30, urgency: 30, freshness: 20 });
  const strong = attentionEngine.computeAttentionScore({ portfolioRelevance: 90, confidence: 90, urgency: 90, freshness: 90 });
  assert.ok(strong.score > weak.score);
});

test("computeAttentionScore's explanation names the highest-weighted real contributing factors", () => {
  const result = attentionEngine.computeAttentionScore({ portfolioRelevance: 100, confidence: 10, freshness: 10 });
  assert.match(result.explanation, /portfolio relevance/);
});

test("computeFreshnessScore decays linearly to 0 over 7 days and is 100 for something updated right now", () => {
  const now = new Date("2026-07-27T00:00:00.000Z");
  assert.equal(attentionEngine.computeFreshnessScore(now, { now }), 100);
  const threeAndHalfDaysAgo = new Date("2026-07-23T12:00:00.000Z");
  assert.equal(attentionEngine.computeFreshnessScore(threeAndHalfDaysAgo, { now }), 50);
  const eightDaysAgo = new Date("2026-07-19T00:00:00.000Z");
  assert.equal(attentionEngine.computeFreshnessScore(eightDaysAgo, { now }), 0);
});

test("computeFreshnessScore honestly returns null (never a fabricated number) when no timestamp exists", () => {
  const now = new Date("2026-07-27T00:00:00.000Z");
  assert.equal(attentionEngine.computeFreshnessScore(null, { now }), null);
  assert.equal(attentionEngine.computeFreshnessScore(undefined, { now }), null);
});

test("scoreClaimAttention never fabricates portfolioRelevance for a market-wide claim with no symbols", () => {
  const now = new Date("2026-07-27T00:00:00.000Z");
  const marketWideClaim = { symbols: [], status: "ACTIVE", confidence: 70, probability: 60, lastUpdatedAt: now.toISOString() };
  const result = attentionEngine.scoreClaimAttention(marketWideClaim, { heldSymbols: new Set(["NVDA"]), now });
  assert.ok(result.missingFactors.includes("portfolioRelevance"));
  assert.equal(result.isHeld, false);
});

test("scoreClaimAttention ranks a held-symbol claim higher than an otherwise-identical unheld one", () => {
  const now = new Date("2026-07-27T00:00:00.000Z");
  const base = { status: "STRENGTHENING", confidence: 70, probability: 60, lastUpdatedAt: now.toISOString() };
  const held = attentionEngine.scoreClaimAttention({ ...base, symbols: ["NVDA"] }, { heldSymbols: new Set(["NVDA"]), now });
  const unheld = attentionEngine.scoreClaimAttention({ ...base, symbols: ["AMD"] }, { heldSymbols: new Set(["NVDA"]), now });
  assert.ok(held.score > unheld.score);
  assert.equal(held.isHeld, true);
  assert.equal(unheld.isHeld, false);
});

test("scoreClaimAttention gives a STRENGTHENING/WEAKENING claim higher urgency than a stable ACTIVE one", () => {
  const now = new Date("2026-07-27T00:00:00.000Z");
  const strengthening = attentionEngine.scoreClaimAttention({ symbols: ["NVDA"], status: "STRENGTHENING", confidence: 70, lastUpdatedAt: now.toISOString() }, { now });
  const active = attentionEngine.scoreClaimAttention({ symbols: ["NVDA"], status: "ACTIVE", confidence: 70, lastUpdatedAt: now.toISOString() }, { now });
  const strengtheningUrgency = strengthening.factors.find((f) => f.key === "urgency").value;
  const activeUrgency = active.factors.find((f) => f.key === "urgency").value;
  assert.ok(strengtheningUrgency > activeUrgency);
});

test("scoreClaimAttention counts distinct supporting engines from real evidence rows, never a fabricated count", () => {
  const now = new Date("2026-07-27T00:00:00.000Z");
  const claim = {
    symbols: ["NVDA"],
    status: "ACTIVE",
    confidence: 70,
    lastUpdatedAt: now.toISOString(),
    evidence: [{ sourceEngine: "options" }, { sourceEngine: "sentiment" }, { sourceEngine: "options" }],
  };
  const result = attentionEngine.scoreClaimAttention(claim, { now });
  const supportingEngines = result.factors.find((f) => f.key === "supportingEngines").value;
  assert.equal(supportingEngines, 50); // 2 distinct engines * 25
});

test("scoreFeedItemAttention reuses the item's own real importanceScore, never a second competing computation", () => {
  const now = new Date("2026-07-27T00:00:00.000Z");
  const item = { affectedAssets: ["NVDA"], importanceScore: 82, impactType: "opportunity", publishedAt: now.toISOString() };
  const result = attentionEngine.scoreFeedItemAttention(item, { heldSymbols: new Set(["NVDA"]), now });
  const marketImpact = result.factors.find((f) => f.key === "marketImpact").value;
  assert.equal(marketImpact, 82);
});

test("scoreFeedItemAttention never fabricates portfolioRelevance for an item with no affected assets", () => {
  const now = new Date("2026-07-27T00:00:00.000Z");
  const item = { affectedAssets: [], importanceScore: 50, publishedAt: now.toISOString() };
  const result = attentionEngine.scoreFeedItemAttention(item, { now });
  assert.ok(result.missingFactors.includes("portfolioRelevance"));
});
