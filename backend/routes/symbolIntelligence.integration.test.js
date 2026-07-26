require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/v2/symbol-intelligence/:symbol returns one composed object from real underlying services", async () => {
  const response = await request(app).get("/api/v2/symbol-intelligence/ZZZZ");
  assert.equal(response.status, 200);
  assert.equal(response.body.symbol, "ZZZZ");
  assert.ok("impactGraph" in response.body);
  assert.ok("marketPositioning" in response.body);
  assert.ok("opportunityScore" in response.body);
  assert.ok("aiSummary" in response.body);
  assert.ok("alerts" in response.body);
});
