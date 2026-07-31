require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../app");

test("GET /health still returns the original, unconditional 200 (backward compatible)", async () => {
  const response = await request(app).get("/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("GET /health/live returns a real 200 with no dependency checks", async () => {
  const response = await request(app).get("/health/live");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(typeof response.body.uptimeSeconds, "number");
});

test("GET /health/ready reports a real, passing database check against the live test database", async () => {
  const response = await request(app).get("/health/ready");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ready");
  assert.equal(response.body.checks.database, true);
});
