require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const investorProfileService = require("./investorProfileService");

test.beforeEach(async () => {
  await truncateAll();
});

test("createInvestorProfile rejects a missing age", async () => {
  await assert.rejects(() => investorProfileService.createInvestorProfile({}), /age is required/);
});

test("createInvestorProfile rejects an out-of-range age", async () => {
  await assert.rejects(() => investorProfileService.createInvestorProfile({ age: 200 }), /age is required/);
});

test("createInvestorProfile accepts a minor's age (advisory-only, no execution — no adult-only gate)", async () => {
  const created = await investorProfileService.createInvestorProfile({ age: 17 });
  assert.equal(created.age, 17);
});

test("getInvestorProfile returns null before any profile is created", async () => {
  assert.equal(await investorProfileService.getInvestorProfile(), null);
});

// Phase X8 — Part 1, Identity Correction. The real, reproduced bug: a
// brand-new session with no resolved betaUserId used to inherit "the
// first InvestorProfile ever created, by anyone" — including a real beta
// user's own profile. Onboarding decisions must be session/identity-
// scoped, never derived from global application state.
test("a real beta user's profile never leaks into a session with no resolved identity", async () => {
  await investorProfileService.createInvestorProfile({ age: 40 }, "real-beta-user-id");
  const forNoIdentity = await investorProfileService.getInvestorProfile(undefined);
  assert.equal(forNoIdentity, null, "a fresh, identity-less session must see no profile — never someone else's real one");
});

test("multiple real beta users' profiles are fully isolated from each other", async () => {
  await investorProfileService.createInvestorProfile({ age: 25 }, "beta-user-a");
  await investorProfileService.createInvestorProfile({ age: 60 }, "beta-user-b");
  const forA = await investorProfileService.getInvestorProfile("beta-user-a");
  const forB = await investorProfileService.getInvestorProfile("beta-user-b");
  assert.equal(forA.age, 25);
  assert.equal(forB.age, 60);
});

test("a genuine legacy/no-beta profile (created with no identity) is still found for a later identity-less session — real backward compatibility preserved", async () => {
  await investorProfileService.createInvestorProfile({ age: 33 });
  const found = await investorProfileService.getInvestorProfile(undefined);
  assert.equal(found?.age, 33);
});

test("updateInvestorProfile 404s when no profile exists yet", async () => {
  await assert.rejects(() => investorProfileService.updateInvestorProfile({ age: 30 }), (error) => error.statusCode === 404);
});

test("computeSuggestedAllocation: higher age skews toward bonds/cash, all else equal", () => {
  const young = investorProfileService.computeSuggestedAllocation({ age: 25, riskTolerance: "MEDIUM", investmentHorizon: "LONG_TERM" });
  const old = investorProfileService.computeSuggestedAllocation({ age: 65, riskTolerance: "MEDIUM", investmentHorizon: "LONG_TERM" });
  assert.ok(young.stocks > old.stocks);
});

test("computeSuggestedAllocation: higher risk tolerance increases stock allocation, all else equal", () => {
  const low = investorProfileService.computeSuggestedAllocation({ age: 30, riskTolerance: "LOW", investmentHorizon: "LONG_TERM" });
  const high = investorProfileService.computeSuggestedAllocation({ age: 30, riskTolerance: "HIGH", investmentHorizon: "LONG_TERM" });
  assert.ok(high.stocks > low.stocks);
});

test("computeSuggestedAllocation: a short horizon caps stock exposure regardless of age/risk", () => {
  const aggressive = investorProfileService.computeSuggestedAllocation({ age: 22, riskTolerance: "HIGH", investmentHorizon: "SHORT_TERM" });
  assert.ok(aggressive.stocks <= 40);
});

test("computeSuggestedAllocation always sums to 100", () => {
  for (const age of [18, 30, 45, 65, 80]) {
    for (const riskTolerance of ["LOW", "MEDIUM", "HIGH"]) {
      const allocation = investorProfileService.computeSuggestedAllocation({ age, riskTolerance, investmentHorizon: "MEDIUM_TERM" });
      assert.equal(allocation.stocks + allocation.bonds + allocation.cash, 100);
    }
  }
});

test("computeExpectedVolatilityRange: a stock-heavy allocation has a wider range than a cash-heavy one", () => {
  const stockHeavy = investorProfileService.computeExpectedVolatilityRange({ stocks: 90, bonds: 8, cash: 2 });
  const cashHeavy = investorProfileService.computeExpectedVolatilityRange({ stocks: 10, bonds: 20, cash: 70 });
  assert.ok(stockHeavy.highPct > cashHeavy.highPct);
});

test("generateInvestmentProfile always includes the illustration-not-a-promise disclosure", () => {
  const result = investorProfileService.generateInvestmentProfile({ age: 17, riskTolerance: "MEDIUM", investmentHorizon: "LONG_TERM", experienceLevel: "BEGINNER", investmentGoal: "WEALTH" });

  assert.match(result.assumptionsDisclosure, /illustrations.*not.*promises/i);
  assert.ok(result.suggestedAllocation);
  assert.ok(result.diversificationExplanation.length > 0);
  assert.ok(Number.isFinite(result.expectedVolatility.lowPct));
  assert.ok(Number.isFinite(result.suggestedAnnualReturnPct));
  assert.ok(result.educationalExplanation.length > 0);
});

test("generateInvestmentProfile's educational explanation adapts to experience level and goal", () => {
  const beginner = investorProfileService.generateInvestmentProfile({ age: 20, riskTolerance: "LOW", investmentHorizon: "LONG_TERM", experienceLevel: "BEGINNER", investmentGoal: "HOUSE" });
  assert.match(beginner.educationalExplanation, /Compounding/);
  assert.match(beginner.educationalExplanation, /house/i);
});
