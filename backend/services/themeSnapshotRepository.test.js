require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const themeSnapshotRepository = require("./themeSnapshotRepository");

test.beforeEach(async () => {
  await truncateAll();
});

test("upsertTodaySnapshot creates a row on first call", async () => {
  const created = await themeSnapshotRepository.upsertTodaySnapshot({ themeKey: "ai", confidenceScore: 72, maturityLabel: "Growth" });
  assert.equal(created.themeKey, "ai");
  assert.equal(Number(created.confidenceScore), 72);
});

test("upsertTodaySnapshot is idempotent for the same theme and day (one row, not two)", async () => {
  await themeSnapshotRepository.upsertTodaySnapshot({ themeKey: "ai", confidenceScore: 60, maturityLabel: "Emerging" });
  await themeSnapshotRepository.upsertTodaySnapshot({ themeKey: "ai", confidenceScore: 75, maturityLabel: "Growth" });

  const snapshots = await themeSnapshotRepository.getRecentSnapshots("ai");
  assert.equal(snapshots.length, 1);
  assert.equal(Number(snapshots[0].confidenceScore), 75);
});

test("getRecentSnapshots only returns rows for the requested theme", async () => {
  await themeSnapshotRepository.upsertTodaySnapshot({ themeKey: "ai", confidenceScore: 70, maturityLabel: "Growth" });
  await themeSnapshotRepository.upsertTodaySnapshot({ themeKey: "defense", confidenceScore: 55, maturityLabel: "Emerging" });

  const aiSnapshots = await themeSnapshotRepository.getRecentSnapshots("ai");
  assert.equal(aiSnapshots.length, 1);
  assert.equal(aiSnapshots[0].themeKey, "ai");
});
