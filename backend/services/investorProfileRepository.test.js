require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const investorProfileRepository = require("./investorProfileRepository");

test.beforeEach(async () => {
  await truncateAll();
});

test("findDefaultInvestorProfile returns null when none exists", async () => {
  const found = await investorProfileRepository.findDefaultInvestorProfile();
  assert.equal(found, null);
});

test("createInvestorProfile persists and findDefaultInvestorProfile retrieves it", async () => {
  await investorProfileRepository.createInvestorProfile({ age: 17, riskTolerance: "MEDIUM" });
  const found = await investorProfileRepository.findDefaultInvestorProfile();
  assert.equal(found.age, 17);
  assert.equal(found.riskTolerance, "MEDIUM");
});

test("findDefaultInvestorProfile returns the earliest-created profile when more than one exists (singleton convention)", async () => {
  const first = await investorProfileRepository.createInvestorProfile({ age: 30 });
  await new Promise((resolve) => setTimeout(resolve, 5));
  await investorProfileRepository.createInvestorProfile({ age: 40 });

  const found = await investorProfileRepository.findDefaultInvestorProfile();
  assert.equal(found.id, first.id);
});

test("updateInvestorProfile updates only the provided fields", async () => {
  const created = await investorProfileRepository.createInvestorProfile({ age: 25, country: "US" });
  const updated = await investorProfileRepository.updateInvestorProfile(created.id, { age: 26 });

  assert.equal(updated.age, 26);
  assert.equal(updated.country, "US");
});
