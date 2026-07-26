require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const methodologyVersioningService = require("./methodologyVersioningService");

test.beforeEach(async () => {
  await truncateAll();
});

function versionData(overrides = {}) {
  return {
    version: "x11-v1",
    reason: "Introduce outcome-based scoring adjustment.",
    evidence: { sampleSize: 42, hitRate: 0.61 },
    affectedModels: ["autonomousRecommendationEngine"],
    expectedImpact: "Small, bounded quality-score shift for BUY recommendations.",
    ...overrides,
  };
}

test("requires all real fields to record a version", async () => {
  await assert.rejects(() => methodologyVersioningService.recordVersion({}), (error) => error.statusCode === 400);
});

test("records a real, immutable version and rejects a duplicate version string", async () => {
  const version = await methodologyVersioningService.recordVersion(versionData());
  assert.equal(version.version, "x11-v1");
  assert.equal(version.isActive, true);
  await assert.rejects(() => methodologyVersioningService.recordVersion(versionData()), (error) => error.statusCode === 409);
});

test("getActiveVersion finds the real active version for an affected model", async () => {
  await methodologyVersioningService.recordVersion(versionData());
  const active = await methodologyVersioningService.getActiveVersion("autonomousRecommendationEngine");
  assert.equal(active.version, "x11-v1");
  const none = await methodologyVersioningService.getActiveVersion("someUnrelatedModel");
  assert.equal(none, null);
});

test("rollback deactivates the current version and creates a new, real rollback version — never edits history", async () => {
  const v1 = await methodologyVersioningService.recordVersion(versionData());
  const v2 = await methodologyVersioningService.recordVersion(versionData({ version: "x11-v2", reason: "Widen the adjustment cap." }));

  const rolledBack = await methodologyVersioningService.rollbackToVersion(v1.version, { reason: "v2 caused excessive drift." });
  assert.ok(rolledBack.version.startsWith("x11-v1-rollback-"));
  assert.equal(rolledBack.isActive, true);

  const versions = await methodologyVersioningService.listVersions();
  const originalV1 = versions.find((entry) => entry.version === v1.version);
  const originalV2 = versions.find((entry) => entry.version === v2.version);
  assert.equal(originalV1.reason, v1.reason); // untouched
  assert.equal(originalV2.isActive, false); // deactivated, not deleted
});
