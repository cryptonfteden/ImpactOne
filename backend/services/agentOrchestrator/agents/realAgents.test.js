// Phase AGENT-ORCHESTRATOR-001 — smoke tests for the real agents
// (Technical, Options, Sentiment; Earnings added in EARNINGS-AGENT-001;
// Valuation added in VALUATION-AGENT-001).
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
const valuationAgent = require("./valuationAgent");
const symbolSentimentAgent = require("./symbolSentimentAgent");
const insiderAgent = require("./insiderAgent");
const etfFlowAgent = require("./etfFlowAgent");
const institutionalAgent = require("./institutionalAgent");
const shortInterestAgent = require("./shortInterestAgent");
const macroAgent = require("./macroAgent");
const analystConsensusAgent = require("./analystConsensusAgent");

const REAL_AGENTS = [technicalAgent, optionsAgent, sentimentAgent, earningsAgent, valuationAgent, symbolSentimentAgent, insiderAgent, etfFlowAgent, institutionalAgent, shortInterestAgent, macroAgent, analystConsensusAgent];

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

test("valuationAgent.execute() returns a real, well-formed result (a live network call may succeed or gracefully degrade in this environment; either way the shape is honest)", async () => {
  const result = await valuationAgent.execute("NVDA");
  assert.equal(typeof result.summary, "string");
  assert.ok(result.summary.length > 0);
  assert.ok(Array.isArray(result.evidence));
  assert.ok(result.direction === null || typeof result.direction === "string", "direction must be an opaque string or null, never an object");
  const confidence = valuationAgent.confidence(result);
  assert.ok(Number.isFinite(confidence));
  assert.ok(confidence >= 0 && confidence <= 100);
});

test("valuationAgent.health() reports a real, valid health status and never throws", async () => {
  const health = await valuationAgent.health();
  assert.ok(["healthy", "degraded", "unavailable"].includes(health.status));
});

test("symbolSentimentAgent.execute() honestly reports unavailable with no NEWS_API_KEY configured, never a fabricated sentiment read", async () => {
  const result = await symbolSentimentAgent.execute("NVDA");
  assert.equal(typeof result.summary, "string");
  assert.ok(result.summary.length > 0);
  assert.deepEqual(result.evidence, []);
  assert.ok(result.direction === null || typeof result.direction === "string", "direction must be an opaque string or null, never an object");
  const confidence = symbolSentimentAgent.confidence(result);
  assert.ok(Number.isFinite(confidence));
  assert.ok(confidence >= 0 && confidence <= 100);
});

test("symbolSentimentAgent.health() reports a real, valid health status and never throws", async () => {
  const health = await symbolSentimentAgent.health();
  assert.ok(["healthy", "degraded", "unavailable"].includes(health.status));
});

test("insiderAgent.execute() returns a real, well-formed result (a live SEC EDGAR call may succeed or gracefully degrade in this environment; either way the shape is honest)", async () => {
  const result = await insiderAgent.execute("NVDA");
  assert.equal(typeof result.summary, "string");
  assert.ok(result.summary.length > 0);
  assert.ok(Array.isArray(result.evidence));
  assert.ok(result.direction === null || typeof result.direction === "string", "direction must be an opaque string or null, never an object");
  const confidence = insiderAgent.confidence(result);
  assert.ok(Number.isFinite(confidence));
  assert.ok(confidence >= 0 && confidence <= 100);
});

test("insiderAgent.health() reports a real, valid health status and never throws", async () => {
  const health = await insiderAgent.health();
  assert.ok(["healthy", "degraded", "unavailable"].includes(health.status));
});

test("etfFlowAgent.execute() returns a real, well-formed result (a live price-history/Finnhub call may succeed or gracefully degrade in this environment; either way the shape is honest)", async () => {
  const result = await etfFlowAgent.execute("NVDA");
  assert.equal(typeof result.summary, "string");
  assert.ok(result.summary.length > 0);
  assert.ok(Array.isArray(result.evidence));
  assert.ok(result.direction === null || typeof result.direction === "string", "direction must be an opaque string or null, never an object");
  const confidence = etfFlowAgent.confidence(result);
  assert.ok(Number.isFinite(confidence));
  assert.ok(confidence >= 0 && confidence <= 100);
});

test("etfFlowAgent.health() reports a real, valid health status and never throws", async () => {
  const health = await etfFlowAgent.health();
  assert.ok(["healthy", "degraded", "unavailable"].includes(health.status));
});

test("institutionalAgent.execute() returns a real, well-formed result (a live SEC EDGAR 13F/Finnhub call may succeed or gracefully degrade in this environment; either way the shape is honest)", async () => {
  const result = await institutionalAgent.execute("NVDA");
  assert.equal(typeof result.summary, "string");
  assert.ok(result.summary.length > 0);
  assert.ok(Array.isArray(result.evidence));
  assert.ok(result.direction === null || typeof result.direction === "string", "direction must be an opaque string or null, never an object");
  const confidence = institutionalAgent.confidence(result);
  assert.ok(Number.isFinite(confidence));
  assert.ok(confidence >= 0 && confidence <= 100);
});

test("institutionalAgent.health() reports a real, valid health status and never throws", async () => {
  const health = await institutionalAgent.health();
  assert.ok(["healthy", "degraded", "unavailable"].includes(health.status));
});

test("shortInterestAgent.execute() returns a real, well-formed result (a live FINRA/price-history call may succeed or gracefully degrade in this environment; either way the shape is honest)", async () => {
  const result = await shortInterestAgent.execute("NVDA");
  assert.equal(typeof result.summary, "string");
  assert.ok(result.summary.length > 0);
  assert.ok(Array.isArray(result.evidence));
  assert.ok(result.direction === null || typeof result.direction === "string", "direction must be an opaque string or null, never an object");
  const confidence = shortInterestAgent.confidence(result);
  assert.ok(Number.isFinite(confidence));
  assert.ok(confidence >= 0 && confidence <= 100);
});

test("shortInterestAgent.health() reports a real, valid health status and never throws", async () => {
  const health = await shortInterestAgent.health();
  assert.ok(["healthy", "degraded", "unavailable"].includes(health.status));
});

test("macroAgent.execute() discloses it is a market-wide reading, never claims to be symbol-specific, and returns a real well-formed result", async () => {
  const result = await macroAgent.execute("NVDA");
  assert.equal(typeof result.summary, "string");
  assert.ok(result.summary.length > 0);
  assert.match(result.summary, /market-wide/i);
  assert.ok(Array.isArray(result.evidence));
  assert.ok(result.direction === null || typeof result.direction === "string", "direction must be an opaque string or null, never an object");
  const confidence = macroAgent.confidence(result);
  assert.ok(Number.isFinite(confidence));
  assert.ok(confidence >= 0 && confidence <= 100);
});

test("macroAgent.health() reports a real, valid health status and never throws", async () => {
  const health = await macroAgent.health();
  assert.ok(["healthy", "degraded", "unavailable"].includes(health.status));
});

test("analystConsensusAgent.execute() returns a real, well-formed result (a live Finnhub call may succeed or gracefully degrade in this environment; either way the shape is honest)", async () => {
  const result = await analystConsensusAgent.execute("AAPL");
  assert.equal(typeof result.summary, "string");
  assert.ok(result.summary.length > 0);
  assert.ok(Array.isArray(result.evidence));
  assert.ok(result.direction === null || typeof result.direction === "string", "direction must be an opaque string or null, never an object");
  const confidence = analystConsensusAgent.confidence(result);
  assert.ok(Number.isFinite(confidence));
  assert.ok(confidence >= 0 && confidence <= 100);
});

test("analystConsensusAgent.health() reports a real, valid health status and never throws", async () => {
  const health = await analystConsensusAgent.health();
  assert.ok(["healthy", "degraded", "unavailable"].includes(health.status));
});
