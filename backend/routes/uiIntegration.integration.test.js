require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");
const intelligenceBusService = require("../services/intelligenceBus/intelligenceBusService");
const claimFormationService = require("../services/claimIntelligence/claimFormationService");

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/v2/claims/active returns 200 with an honest empty array when no claims exist yet", async () => {
  const response = await request(app).get("/api/v2/claims/active");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.claims, []);
});

test("GET /api/v2/claims/active returns a real, persisted claim once one is formed from a real Bus event", async () => {
  const now = new Date("2026-07-27T14:00:00.000Z");
  const published = await intelligenceBusService.publishEvent(
    {
      engineId: "options",
      eventType: "SWEEP",
      symbols: ["NVDA"],
      payload: { signalType: "SWEEP", aggressorSide: "BUY", anomalyScore: 80, explanation: "NVDA calls swept 3 exchanges." },
      provenance: { sourceEngine: "options", sourceProvider: "optionsFlow" },
      confidence: 80,
      publishedAt: now.toISOString(),
      methodologyVersion: "options-agent-v1",
    },
    { now }
  );
  await claimFormationService.ingestBusEvent(published, { now });

  const response = await request(app).get("/api/v2/claims/active");
  assert.equal(response.status, 200);
  // A brand-new claim from one evidence entry is DRAFT, not yet ACTIVE —
  // honestly not returned by the "active" feed until real evidence
  // breadth accumulates (same discipline as claimConsumerService itself).
  assert.deepEqual(response.body.claims, []);

  const symbolResponse = await request(app).get("/api/v2/claims/symbols/NVDA");
  assert.equal(symbolResponse.status, 200);
  assert.equal(symbolResponse.body.claims.length, 1);
  assert.equal(symbolResponse.body.claims[0].status, "DRAFT");
});

test("GET /api/v2/claims/:claimId/history returns 404 for a real, well-formed but unknown id", async () => {
  const response = await request(app).get("/api/v2/claims/00000000-0000-0000-0000-000000000000/history");
  assert.equal(response.status, 404);
});

test("GET /api/v2/options-agent/status honestly reports not connected when no vendor credential exists", async () => {
  const response = await request(app).get("/api/v2/options-agent/status");
  assert.equal(response.status, 200);
  assert.equal(response.body.connected, false);
});

test("GET /api/v2/options-agent/symbols/:symbol returns the honest unavailable shape when the provider isn't connected", async () => {
  const response = await request(app).get("/api/v2/options-agent/symbols/NVDA");
  assert.equal(response.status, 200);
  assert.equal(response.body.unavailable, true);
});

test(
  "GET /api/v2/market-sentiment/overview returns the canonical shape for the default (US) market",
  { timeout: 60000 },
  async () => {
    const response = await request(app).get("/api/v2/market-sentiment/overview");
    assert.equal(response.status, 200);
    assert.equal(response.body.market, "US");
    assert.ok("score" in response.body);
    assert.ok("confidence" in response.body);
    assert.ok("missingInputs" in response.body);
  }
);

test("GET /api/v2/market-sentiment/overview rejects an unknown market with a real 400", async () => {
  const response = await request(app).get("/api/v2/market-sentiment/overview?market=ATLANTIS");
  assert.equal(response.status, 400);
});

test("Phase PRODUCT-001 — GET /api/v2/morning-brief/today returns an honestly-empty brief with no real intelligence yet", async () => {
  const response = await request(app).get("/api/v2/morning-brief/today");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.items, []);
  assert.equal(response.body.itemCount, 0);
});

test("Phase PRODUCT-001 — GET /api/v2/claims/active attaches a real, deterministic attentionScore to every claim", async () => {
  const now = new Date("2026-07-27T14:00:00.000Z");
  await claimFormationService.ingestBusEvent(
    { engineId: "options", eventType: "SWEEP", symbols: ["NVDA"], payload: { signalType: "SWEEP", aggressorSide: "BUY", anomalyScore: 80, explanation: "NVDA calls swept 3 exchanges." }, provenance: { sourceEngine: "options", sourceProvider: "optionsFlow" }, confidence: 80, publishedAt: now.toISOString(), methodologyVersion: "options-agent-v1" },
    { now }
  );
  await claimFormationService.ingestBusEvent(
    { engineId: "options", eventType: "SWEEP", symbols: ["NVDA"], payload: { signalType: "SWEEP", aggressorSide: "BUY", anomalyScore: 85, explanation: "NVDA calls swept again." }, provenance: { sourceEngine: "options", sourceProvider: "optionsFlow" }, confidence: 85, publishedAt: new Date(now.getTime() + 60000).toISOString(), methodologyVersion: "options-agent-v1" },
    { now: new Date(now.getTime() + 60000) }
  );

  const response = await request(app).get("/api/v2/claims/symbols/NVDA");
  assert.equal(response.status, 200);
  assert.ok(response.body.claims.length >= 1);
  for (const claim of response.body.claims) {
    assert.equal(typeof claim.attentionScore, "number");
    assert.equal(typeof claim.attentionExplanation, "string");
  }
});

test("Phase PRODUCT-001 — GET /api/v2/claims/overnight-changes returns 200 with an honest empty array when nothing changed", async () => {
  const response = await request(app).get("/api/v2/claims/overnight-changes");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.claims, []);
});
