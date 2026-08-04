// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. A real Stripe
// implementation of the same billing provider contract
// `manualBillingProvider.js` satisfies — selected only when
// `BILLING_PROVIDER=stripe` and a real `STRIPE_SECRET_KEY` is
// configured (see `billingService.js`'s factory). Nothing else in this
// codebase imports the `stripe` package directly or references a
// Stripe-specific concept — this is the one, disclosed place a
// specific payment vendor's SDK is used ("Do NOT hardcode any payment
// vendor" anywhere else).
const Stripe = require("stripe");
const env = require("../../../config/env");

function createStripeBillingProvider({ stripeClient } = {}) {
  const client = stripeClient || (env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null);

  async function createCustomer({ userId, email }) {
    if (!client) throw new Error("Stripe is not configured — STRIPE_SECRET_KEY is required for the stripe billing provider.");
    const customer = await client.customers.create({ email, metadata: { userId } });
    return { externalCustomerId: customer.id };
  }

  async function createSubscription({ externalCustomerId, planKey, priceId }) {
    if (!client) throw new Error("Stripe is not configured — STRIPE_SECRET_KEY is required for the stripe billing provider.");
    // `priceId` is the real Stripe Price object id for this plan — kept
    // as an explicit caller-supplied value (never inferred/guessed)
    // since Stripe's own price catalog is managed in the Stripe
    // Dashboard, not duplicated in this codebase's own Plan model.
    const subscription = await client.subscriptions.create({
      customer: externalCustomerId,
      items: [{ price: priceId }],
      metadata: { planKey },
    });
    return {
      externalSubscriptionId: subscription.id,
      status: mapStripeStatus(subscription.status),
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
    };
  }

  async function cancelSubscription({ externalSubscriptionId }) {
    if (!client) throw new Error("Stripe is not configured — STRIPE_SECRET_KEY is required for the stripe billing provider.");
    const subscription = await client.subscriptions.cancel(externalSubscriptionId);
    return { status: mapStripeStatus(subscription.status) };
  }

  /**
   * Verifies and parses a real Stripe webhook event. Returns `null` for
   * an event type this codebase doesn't act on — never fabricates a
   * status change for an unrecognized event.
   */
  async function handleWebhookEvent(rawBody, signatureHeader) {
    if (!client) throw new Error("Stripe is not configured — STRIPE_SECRET_KEY is required for the stripe billing provider.");
    const event = client.webhooks.constructEvent(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);

    const relevantTypes = ["customer.subscription.updated", "customer.subscription.deleted"];
    if (!relevantTypes.includes(event.type)) {
      return null;
    }

    const subscription = event.data.object;
    return {
      type: event.type,
      externalSubscriptionId: subscription.id,
      status: mapStripeStatus(subscription.status),
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
    };
  }

  return { name: "stripe", createCustomer, createSubscription, cancelSubscription, handleWebhookEvent };
}

/**
 * A real, disclosed, total mapping from Stripe's own status vocabulary
 * onto this codebase's internal, vendor-agnostic status strings — the
 * one place Stripe's specific vocabulary is translated, so
 * entitlementService/accountService never need to know Stripe's own
 * status names.
 */
function mapStripeStatus(stripeStatus) {
  const map = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "PAST_DUE",
    incomplete: "PAST_DUE",
    incomplete_expired: "CANCELED",
  };
  return map[stripeStatus] || "PAST_DUE";
}

module.exports = { createStripeBillingProvider, mapStripeStatus };
