// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. "Upgrade API"
// + "Account management." The one service that orchestrates a real
// plan change: resolves the real target Plan, delegates the actual
// vendor call to the vendor-agnostic `billingService` (never a
// specific vendor here), then persists the real resulting
// Subscription row. Every validation error is a real, typed `Error`
// with `.statusCode`/`.errorCode` — the same convention every other
// service in this codebase already uses.
const userRepository = require("./userRepository");
const planRepository = require("./planRepository");
const subscriptionRepository = require("./subscriptionRepository");
const billingService = require("./billing/billingService");
const entitlementService = require("./entitlementService");

function httpError(message, statusCode, errorCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errorCode) error.errorCode = errorCode;
  return error;
}

async function getAccount(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw httpError("Account not found.", 404, "ACCOUNT_NOT_FOUND");
  }
  const subscription = await subscriptionRepository.findByUserId(userId);
  const entitlements = await entitlementService.getEntitlements(userId);

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    plan: entitlements,
    subscription: subscription
      ? {
          status: subscription.status,
          billingProvider: subscription.billingProvider,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : null,
  };
}

/**
 * The real "Upgrade API." Resolves the real target plan, creates (or
 * reuses) a real billing-vendor customer + subscription via the
 * vendor-agnostic `billingService`, and persists the resulting real
 * Subscription row. `priceId` is only ever meaningful for a real
 * Stripe-backed plan (see stripeBillingProvider.js) — the manual
 * provider ignores it, never fabricating a vendor-specific concept it
 * doesn't have.
 */
async function upgradePlan(userId, planKey, { priceId } = {}) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw httpError("Account not found.", 404, "ACCOUNT_NOT_FOUND");
  }

  const plan = await planRepository.findByKey(planKey);
  if (!plan) {
    throw httpError(`Unknown plan: "${planKey}".`, 404, "PLAN_NOT_FOUND");
  }

  const existing = await subscriptionRepository.findByUserId(userId);
  const externalCustomerId = existing?.externalCustomerId || (await billingService.createCustomer({ userId, email: user.email })).externalCustomerId;

  const created = await billingService.createSubscription({ externalCustomerId, planKey: plan.key, priceId });

  const subscription = await subscriptionRepository.upsertForUser(userId, {
    planId: plan.id,
    status: created.status,
    billingProvider: billingService.getProviderName(),
    externalCustomerId,
    externalSubscriptionId: created.externalSubscriptionId,
    currentPeriodEnd: created.currentPeriodEnd,
    cancelAtPeriodEnd: false,
  });

  return { plan: { key: plan.key, name: plan.name }, subscription };
}

async function cancelPlan(userId) {
  const subscription = await subscriptionRepository.findByUserId(userId);
  if (!subscription) {
    throw httpError("No active subscription to cancel.", 404, "NO_SUBSCRIPTION");
  }

  const result = subscription.externalSubscriptionId
    ? await billingService.cancelSubscription({ externalSubscriptionId: subscription.externalSubscriptionId })
    : { status: "CANCELED" };

  return subscriptionRepository.updateForUser(userId, { status: result.status, cancelAtPeriodEnd: true });
}

module.exports = { getAccount, upgradePlan, cancelPlan };
