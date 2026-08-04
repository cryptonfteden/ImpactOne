// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. The real,
// honest default billing provider — never calls out to any real
// payment network, matching this codebase's own "honest stub" /
// `honestStubFetch` discipline already established for the provider
// layer. Every real environment this codebase runs in today has no
// payment vendor configured, so this is the real, active provider by
// default (`BILLING_PROVIDER=manual`). A subscription created here is
// genuinely persisted (real DB row via billingService.js), just never
// backed by a real charge — appropriate for a free-tier MVP launch or
// a manually-comped account, never presented as a real payment.
const crypto = require("node:crypto");

async function createCustomer({ userId }) {
  return { externalCustomerId: `manual_cust_${userId}` };
}

async function createSubscription({ planKey }) {
  return {
    externalSubscriptionId: `manual_sub_${crypto.randomUUID()}`,
    status: "ACTIVE",
    currentPeriodEnd: null, // honestly open-ended — no real billing cycle exists to report
    planKey,
  };
}

async function cancelSubscription() {
  return { status: "CANCELED" };
}

async function handleWebhookEvent() {
  // No real webhook source exists for this provider — honestly null,
  // never a fabricated event.
  return null;
}

module.exports = { name: "manual", createCustomer, createSubscription, cancelSubscription, handleWebhookEvent };
