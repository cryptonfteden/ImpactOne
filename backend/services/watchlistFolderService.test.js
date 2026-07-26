require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const watchlistFolderService = require("./watchlistFolderService");

const USER_A = "beta-user-a";
const USER_B = "beta-user-b";

test.beforeEach(async () => {
  await truncateAll();
});

test("createFolder requires a beta user identity", async () => {
  await assert.rejects(() => watchlistFolderService.createFolder(null, "AI"), (error) => error.statusCode === 400);
});

test("createFolder requires a non-empty name", async () => {
  await assert.rejects(() => watchlistFolderService.createFolder(USER_A, "  "), (error) => error.statusCode === 400);
});

test("folder CRUD: create, rename, delete round-trip", async () => {
  const created = await watchlistFolderService.createFolder(USER_A, "AI");
  assert.equal(created.name, "AI");
  assert.equal(created.betaUserId, USER_A);

  const renamed = await watchlistFolderService.renameFolder(USER_A, created.id, "AI & Semis");
  assert.equal(renamed.name, "AI & Semis");

  await watchlistFolderService.deleteFolder(USER_A, created.id);
  const remaining = await watchlistFolderService.listFolders(USER_A);
  assert.equal(remaining.length, 0);
});

test("add/remove stock in a folder", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  const withSymbol = await watchlistFolderService.addSymbol(USER_A, folder.id, "nvda");
  assert.equal(withSymbol.items.length, 1);
  assert.equal(withSymbol.items[0].symbol, "NVDA"); // normalized uppercase

  const withoutSymbol = await watchlistFolderService.removeSymbol(USER_A, folder.id, "NVDA");
  assert.equal(withoutSymbol.items.length, 0);
});

test("adding the same symbol twice is idempotent, never a duplicate row", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  await watchlistFolderService.addSymbol(USER_A, folder.id, "NVDA");
  const result = await watchlistFolderService.addSymbol(USER_A, folder.id, "NVDA");
  assert.equal(result.items.length, 1);
});

test("moveSymbol removes from source and adds to destination", async () => {
  const source = await watchlistFolderService.createFolder(USER_A, "Waiting for Entry");
  const dest = await watchlistFolderService.createFolder(USER_A, "Long Term");
  await watchlistFolderService.addSymbol(USER_A, source.id, "PLTR");

  const result = await watchlistFolderService.moveSymbol(USER_A, source.id, dest.id, "PLTR");
  assert.equal(result.from.items.length, 0);
  assert.equal(result.to.items.length, 1);
  assert.equal(result.to.items[0].symbol, "PLTR");
});

// Phase H3 — the actual cross-user-access prevention requirement.
test("User B cannot rename, delete, or add to User A's folder — 404, not leaked existence", async () => {
  const folderA = await watchlistFolderService.createFolder(USER_A, "AI");

  await assert.rejects(
    () => watchlistFolderService.renameFolder(USER_B, folderA.id, "Hijacked"),
    (error) => error.statusCode === 404
  );
  await assert.rejects(
    () => watchlistFolderService.deleteFolder(USER_B, folderA.id),
    (error) => error.statusCode === 404
  );
  await assert.rejects(
    () => watchlistFolderService.addSymbol(USER_B, folderA.id, "NVDA"),
    (error) => error.statusCode === 404
  );

  // The folder is completely untouched by any of User B's attempts.
  const stillA = await watchlistFolderService.listFolders(USER_A);
  assert.equal(stillA[0].name, "AI");
});

test("listFolders only ever returns the calling user's own folders", async () => {
  await watchlistFolderService.createFolder(USER_A, "AI");
  await watchlistFolderService.createFolder(USER_B, "Space and Defense");

  const foldersA = await watchlistFolderService.listFolders(USER_A);
  const foldersB = await watchlistFolderService.listFolders(USER_B);

  assert.equal(foldersA.length, 1);
  assert.equal(foldersA[0].name, "AI");
  assert.equal(foldersB.length, 1);
  assert.equal(foldersB[0].name, "Space and Defense");
});

test("moveSymbol rejects when the destination folder belongs to a different user", async () => {
  const source = await watchlistFolderService.createFolder(USER_A, "Waiting for Entry");
  const foreignDest = await watchlistFolderService.createFolder(USER_B, "Long Term");
  await watchlistFolderService.addSymbol(USER_A, source.id, "PLTR");

  await assert.rejects(
    () => watchlistFolderService.moveSymbol(USER_A, source.id, foreignDest.id, "PLTR"),
    (error) => error.statusCode === 404
  );
});
