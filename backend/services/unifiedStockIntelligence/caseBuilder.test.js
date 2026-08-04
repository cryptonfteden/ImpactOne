const test = require("node:test");
const assert = require("node:assert/strict");
const { buildBullCase, buildBearCase, buildRisks, buildOpportunities } = require("./caseBuilder");

function agent(overrides = {}) {
  return {
    agentId: "options",
    agentName: "Options Flow Agent",
    available: true,
    direction: "NEUTRAL",
    confidence: 50,
    summary: "a real summary",
    risks: [],
    opportunities: [],
    unavailableReason: null,
    ...overrides,
  };
}

test("buildBullCase includes only real BULLISH, available agents, attributed to their source", () => {
  const result = buildBullCase([agent({ direction: "BULLISH" }), agent({ agentId: "earnings", direction: "BEARISH" }), agent({ agentId: "valuation", direction: "NEUTRAL" })]);
  assert.equal(result.length, 1);
  assert.equal(result[0].agentId, "options");
  assert.equal(result[0].statement, "a real summary");
});

test("buildBearCase includes only real BEARISH, available agents", () => {
  const result = buildBearCase([agent({ direction: "BULLISH" }), agent({ agentId: "earnings", direction: "BEARISH" })]);
  assert.equal(result.length, 1);
  assert.equal(result[0].agentId, "earnings");
});

test("an unavailable agent is never included in the Bull or Bear case, even with a stale direction value", () => {
  const bull = buildBullCase([agent({ direction: "BULLISH", available: false })]);
  assert.deepEqual(bull, []);
});

test("buildRisks aggregates every agent's own real risks, each attributed", () => {
  const result = buildRisks([agent({ risks: ["risk A"] }), agent({ agentId: "earnings", risks: ["risk B", "risk C"] })]);
  assert.equal(result.length, 3);
  assert.ok(result.some((r) => r.agentId === "options" && r.statement === "risk A"));
  assert.ok(result.some((r) => r.agentId === "earnings" && r.statement === "risk C"));
});

test("buildRisks surfaces an unavailable agent's own reason as a real risk entry", () => {
  const result = buildRisks([agent({ available: false, unavailableReason: "no API key configured" })]);
  assert.equal(result.length, 1);
  assert.match(result[0].statement, /no API key configured/);
});

test("buildOpportunities aggregates every agent's own real opportunities, each attributed", () => {
  const result = buildOpportunities([agent({ opportunities: ["opp A"] }), agent({ agentId: "valuation", opportunities: [] })]);
  assert.equal(result.length, 1);
  assert.equal(result[0].agentId, "options");
});

test("empty input produces empty, honest lists — never fabricated entries", () => {
  assert.deepEqual(buildBullCase([]), []);
  assert.deepEqual(buildBearCase([]), []);
  assert.deepEqual(buildRisks([]), []);
  assert.deepEqual(buildOpportunities([]), []);
});
