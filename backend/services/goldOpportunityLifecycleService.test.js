require("../test/testEnv");
const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("os");
const path = require("path");
const fs = require("fs/promises");
const { reconcileGoldLifecycle, readStore } = require("./goldOpportunityLifecycleService");

test("gold lifecycle records only real state transitions", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "impactone-gold-"));
  const storePath = path.join(directory, "history.json");
  const first = await reconcileGoldLifecycle([{ symbol: "ABC", state: "RADAR", score: 60 }], { storePath, now: "2026-08-18T10:00:00Z" });
  const second = await reconcileGoldLifecycle([{ symbol: "ABC", state: "WATCH", score: 70 }], { storePath, now: "2026-08-19T10:00:00Z" });
  assert.equal(first[0].previousState, null);
  assert.equal(second[0].previousState, "RADAR");
  assert.equal(second[0].lifecycle.length, 2);
});

test("a completed full scan invalidates disappeared symbols", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "impactone-gold-"));
  const storePath = path.join(directory, "history.json");
  await reconcileGoldLifecycle([{ symbol: "ABC", state: "WATCH", score: 70 }], { storePath, now: "2026-08-18T10:00:00Z" });
  await reconcileGoldLifecycle([], { storePath, now: "2026-08-19T10:00:00Z", fullScanComplete: true });
  assert.equal((await readStore(storePath)).symbols.ABC.currentState, "INVALIDATED");
});
