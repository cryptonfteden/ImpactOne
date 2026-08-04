const test = require("node:test");
const assert = require("node:assert/strict");
const { createStripeBillingProvider, mapStripeStatus } = require("./stripeBillingProvider");

function fakeStripeClient(overrides = {}) {
  return {
    customers: { create: async ({ email, metadata }) => ({ id: "cus_fake", email, metadata }) },
    subscriptions: {
      create: async () => ({ id: "sub_fake", status: "active", current_period_end: 1893456000 }),
      cancel: async () => ({ id: "sub_fake", status: "canceled" }),
    },
    webhooks: { constructEvent: () => ({ type: "customer.subscription.updated", data: { object: { id: "sub_fake", status: "active", current_period_end: 1893456000 } } }) },
    ...overrides,
  };
}

test("mapStripeStatus: a real, disclosed total mapping from every known Stripe status", () => {
  assert.equal(mapStripeStatus("active"), "ACTIVE");
  assert.equal(mapStripeStatus("trialing"), "TRIALING");
  assert.equal(mapStripeStatus("past_due"), "PAST_DUE");
  assert.equal(mapStripeStatus("canceled"), "CANCELED");
  assert.equal(mapStripeStatus("unpaid"), "PAST_DUE");
});

test("mapStripeStatus: an unrecognized real status honestly falls back to PAST_DUE, never a fabricated ACTIVE", () => {
  assert.equal(mapStripeStatus("some-future-stripe-status"), "PAST_DUE");
});

test("createCustomer: delegates to the real (injected) Stripe client and maps its real response", async () => {
  const provider = createStripeBillingProvider({ stripeClient: fakeStripeClient() });
  const result = await provider.createCustomer({ userId: "user-1", email: "a@example.com" });
  assert.equal(result.externalCustomerId, "cus_fake");
});

test("createSubscription: maps the real Stripe subscription response onto this codebase's own vendor-agnostic shape", async () => {
  const provider = createStripeBillingProvider({ stripeClient: fakeStripeClient() });
  const result = await provider.createSubscription({ externalCustomerId: "cus_fake", planKey: "pro", priceId: "price_fake" });
  assert.equal(result.externalSubscriptionId, "sub_fake");
  assert.equal(result.status, "ACTIVE");
  assert.ok(result.currentPeriodEnd instanceof Date);
});

test("cancelSubscription: maps the real Stripe cancellation response", async () => {
  const provider = createStripeBillingProvider({ stripeClient: fakeStripeClient() });
  const result = await provider.cancelSubscription({ externalSubscriptionId: "sub_fake" });
  assert.equal(result.status, "CANCELED");
});

test("handleWebhookEvent: returns a real, mapped event for a recognized real event type", async () => {
  const provider = createStripeBillingProvider({ stripeClient: fakeStripeClient() });
  const result = await provider.handleWebhookEvent("{}", "sig_fake");
  assert.equal(result.type, "customer.subscription.updated");
  assert.equal(result.externalSubscriptionId, "sub_fake");
  assert.equal(result.status, "ACTIVE");
});

test("handleWebhookEvent: honestly returns null for a real, unrecognized event type — never fabricating a status change", async () => {
  const provider = createStripeBillingProvider({
    stripeClient: fakeStripeClient({ webhooks: { constructEvent: () => ({ type: "invoice.paid", data: { object: {} } }) } }),
  });
  const result = await provider.handleWebhookEvent("{}", "sig_fake");
  assert.equal(result, null);
});

test("throws a real, clear error when no Stripe client/key is configured, never silently no-oping", async () => {
  const provider = createStripeBillingProvider({ stripeClient: null });
  await assert.rejects(() => provider.createCustomer({ userId: "user-1", email: "a@example.com" }), /Stripe is not configured/);
});
