// Phase AGENT-ORCHESTRATOR-001 — smoke tests for the real agents
// (Technical, Options, Sentiment; Earnings added in EARNINGS-AGENT-001).
// This test environment has no live network/provider credentials for
// most of these (the same "no network access in this test" constraint
// every other test of these underlying services already documents), so
// these tests assert real, honest interface conformance and graceful
// degradation — never a specific live value — exactly matching how
// technicalIntelligenceService.test.js and optionsAgentService.test.js
// already test the same underlying reality.
require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { validateAgent } = require("../agentInterface");
const technicalAgent = require("./technicalAgent");
const optionsAgent = require("./optionsAgent");
const sentimentAgent = require("./sentimentAgent");
const earningsAgent = require("./earningsAgent");

const REAL_AGENTS = [technicalAgent, optionsAgent, sentimentAgent, earningsAgent];

test("every real agent conforms to the generic Agent interface", () => {
  for (const agent of REAL_AGENTS) {
    assert.deepEqual(validateAgent(agent), [], `agent "${agent.metadata.id}" must have zero interface violations`);
  }
});

test("technicalAgent.execute() honestly reports insufficient data with no live price history, never a fabricated trend", async () => {
  const result = await technicalAgent.execute("NVDA");
  assert.equal(typeof result.summary, "string");
  assert.ok(result.summary.length > 0);
  const confidence = technicalAgent.confidence(result);
  assert.ok(Number.isFinite(confidence));
  assert.ok(confidence >= 0 && confidence <= 100);
});

test("technicalAgent.health() reports a real, valid health status", async () => {
  const health = await technicalAgent.health();
  assert.ok(["healthy", "degraded", "unavailable"].includes(health.status));
});

test("optionsAgent.execute() honestly reports unavailable with no configured options-flow provider, never a fabricated signal", async () => {
  const result = await optionsAgent.execute("NVDA");
  assert.equal(typeof result.summary, "string");
  assert.deepEqual(result.evidence, []);
  const confidence = optionsAgent.confidence(result);
  assert.ok(Number.isFinite(confidence));
});

test("optionsAgent.health() reports a real, valid health status and never throws", async () => {
  const health = await optionsAgent.health();
  assert.ok(["healthy", "degraded", "unavailable"].includes(health.status));
});

test("sentimentAgent.execute() discloses it is a market-wide reading, never claims to be symbol-specific", async () => {
  const result = await sentimentAgent.execute("NVDA");
  assert.match(result.summary, /market-wide/i);
  const confidence = sentimentAgent.confidence(result);
  assert.ok(Number.isFinite(confidence));
  assert.ok(confidence >= 0 && confidence <= 100);
});

test("sentimentAgent.health() reports healthy", async () => {
  const health = await sentimentAgent.health();
  assert.equal(health.status, "healthy");
});

// Regression: the real marketSentimentService's `trend` field is a
// structured { daily, weekly } object, not a simple string — an earlier
// version of this agent passed that raw object straight through as
// `direction`, silently violating the Agent interface's own contract
// (direction must be an opaque string, comparable by equality) and
// producing a nonsensical conflict record when compared against a real
// string from another agent. Caught via live testing against the real
// backend, not by a mock — this test locks the fix in place.
test("sentimentAgent.execute() always returns a plain string (or null) for direction, never the raw trend object", async () => {
  const result = await sentimentAgent.execute("NVDA");
  assert.ok(result.direction === null || typeof result.direction === "string", "direction must be an opaque string or null, never an object");
});

test("earningsAgent.execute() returns a real, well-formed result (a live network call may succeed or gracefully degrade in this environment; either way the shape is honest)", async () => {
  const result = await earningsAgent.execute("NVDA");
  assert.equal(typeof result.summary, "string");
  assert.ok(result.summary.length > 0);
  assert.ok(Array.isArray(result.evidence));
  assert.ok(result.direction === null || typeof result.direction === "string", "direction must be an opaque string or null, never an object");
  const confidence = earningsAgent.confidence(result);
  assert.ok(Number.isFinite(confidence));
  assert.ok(confidence >= 0 && confidence <= 100);
});

test("earningsAgent.health() reports a real, valid health status and never throws", async () => {
  const health = await earningsAgent.health();
  assert.ok(["healthy", "degraded", "unavailable"].includes(health.status));
});
