const test = require("node:test");
const assert = require("node:assert/strict");

const { createProvider, honestStubFetch } = require("./providerFactory");

test("createProvider builds a valid provider from config + fetchImpl", () => {
  const provider = createProvider(
    { providerId: "sec", label: "SEC", sourceType: "regulatory-filing", category: "regulation", rateLimit: { maxPerMinute: 10 } },
    honestStubFetch
  );
  assert.equal(provider.providerId, "sec");
  assert.equal(typeof provider.fetch, "function");
});

test("createProvider throws with the missing field name when config is incomplete", () => {
  assert.throws(
    () => createProvider({ label: "SEC", sourceType: "regulatory-filing", category: "regulation" }, honestStubFetch),
    /providerId/
  );
});

test("honestStubFetch resolves to an empty array", async () => {
  const result = await honestStubFetch();
  assert.deepEqual(result, []);
});
