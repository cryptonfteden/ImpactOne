const test = require("node:test");
const assert = require("node:assert/strict");
const { validateBillingProviderShape } = require("./billingProviderInterface");
const manualBillingProvider = require("./providers/manualBillingProvider");

test("validateBillingProviderShape: the real manual provider satisfies the full contract", () => {
  const { valid, missingFields } = validateBillingProviderShape(manualBillingProvider);
  assert.equal(valid, true, `unexpected missing fields: ${missingFields.join(", ")}`);
});

test("validateBillingProviderShape: honestly reports every real missing field", () => {
  const { valid, missingFields } = validateBillingProviderShape({});
  assert.equal(valid, false);
  assert.ok(missingFields.includes("name"));
  assert.ok(missingFields.includes("createCustomer"));
  assert.ok(missingFields.includes("createSubscription"));
  assert.ok(missingFields.includes("cancelSubscription"));
  assert.ok(missingFields.includes("handleWebhookEvent"));
});

test("validateBillingProviderShape: a provider missing just one real method is honestly invalid", () => {
  const partial = { name: "partial", createCustomer: async () => {}, createSubscription: async () => {}, cancelSubscription: async () => {} };
  const { valid, missingFields } = validateBillingProviderShape(partial);
  assert.equal(valid, false);
  assert.deepEqual(missingFields, ["handleWebhookEvent"]);
});
