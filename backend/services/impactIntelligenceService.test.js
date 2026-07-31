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
