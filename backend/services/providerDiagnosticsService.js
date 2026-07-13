const providerRegistry = require("./providers/providerRegistry");
const { validateProviderShape } = require("./providers/baseProviderContract");
const providerIngestionService = require("./providerIngestionService");
const providerRunLogRepository = require("./providerRunLogRepository");

/**
 * Sprint 23A — deep, actionable, point-in-time introspection. Distinct from
 * Health (status) and Metrics (aggregated history): does this provider
 * still structurally conform to the interface right now, what's its
 * current rate-limiter budget, and what was its most recent failure in
 * detail. Reuses validateProviderShape (already the registry's own
 * boot-time check) and the SAME limiter instance providerIngestionService
 * runs against — never a fresh one — so the reported budget is real, not a
 * simulation.
 */
async function getDiagnosticsForProvider(providerId) {
  const provider = providerRegistry.getProvider(providerId);
  if (!provider) return null;

  const { valid: contractValid, missingFields: contractIssues } = validateProviderShape(provider);
  const rateLimiterState = providerIngestionService.getLimiterFor(provider).getState();

  const recentRuns = await providerRunLogRepository.getRecentRunsForProvider(providerId, 1);
  const lastRun = recentRuns[0] || null;
  const lastError =
    lastRun && lastRun.errorMessage ? { message: lastRun.errorMessage, occurredAt: lastRun.startedAt } : null;

  return {
    providerId,
    contractValid,
    contractIssues,
    rateLimiter: rateLimiterState,
    lastError,
  };
}

module.exports = { getDiagnosticsForProvider };
