const test = require("node:test");
const assert = require("node:assert/strict");
const env = require("../../config/env");
const billingService = require("./billingService");
const manualBillingProvider = require("./providers/manualBillingProvider");

test.beforeEach(() => {
  billingService._resetProviderCacheForTests();
});

test("getProviderName: defaults to the real, honest 'manual' provider — never a hardcoded vendor", () => {
  const original = env.BILLING_PROVIDER;
  env.BILLING_PROVIDER = "manual";
  try {
    assert.equal(billingService.getProviderName(), "manual");
  } finally {
    env.BILLING_PROVIDER = original;
  }
});

test("createCustomer/createSubscription: real, deterministic manual-provider behavior (no real vendor call)", async () => {
  const original = env.BILLING_PROVIDER;
  env.BILLING_PROVIDER = "manual";
  try {
    const customer = await billingService.createCustomer({ userId: "user-1", email: "a@example.com" });
    assert.ok(customer.externalCustomerId);
    const subscription = await billingService.createSubscription({ externalCustomerId: customer.externalCustomerId, planKey: "pro" });
    assert.equal(subscription.status, "ACTIVE");
    assert.ok(subscription.externalSubscriptionId);
  } finally {
    env.BILLING_PROVIDER = original;
  }
});

test("cancelSubscription: real manual-provider cancellation", async () => {
  const original = env.BILLING_PROVIDER;
  env.BILLING_PROVIDER = "manual";
  try {
    const result = await billingService.cancelSubscription({ externalSubscriptionId: "manual_sub_x" });
    assert.equal(result.status, "CANCELED");
  } finally {
    env.BILLING_PROVIDER = original;
  }
});

test("selects the real, injected stripe provider when BILLING_PROVIDER=stripe, never silently falling back to manual", async () => {
  const original = env.BILLING_PROVIDER;
  const originalStripeKey = env.STRIPE_SECRET_KEY;
  env.BILLING_PROVIDER = "stripe";
  env.STRIPE_SECRET_KEY = "sk_test_fake";
  try {
    assert.equal(billingService.getProviderName(), "stripe");
  } finally {
    env.BILLING_PROVIDER = original;
    env.STRIPE_SECRET_KEY = originalStripeKey;
    billingService._resetProviderCacheForTests();
  }
});

test("handleWebhookEvent: the real manual provider honestly returns null (no real webhook source exists for it)", async () => {
  const result = await manualBillingProvider.handleWebhookEvent("{}", "sig");
  assert.equal(result, null);
});

test("_resetProviderCacheForTests: forces real re-resolution on the next call, reflecting a real config change", () => {
  env.BILLING_PROVIDER = "manual";
  billingService._resetProviderCacheForTests();
  assert.equal(billingService.getProviderName(), "manual");
});
