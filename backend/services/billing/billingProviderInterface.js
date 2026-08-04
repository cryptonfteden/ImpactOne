// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. The one real
// contract every billing provider implementation must satisfy
// ("Design the billing layer so Stripe is only one provider
// implementation" / "Do NOT hardcode any payment vendor"). Mirrors
// this codebase's own `baseProviderContract.js` precedent — a plain
// structural validator, not a class hierarchy, kept dependency-free.
//
// A conforming provider is an object exposing:
//   name: string
//   async createCustomer({ userId, email }) -> { externalCustomerId }
//   async createSubscription({ externalCustomerId, planKey }) -> { externalSubscriptionId, status, currentPeriodEnd }
//   async cancelSubscription({ externalSubscriptionId }) -> { status }
//   async handleWebhookEvent(rawBody, signatureHeader) -> { type, externalSubscriptionId, status, currentPeriodEnd } | null
const REQUIRED_METHODS = ["createCustomer", "createSubscription", "cancelSubscription", "handleWebhookEvent"];

function validateBillingProviderShape(provider) {
  const missingFields = [];
  if (typeof provider?.name !== "string" || !provider.name.trim()) missingFields.push("name");
  for (const method of REQUIRED_METHODS) {
    if (typeof provider?.[method] !== "function") missingFields.push(method);
  }
  return { valid: missingFields.length === 0, missingFields };
}

module.exports = { validateBillingProviderShape, REQUIRED_METHODS };
