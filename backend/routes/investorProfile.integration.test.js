require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/v2/investor-profile returns 404 before any profile is created", async () => {
  const response = await request(app).get("/api/v2/investor-profile");
  assert.equal(response.status, 404);
});

test("POST /api/v2/investor-profile requires age", async () => {
  const response = await request(app).post("/api/v2/investor-profile").send({ country: "US" });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /age is required/);
});

test("POST then GET /api/v2/investor-profile round-trips", async () => {
  const createResponse = await request(app).post("/api/v2/investor-profile").send({
    age: 17,
    country: "IL",
    experienceLevel: "BEGINNER",
    monthlyInvestmentAmount: 500,
    investmentGoal: "WEALTH",
    riskTolerance: "MEDIUM",
    investmentHorizon: "LONG_TERM",
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.age, 17);

  const getResponse = await request(app).get("/api/v2/investor-profile");
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.investmentGoal, "WEALTH");
});

test("PATCH /api/v2/investor-profile updates an existing profile", async () => {
  await request(app).post("/api/v2/investor-profile").send({ age: 30, riskTolerance: "LOW" });

  const patchResponse = await request(app).patch("/api/v2/investor-profile").send({ riskTolerance: "HIGH" });
  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.body.riskTolerance, "HIGH");
  assert.equal(patchResponse.body.age, 30);
});

test("PATCH /api/v2/investor-profile 404s when no profile exists yet", async () => {
  const response = await request(app).patch("/api/v2/investor-profile").send({ age: 40 });
  assert.equal(response.status, 404);
});

test("GET /api/v2/investor-profile/investment-profile 404s before a profile exists", async () => {
  const response = await request(app).get("/api/v2/investor-profile/investment-profile");
  assert.equal(response.status, 404);
});

test("GET /api/v2/investor-profile/investment-profile returns a deterministic, illustration-labeled profile", async () => {
  await request(app).post("/api/v2/investor-profile").send({
    age: 25,
    riskTolerance: "HIGH",
    investmentHorizon: "LONG_TERM",
    experienceLevel: "BEGINNER",
    investmentGoal: "WEALTH",
  });

  const response = await request(app).get("/api/v2/investor-profile/investment-profile");
  assert.equal(response.status, 200);
  assert.ok(response.body.suggestedAllocation);
  assert.equal(
    response.body.suggestedAllocation.stocks + response.body.suggestedAllocation.bonds + response.body.suggestedAllocation.cash,
    100
  );
  assert.match(response.body.assumptionsDisclosure, /illustrations/i);
});
