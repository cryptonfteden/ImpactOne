require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");

test("GET /api/v2/system-health returns a real structured status for every critical module", async () => {
  const response = await request(app).get("/api/v2/system-health");
  assert.equal(response.status, 200);
  assert.ok(response.body.overall);
  assert.ok(response.body.modules.backend);
  assert.ok(response.body.modules.identity);
  assert.ok(response.body.modules.decisionCenter);
  assert.ok(response.body.modules.impactGraph);
});
