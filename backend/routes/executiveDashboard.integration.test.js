require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/v2/executive-dashboard returns exactly the six real, curated lists", async () => {
  const response = await request(app).get("/api/v2/executive-dashboard");
  assert.equal(response.status, 200);
  assert.ok("highestConvictionOpportunities" in response.body);
  assert.ok("highestMarketRisks" in response.body);
  assert.ok("largestPortfolioImpacts" in response.body);
  assert.ok("majorMarketEvents" in response.body);
  assert.ok("largestPositioningChanges" in response.body);
  assert.ok("highestAiConfidence" in response.body);
});
