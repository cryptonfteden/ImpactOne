require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const impactIntelligenceService = require("./impactIntelligenceService");

test("Sprint 26 — explainability.why is genuinely derived per event, not identical boilerplate", async () => {
  const oil = await impactIntelligenceService.analyzeIntelligence({ event: "Oil price spike", symbol: "XOM" });
  const fed = await impactIntelligenceService.analyzeIntelligence({ event: "Fed rate hike surprise", symbol: "JPM" });

  assert.notEqual(oil.explainability.why, fed.explainability.why, "two different events must not produce the identical why sentence");
  assert.doesNotMatch(oil.explainability.why, /affects cross-asset pricing through macro regime, positioning, and liquidity channels\.$/, "must not fall back to the old boilerplate template");
  assert.match(oil.explainability.why, /Oil price spike/, "why must reference the actual event");
});

test("Sprint 26 — affected sectors/stocks are differentiated across event categories beyond the original 4", async () => {
  const ai = await impactIntelligenceService.analyzeIntelligence({ event: "AI model compute breakthrough", symbol: "NVDA" });
  const cyber = await impactIntelligenceService.analyzeIntelligence({ event: "Major cyber security breach disclosed", symbol: "CRWD" });
  const healthcare = await impactIntelligenceService.analyzeIntelligence({ event: "New drug healthcare approval", symbol: "LLY" });

  assert.notDeepEqual(ai.affected.sectors, cyber.affected.sectors, "AI and cybersecurity events must not share the same generic sector list");
  assert.notDeepEqual(cyber.affected.sectors, healthcare.affected.sectors);
  assert.deepEqual(ai.affected.sectors, ["AI Infrastructure", "Semiconductors", "Cloud"]);
  assert.deepEqual(cyber.affected.sectors, ["Cybersecurity", "Enterprise Software"]);
});

test("explainability.why cites this event's own affected sectors, not a generic placeholder", async () => {
  const result = await impactIntelligenceService.analyzeIntelligence({ event: "Oil supply disruption", symbol: "XOM" });
  assert.match(result.explainability.why, /Energy|Airlines|Shipping|Consumer/, "oil events should reference oil-differentiated sectors in the why text");
});

test("AI-TRUST-001 — two genuinely unrelated events with no historical/theme keyword match no longer produce a fabricated shared 'Covid'/'Macro shock' explanation", async () => {
  const aapl = await impactIntelligenceService.analyzeIntelligence({ event: "AAPL earnings", symbol: "AAPL" });
  const concentration = await impactIntelligenceService.analyzeIntelligence({ event: "Earnings calendar concentration", symbol: "AAPL" });

  assert.doesNotMatch(aapl.explainability.why, /most comparable to "Covid"/, "must never fabricate a Covid comparison when no real keyword match exists");
  assert.doesNotMatch(concentration.explainability.why, /most comparable to "Covid"/, "must never fabricate a Covid comparison when no real keyword match exists");
  assert.doesNotMatch(aapl.explainability.why, /propagating from Macro shock/, "must never fabricate a generic Macro shock propagation chain");
  assert.doesNotMatch(concentration.explainability.why, /propagating from Macro shock/, "must never fabricate a generic Macro shock propagation chain");
  assert.notEqual(aapl.explainability.why, concentration.explainability.why, "two different event names must still produce two different sentences");
  assert.deepEqual(aapl.historicalSimilarity, [], "no genuine historical analog should be fabricated for this event");
});

test("AI-TRUST-001 — a genuine keyword match (Fed rate policy) still produces a real, sourced historical comparison", async () => {
  const result = await impactIntelligenceService.analyzeIntelligence({ event: "Fed rate hike", symbol: "JPM" });
  assert.match(result.explainability.why, /most comparable to "Rate Hikes"/, "a genuine Fed/rate keyword match should still cite its real historical analog");
  assert.ok(result.historicalSimilarity[0].similarity > 0);
});

// Phase RC1-BLOCKERS-001 — the founder-week live review (FOUNDER_WEEK_REVIEW.md)
// found "AAPL earnings" and "Earnings calendar concentration" — genuinely
// different events that both match the "earnings" category — produced a
// byte-identical "Affected holdings" list (both fell through to the same
// EVENT_TYPE_ASSETS.earnings template). Fixed by leading the list with any
// ticker the headline literally names (a real, per-event fact), so a
// company-specific headline is genuinely distinguishable from a market-wide
// one, without inventing anything not actually in the text.
test("RC1-BLOCKERS-001 — a headline naming a specific company leads affected.stocks with that real ticker, unlike a same-category headline naming none", async () => {
  const aapl = await impactIntelligenceService.analyzeIntelligence({ event: "AAPL earnings", symbol: "AAPL" });
  const concentration = await impactIntelligenceService.analyzeIntelligence({ event: "Earnings calendar concentration", symbol: "AAPL" });

  assert.notDeepEqual(aapl.affected.stocks, concentration.affected.stocks, "a headline naming AAPL must not share the identical affected-stocks list with one naming no company");
  assert.equal(aapl.affected.stocks[0], "AAPL", "the literally-named ticker should lead the list");
});

test("RC1-BLOCKERS-001 — two genuinely identical event strings still produce identical output (no artificial variation)", async () => {
  const first = await impactIntelligenceService.analyzeImpact({ event: "NVDA AI demand acceleration", symbol: "NVDA" });
  const second = await impactIntelligenceService.analyzeImpact({ event: "NVDA AI demand acceleration", symbol: "NVDA" });

  assert.deepEqual(first.affected, second.affected, "the exact same headline must deterministically produce the exact same affected-assets output");
});

test("RC1-BLOCKERS-001 — classifyForAssets/adjustAffected use real word-boundary matching, not a substring false positive", async () => {
  // "said" contains "ai" as a substring; this headline names no AI-related
  // company or concept and must not be classified into the "ai" category.
  const result = await impactIntelligenceService.analyzeIntelligence({ event: "Fed chair said rates may hold steady", symbol: "JPM" });
  assert.deepEqual(result.affected.sectors, ["Financials", "Rate-Sensitive Growth", "Bonds"], "must classify as centralBanks (real 'rate'/'fed' match), not fall through to an 'ai' false positive from 'said'");
});
