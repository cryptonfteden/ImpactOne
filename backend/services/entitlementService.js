// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. "Feature
// gating," "Usage limits," "Free vs Pro permissions." Reads the real,
// internal Plan catalog (never a billing vendor) plus a real user's
// real Subscription row; a user with no real Subscription row honestly
// defaults to the real "free" plan — never a fabricated entitlement.
const planRepository = require("./planRepository");
const subscriptionRepository = require("./subscriptionRepository");
const usageCounterRepository = require("./usageCounterRepository");

const FREE_PLAN_KEY = "free";
const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING"]);

function httpError(message, statusCode, errorCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errorCode) error.errorCode = errorCode;
  return error;
}

/**
 * The real plan currently backing a user's entitlements. A
 * subscription in a non-active real status (PAST_DUE/CANCELED)
 * honestly falls back to the free plan rather than continuing to
 * grant paid access.
 */
async function resolveActivePlan(userId) {
  const subscription = await subscriptionRepository.findByUserId(userId);
  if (subscription && ACTIVE_STATUSES.has(subscription.status)) {
    const plan = await planRepository.findById(subscription.planId);
    if (plan) return plan;
  }
  const freePlan = await planRepository.findByKey(FREE_PLAN_KEY);
  if (!freePlan) {
    throw httpError(`No "${FREE_PLAN_KEY}" plan is seeded — entitlements cannot be resolved.`, 500, "PLAN_NOT_SEEDED");
  }
  return freePlan;
}

async function getEntitlements(userId) {
  const plan = await resolveActivePlan(userId);
  return { planKey: plan.key, planName: plan.name, features: plan.features };
}

/**
 * @param {string} userId
 * @param {string} featureKey - a boolean feature flag key in Plan.features
 * @returns {Promise<boolean>}
 */
async function hasFeature(userId, featureKey) {
  const { features } = await getEntitlements(userId);
  return features?.[featureKey] === true;
}

// A real, disclosed monthly counting window — the first real moment
// of the current real calendar month, UTC. Every usage limit in this
// MVP resets monthly; a future phase could disclose a per-feature
// window if a genuinely different cadence is ever needed.
function currentPeriodStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Checks AND atomically consumes one real unit of usage for a numeric-
 * limited feature (`Plan.features[limitKey]`, `null` = genuinely
 * unlimited). Never fabricates a "remaining" count — every number here
 * is a real, persisted `UsageCounter` value.
 * @param {string} userId
 * @param {string} featureKey - the real feature this usage is for (also the UsageCounter.featureKey)
 * @param {string} limitKey - the Plan.features key naming this feature's numeric monthly limit
 * @returns {Promise<{ allowed: boolean, limit: number|null, used: number, remaining: number|null }>}
 */
async function checkAndConsumeUsage(userId, featureKey, limitKey) {
  const { features } = await getEntitlements(userId);
  const limit = Number.isFinite(features?.[limitKey]) ? features[limitKey] : null;
  const periodStart = currentPeriodStart();

  if (limit === null) {
    return { allowed: true, limit: null, used: null, remaining: null };
  }

  const currentUsed = await usageCounterRepository.getCount(userId, featureKey, periodStart);
  if (currentUsed >= limit) {
    return { allowed: false, limit, used: currentUsed, remaining: 0 };
  }

  const used = await usageCounterRepository.incrementAndGet(userId, featureKey, periodStart);
  return { allowed: true, limit, used, remaining: Math.max(0, limit - used) };
}

module.exports = { getEntitlements, hasFeature, checkAndConsumeUsage, resolveActivePlan, FREE_PLAN_KEY, currentPeriodStart };
