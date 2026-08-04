require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/v2/themes lists exactly the 7 required themes", async () => {
  const response = await request(app).get("/api/v2/themes");
  assert.equal(response.status, 200);
  assert.equal(response.body.themes.length, 7);
  const keys = response.body.themes.map((theme) => theme.themeKey);
  ["ai", "quantum", "defense", "energy", "space", "cybersecurity", "healthcare"].forEach((key) => {
    assert.ok(keys.includes(key), `missing theme ${key}`);
  });
});

test("GET /api/v2/themes/:themeKey returns full theme intelligence", async () => {
  const response = await request(app).get("/api/v2/themes/ai");
  assert.equal(response.status, 200);
  assert.equal(response.body.themeKey, "ai");
  assert.ok(response.body.maturity);
  assert.ok(response.body.thesis);
  assert.ok(Array.isArray(response.body.companies));
  assert.ok(Array.isArray(response.body.etfs));
  assert.ok(Array.isArray(response.body.confidenceTrend));
});

test("GET /api/v2/themes/:themeKey 404s for an unknown theme", async () => {
  const response = await request(app).get("/api/v2/themes/not-a-real-theme");
  assert.equal(response.status, 404);
});
