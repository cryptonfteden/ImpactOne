const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRawEventFromAgentResult, publishAgentClaim, METHODOLOGY_VERSION, EVENT_TYPE } = require("./agentClaimPublisher");

function fulfilledResult(overrides = {}) {
  return {
    agentId: "macro",
    agentName: "Macro Intelligence Agent",
    status: "fulfilled",
    confidence: 80,
    direction: "BULLISH",
    result: { summary: "Macro Bias is BULLISH.", evidence: [{ observedFact: "Yield curve is normal." }], raw: {} },
    ...overrides,
  };
}

test("buildRawEventFromAgentResult: maps a real fulfilled agent result onto a valid raw Bus event", () => {
  const now = new Date("2026-07-30T00:00:00Z");
  const { event, skipped, reason } = buildRawEventFromAgentResult("AAPL", fulfilledResult(), now);
  assert.equal(skipped, false);
  assert.equal(reason, null);
  assert.equal(event.engineId, "macro");
  assert.equal(event.eventType, EVENT_TYPE);
  assert.deepEqual(event.symbols, ["AAPL"]);
  assert.equal(event.payload.direction, "BULLISH");
  assert.equal(event.payload.summary, "Macro Bias is BULLISH.");
  assert.equal(event.confidence, 80);
  assert.deepEqual(event.evidenceRefs, ["Yield curve is normal."]);
  assert.equal(event.provenance.sourceEngine, "macro");
  assert.equal(event.methodologyVersion, METHODOLOGY_VERSION);
  assert.equal(event.publishedAt, now);
});

test("buildRawEventFromAgentResult: uppercases the symbol", () => {
  const { event } = buildRawEventFromAgentResult("aapl", fulfilledResult(), new Date());
  assert.deepEqual(event.symbols, ["AAPL"]);
});

test("buildRawEventFromAgentResult: reuses the agent's own already-computed confidence, never recomputing it", () => {
  const { event } = buildRawEventFromAgentResult("AAPL", fulfilledResult({ confidence: 37 }), new Date());
  assert.equal(event.confidence, 37);
});

test("buildRawEventFromAgentResult: a null direction (NEUTRAL agent read) is honestly normalized to the string 'NEUTRAL', never fabricated", () => {
  const { event } = buildRawEventFromAgentResult("AAPL", fulfilledResult({ direction: null }), new Date());
  assert.equal(event.payload.direction, "NEUTRAL");
});

test("buildRawEventFromAgentResult: honestly skips a non-fulfilled agent result, never publishing a fabricated event", () => {
  const { event, skipped, reason } = buildRawEventFromAgentResult("AAPL", fulfilledResult({ status: "error", result: null }), new Date());
  assert.equal(event, null);
  assert.equal(skipped, true);
  assert.match(reason, /did not complete successfully/);
});

test("buildRawEventFromAgentResult: honestly skips with no symbol", () => {
  const { skipped, reason } = buildRawEventFromAgentResult("", fulfilledResult(), new Date());
  assert.equal(skipped, true);
  assert.match(reason, /No symbol provided/);
});

test("buildRawEventFromAgentResult: honestly skips an agent id that is not a registered Bus engine", () => {
  const { skipped, reason } = buildRawEventFromAgentResult("AAPL", fulfilledResult({ agentId: "not-a-real-engine" }), new Date());
  assert.equal(skipped, true);
  assert.match(reason, /not a registered Intelligence Bus engine/);
});

test("buildRawEventFromAgentResult: every one of the 14 real agent ids is a known, registered Bus engine", () => {
  const AGENT_IDS = [
    "technical", "options", "sentiment", "symbol-sentiment", "news", "short-interest",
    "earnings", "valuation", "fibonacci", "insider", "etf-flow", "institutional",
    "macro", "analyst-consensus",
  ];
  for (const agentId of AGENT_IDS) {
    const { skipped, reason } = buildRawEventFromAgentResult("AAPL", fulfilledResult({ agentId }), new Date());
    assert.equal(skipped, false, `agent "${agentId}" should be publishable: ${reason}`);
  }
});

test("publishAgentClaim: calls the real publish then the real ingest function in sequence, passing the built event through", async () => {
  const publishedCalls = [];
  const ingestedCalls = [];
  const fakePublishEventFn = async (event) => {
    publishedCalls.push(event);
    return { ...event, id: "fake-event-id" };
  };
  const fakeIngestBusEventFn = async (publishedEvent) => {
    ingestedCalls.push(publishedEvent);
    return { claim: { id: "fake-claim-id" }, action: "created" };
  };

  const outcome = await publishAgentClaim("AAPL", fulfilledResult(), { publishEventFn: fakePublishEventFn, ingestBusEventFn: fakeIngestBusEventFn });

  assert.equal(outcome.skipped, false);
  assert.equal(publishedCalls.length, 1);
  assert.equal(ingestedCalls.length, 1);
  assert.equal(ingestedCalls[0].id, "fake-event-id");
  assert.equal(outcome.publishedEvent.id, "fake-event-id");
  assert.equal(outcome.claimResult.claim.id, "fake-claim-id");
});

test("publishAgentClaim: honestly reports skipped for a non-fulfilled agent result, never calling publish/ingest", async () => {
  let called = false;
  const fakePublishEventFn = async () => { called = true; };
  const outcome = await publishAgentClaim("AAPL", fulfilledResult({ status: "timeout", result: null }), { publishEventFn: fakePublishEventFn });
  assert.equal(outcome.skipped, true);
  assert.equal(called, false);
});

test("publishAgentClaim: never throws — a real publish/ingest failure is reported as an honest skip, not an unhandled rejection", async () => {
  const fakePublishEventFn = async () => { throw new Error("simulated DB failure"); };
  const outcome = await publishAgentClaim("AAPL", fulfilledResult(), { publishEventFn: fakePublishEventFn });
  assert.equal(outcome.skipped, true);
  assert.match(outcome.reason, /simulated DB failure/);
});
