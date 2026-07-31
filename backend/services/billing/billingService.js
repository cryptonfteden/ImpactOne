// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. The one, real,
// vendor-agnostic facade every other commercial service/controller
// calls — "Stripe is only one provider implementation," selected
// purely by `env.BILLING_PROVIDER`. No caller of this module ever
// imports a provider file directly or references a vendor-specific
// concept (a Stripe "Price," a Stripe webhook signature header, etc.)
// — those all stay inside `providers/stripeBillingProvider.js`.
const env = require("../../config/env");
const manualBillingProvider = require("./providers/manualBillingProvider");
const { createStripeBillingProvider } = require("./providers/stripeBillingProvider");
const { validateBillingProviderShape } = require("./billingProviderInterface");

let cachedProvider = null;

/**
 * Resolves the real, currently-configured billing provider. Cached
 * after first resolution (the configured provider never changes mid-
 * process) — call `_resetProviderCacheForTests()` to force
 * re-resolution in a test that changes `env.BILLING_PROVIDER`.
 */
function getProvider() {
  if (cachedProvider) return cachedProvider;

  const provider = env.BILLING_PROVIDER === "stripe" ? createStripeBillingProvider() : manualBillingProvider;

  const { valid, missingFields } = validateBillingProviderShape(provider);
  if (!valid) {
    throw new Error(`Configured billing provider "${provider?.name}" does not satisfy the required contract — missing: ${missingFields.join(", ")}`);
  }

  cachedProvider = provider;
  return cachedProvider;
}

function _resetProviderCacheForTests() {
  cachedProvider = null;
}

async function createCustomer(args) {
  return getProvider().createCustomer(args);
}

async function createSubscription(args) {
  return getProvider().createSubscription(args);
}

async function cancelSubscription(args) {
  return getProvider().cancelSubscription(args);
}

async function handleWebhookEvent(rawBody, signatureHeader) {
  return getProvider().handleWebhookEvent(rawBody, signatureHeader);
}

function getProviderName() {
  return getProvider().name;
}

module.exports = {
  createCustomer,
  createSubscription,
  cancelSubscription,
  handleWebhookEvent,
  getProviderName,
  _resetProviderCacheForTests,
};
