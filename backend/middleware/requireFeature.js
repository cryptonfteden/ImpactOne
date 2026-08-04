// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. "Protect all
// premium endpoints." A middleware FACTORY (not a single middleware) —
// each protected route names its own real, disclosed feature key,
// mirroring `agentReliabilityService`-style factory patterns already
// used elsewhere in this codebase. Requires `requireAuth` to have
// already run (`req.userId` must be set) — this is deliberately a
// separate, composable middleware rather than folding auth + gating
// into one function, so a route can mix and match (e.g. a route that
// needs auth but no specific feature gate).
const entitlementService = require("../services/entitlementService");

/**
 * @param {string} featureKey - a boolean feature flag key in Plan.features
 */
function requireFeature(featureKey) {
  return async function requireFeatureMiddleware(req, res, next) {
    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required.", errorCode: "MISSING_TOKEN" });
    }
    try {
      const allowed = await entitlementService.hasFeature(req.userId, featureKey);
      if (!allowed) {
        return res.status(403).json({ error: `Your current plan does not include this feature (${featureKey}). Upgrade to unlock it.`, errorCode: "FEATURE_NOT_ENTITLED" });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * @param {string} featureKey - the usage-tracking key (UsageCounter.featureKey)
 * @param {string} limitKey - the Plan.features key naming this feature's numeric monthly limit
 */
function requireUsageLimit(featureKey, limitKey) {
  return async function requireUsageLimitMiddleware(req, res, next) {
    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required.", errorCode: "MISSING_TOKEN" });
    }
    try {
      const result = await entitlementService.checkAndConsumeUsage(req.userId, featureKey, limitKey);
      if (!result.allowed) {
        return res.status(429).json({ error: `You've reached your plan's monthly limit for this feature (${result.used}/${result.limit}). Upgrade for more.`, errorCode: "USAGE_LIMIT_EXCEEDED", ...result });
      }
      req.usage = result;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { requireFeature, requireUsageLimit };
