const test = require("node:test");
const assert = require("node:assert/strict");
const { AGENT_WEIGHTS, DECISION_GATES, applyStrategyPriority, weightedVotes } = require("./strategyPolicy");

test("strategy weights match the approved ImpactOne hierarchy", () => {
  assert.equal(AGENT_WEIGHTS.fibonacci, 10);
  assert.equal(AGENT_WEIGHTS.insider, 10);
  assert.equal(AGENT_WEIGHTS.valuation, 9);
  assert.equal(AGENT_WEIGHTS.technical, 3);
  assert.equal(DECISION_GATES.fibonacciDistancePct, 5);
});

test("weightedVotes ignores a fulfilled agent whose provider evidence failed its quality gate", () => {
  const votes = weightedVotes([
    { agentId: "fibonacci", status: "fulfilled", normalizedDirection: "BULLISH", result: { raw: { signalEligible: true } } },
    { agentId: "insider", status: "fulfilled", normalizedDirection: "BEARISH", result: { raw: { signalEligible: false } } },
  ]);
  assert.equal(votes.bullish, 10);
  assert.equal(votes.bearish, 0);
  assert.equal(votes.availableWeight, 10);
});

test("known agents are overridden while extension agents keep their priority", () => {
  const fib = applyStrategyPriority({ metadata: { id: "fibonacci", priority: 1 }, run() {} });
  const custom = { metadata: { id: "custom", priority: 8 }, run() {} };
  assert.equal(fib.metadata.priority, 10);
  assert.equal(applyStrategyPriority(custom), custom);
});
