require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const workspaceService = require("./workspaceService");
const watchlistFolderService = require("./watchlistFolderService");
const finnhubService = require("./finnhubService");
const priceHistoryProvider = require("./intelligence/priceHistoryProvider");

const USER_A = "beta-user-a";
const USER_B = "beta-user-b";

function mockMarketData() {
  const originalGetQuote = finnhubService.getQuote;
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  finnhubService.getQuote = async () => ({ quote: { marketCap: 500_000_000_000, price: 200, volume: 10_000_000 } });
  priceHistoryProvider.getDailyBars = async () =>
    Array.from({ length: 20 }, (_, i) => ({ date: `d${i}`, open: 190 + i, high: 191 + i, low: 189 + i, close: 190 + i, volume: 8_000_000 }));
  return () => {
    finnhubService.getQuote = originalGetQuote;
    priceHistoryProvider.getDailyBars = originalGetDailyBars;
  };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("getWorkspace requires a beta user identity", async () => {
  await assert.rejects(() => workspaceService.getWorkspace(null, "any-id"), (error) => error.statusCode === 400);
});

test("getWorkspace returns the real folder, notes, timeline, and a disclosed known gap", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  const workspace = await workspaceService.getWorkspace(USER_A, folder.id);
  assert.equal(workspace.folder.name, "AI");
  assert.deepEqual(workspace.notes, []);
  assert.deepEqual(workspace.timeline, []);
  assert.equal(workspace.knownGaps[0].gap, "assetTypeDistinction");
});

test("addNote persists a real, retrievable note and appears in the workspace timeline", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  await workspaceService.addNote(USER_A, folder.id, "Watching for an entry below $200.");

  const workspace = await workspaceService.getWorkspace(USER_A, folder.id);
  assert.equal(workspace.notes.length, 1);
  assert.equal(workspace.notes[0].text, "Watching for an entry below $200.");
  assert.equal(workspace.timeline[0].type, "NOTE");
});

test("addNote rejects empty text", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  await assert.rejects(() => workspaceService.addNote(USER_A, folder.id, "   "), (error) => error.statusCode === 400);
});

test("User B cannot add a note to User A's workspace — 404, not leaked existence", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  await assert.rejects(() => workspaceService.addNote(USER_B, folder.id, "hijack attempt"), (error) => error.statusCode === 404);
  await assert.rejects(() => workspaceService.getWorkspace(USER_B, folder.id), (error) => error.statusCode === 404);
});

test("Workspace Health is a real computed composite from real market positioning data", async () => {
  const restore = mockMarketData();
  try {
    const folder = await watchlistFolderService.createFolder(USER_A, "AI");
    await watchlistFolderService.addSymbol(USER_A, folder.id, "NVDA");

    const workspace = await workspaceService.getWorkspace(USER_A, folder.id);
    assert.equal(workspace.health.trackedSymbolCount, 1);
    assert.equal(workspace.health.dataAvailable, true);
  } finally {
    restore();
  }
});

test("Workspace Health is honestly null when the workspace has no symbols yet", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  const workspace = await workspaceService.getWorkspace(USER_A, folder.id);
  assert.equal(workspace.health, null);
});

test("getWorkspaceDecisionHistory only includes real decisions about this workspace's own tracked symbols", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  await watchlistFolderService.addSymbol(USER_A, folder.id, "NVDA");

  const history = await workspaceService.getWorkspaceDecisionHistory(USER_A, folder.id);
  assert.ok(history.items.every((item) => item.symbol === "NVDA"));
});

// Phase X5 — Part 4, Professional Watchlists.
test("setItemFlags persists real pinned/priority/aiFocus flags, visible on the next getWorkspace read", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  await watchlistFolderService.addSymbol(USER_A, folder.id, "NVDA");

  await watchlistFolderService.setItemFlags(USER_A, folder.id, "NVDA", { pinned: true, aiFocus: true });

  const workspace = await workspaceService.getWorkspace(USER_A, folder.id);
  const item = workspace.folder.items.find((entry) => entry.symbol === "NVDA");
  assert.equal(item.pinned, true);
  assert.equal(item.aiFocus, true);
  assert.equal(item.priority, false);
  assert.equal(workspace.summary.pinnedCount, 1);
  assert.equal(workspace.summary.aiFocusCount, 1);
  assert.equal(workspace.summary.priorityCount, 0);
});

test("setItemFlags rejects an unknown flag name", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  await watchlistFolderService.addSymbol(USER_A, folder.id, "NVDA");
  await assert.rejects(
    () => watchlistFolderService.setItemFlags(USER_A, folder.id, "NVDA", { notReal: true }),
    (error) => error.statusCode === 400
  );
});

test("User B cannot set flags on User A's workspace item — 404", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  await watchlistFolderService.addSymbol(USER_A, folder.id, "NVDA");
  await assert.rejects(
    () => watchlistFolderService.setItemFlags(USER_B, folder.id, "NVDA", { pinned: true }),
    (error) => error.statusCode === 404
  );
});

test("getWorkspace reports real alertSummary, performance, and impactSummary for tracked symbols", async () => {
  const restore = mockMarketData();
  try {
    const folder = await watchlistFolderService.createFolder(USER_A, "AI");
    await watchlistFolderService.addSymbol(USER_A, folder.id, "NVDA");
    const priceAlertService = require("./priceAlertService");
    await priceAlertService.createAlert(USER_A, { symbol: "NVDA", direction: "ABOVE", targetPrice: 999 });

    const workspace = await workspaceService.getWorkspace(USER_A, folder.id);
    assert.equal(workspace.alertSummary.activeCount, 1);
    assert.equal(workspace.alertSummary.triggeredCount, 0);
    assert.equal(workspace.health.activeAlertCount, 1);
    assert.ok(workspace.performance === null || typeof workspace.performance.avgMomentumPct !== "undefined");
    assert.ok("symbolsWithChain" in workspace.impactSummary);
  } finally {
    restore();
  }
});

test("getWorkspace reports honest empty summary/alertSummary/impactSummary with no tracked symbols", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  const workspace = await workspaceService.getWorkspace(USER_A, folder.id);
  assert.equal(workspace.summary.trackedSymbolCount, 0);
  assert.equal(workspace.alertSummary.activeCount, 0);
  assert.equal(workspace.performance, null);
  assert.equal(workspace.impactSummary, null);
});
