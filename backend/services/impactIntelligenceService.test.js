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

test("explainability.why cites this event's own affected sectors, not a generic placeholder", async () => {
  const result = await impactIntelligenceService.analyzeIntelligence({ event: "Oil supply disruption", symbol: "XOM" });
  assert.match(result.explainability.why, /Energy|Airlines|Shipping|Consumer/, "oil events should reference oil-differentiated sectors in the why text");
});
