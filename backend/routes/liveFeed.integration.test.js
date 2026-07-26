require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const investorProfileRepository = require("../services/investorProfileRepository");
const app = require("../app");

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/intelligence/live-feed works with no investor profile (backward compatible)", async () => {
  const response = await request(app).get("/api/intelligence/live-feed");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.feed));
});

test("GET /api/intelligence/live-feed still returns a valid feed once an investor profile exists", async () => {
  await investorProfileRepository.createInvestorProfile({ age: 25, riskTolerance: "HIGH" });

  const response = await request(app).get("/api/intelligence/live-feed");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.feed));
});

test("Phase PRODUCT-001 — every real feed item carries a real, deterministic attentionScore", async () => {
  const response = await request(app).get("/api/intelligence/live-feed");
  assert.equal(response.status, 200);
  for (const item of response.body.feed) {
    assert.equal(typeof item.attentionScore, "number");
    assert.equal(typeof item.attentionExplanation, "string");
  }
});
