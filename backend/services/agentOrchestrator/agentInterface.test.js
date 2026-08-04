const test = require("node:test");
const assert = require("node:assert/strict");

const { validateAgent, assertValidAgent, isValidHealthResult } = require("./agentInterface");

function validAgent(overrides = {}) {
  return {
    metadata: { id: "test-agent", name: "Test Agent", category: "TEST", priority: 5 },
    async execute() {
      return { summary: "ok", direction: null, evidence: [] };
    },
    confidence() {
      return 50;
    },
    async health() {
      return { status: "healthy", reason: null };
    },
    ...overrides,
  };
}

test("validateAgent accepts a fully-conformant agent with no errors", () => {
  assert.deepEqual(validateAgent(validAgent()), []);
});

test("validateAgent rejects a non-object", () => {
  assert.deepEqual(validateAgent(null), ["agent must be an object"]);
  assert.deepEqual(validateAgent(undefined), ["agent must be an object"]);
  assert.deepEqual(validateAgent("agent"), ["agent must be an object"]);
});

test("validateAgent requires metadata.id, metadata.name, and a positive finite metadata.priority", () => {
  assert.ok(validateAgent(validAgent({ metadata: { name: "x", priority: 1 } })).includes("agent.metadata.id must be a non-empty string"));
  assert.ok(validateAgent(validAgent({ metadata: { id: "x", priority: 1 } })).includes("agent.metadata.name must be a non-empty string"));
  assert.ok(validateAgent(validAgent({ metadata: { id: "x", name: "x", priority: 0 } })).includes("agent.metadata.priority must be a positive finite number"));
  assert.ok(validateAgent(validAgent({ metadata: { id: "x", name: "x", priority: -5 } })).includes("agent.metadata.priority must be a positive finite number"));
  assert.ok(validateAgent(validAgent({ metadata: { id: "x", name: "x", priority: Infinity } })).includes("agent.metadata.priority must be a positive finite number"));
});

test("validateAgent requires execute, confidence, and health to be functions", () => {
  assert.ok(validateAgent(validAgent({ execute: "not a function" })).includes("agent.execute must be a function"));
  assert.ok(validateAgent(validAgent({ confidence: null })).includes("agent.confidence must be a function"));
  assert.ok(validateAgent(validAgent({ health: 42 })).includes("agent.health must be a function"));
});

test("assertValidAgent throws a descriptive error naming the agent id for an invalid agent, and is silent for a valid one", () => {
  assert.doesNotThrow(() => assertValidAgent(validAgent()));
  assert.throws(() => assertValidAgent(validAgent({ execute: null })), /Invalid agent "test-agent"/);
  assert.throws(() => assertValidAgent({}), /Invalid agent "unknown"/);
});

test("isValidHealthResult only accepts the three real statuses", () => {
  assert.equal(isValidHealthResult({ status: "healthy" }), true);
  assert.equal(isValidHealthResult({ status: "degraded" }), true);
  assert.equal(isValidHealthResult({ status: "unavailable" }), true);
  assert.equal(isValidHealthResult({ status: "ok" }), false);
  assert.equal(isValidHealthResult(null), false);
  assert.equal(isValidHealthResult("healthy"), false);
});
