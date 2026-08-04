require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const providerInventoryService = require("./providerInventoryService");
const providerRegistry = require("../providers/providerRegistry");

test.beforeEach(async () => {
  await truncateAll();
});

test("generateInventory produces exactly one row per registered provider, generated from the real registry", async () => {
  const inventory = await providerInventoryService.generateInventory();
  const registeredIds = providerRegistry.listProviders().map((provider) => provider.providerId);
  assert.deepEqual(inventory.map((row) => row.providerId).sort(), registeredIds.sort());
});

test("a new UNCONFIGURED provider (e.g. finviz) is honestly reported as UNCONFIGURED with its real external requirement, never LIVE", async () => {
  const inventory = await providerInventoryService.generateInventory();
  const finviz = inventory.find((row) => row.providerId === "finviz");
  assert.equal(finviz.status, "UNCONFIGURED");
  assert.ok(finviz.licensingRestriction.includes("Finviz Elite"));
});

test("the real live CFTC COT provider is never reported as FIXTURE", async () => {
  const inventory = await providerInventoryService.generateInventory();
  const cot = inventory.find((row) => row.providerId === "cftcCot");
  assert.notEqual(cot.status, "FIXTURE");
});

test("a stub legacy provider with no run history yet is reported LIVE=false with honest 'no run history' reliability, never fabricated success", async () => {
  const inventory = await providerInventoryService.generateInventory();
  const reddit = inventory.find((row) => row.providerId === "reddit");
  assert.equal(reddit.status, "FIXTURE");
  assert.equal(reddit.lastSuccessfulRetrieval, null);
});

test("every inventory row carries every field the mission requires", async () => {
  const inventory = await providerInventoryService.generateInventory();
  const requiredFields = ["providerId", "category", "status", "lastSuccessfulRetrieval", "authenticationRequirement", "licensingRestriction", "consumingServices", "fallbackBehavior", "reliability"];
  for (const row of inventory) {
    for (const field of requiredFields) {
      assert.ok(field in row, `row for ${row.providerId} is missing ${field}`);
    }
  }
});
