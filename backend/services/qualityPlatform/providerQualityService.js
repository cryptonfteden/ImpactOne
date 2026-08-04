// Phase D1 — Learning Data Remediation. Provider Quality.
//
// SAFETY-CRITICAL, read-only: separates four dimensions that
// providerHealthService.js's existing "status" field conflates today. A
// provider that runs successfully but returns an empty payload
// (itemsFetched: 0) currently shows the same SUCCESS status as one
// returning real data — this module never changes that existing status
// field (no behavior change to providerHealthService or its consumers),
// it adds an independent, more honest read alongside it.
const providerRunLogRepository = require("../providerRunLogRepository");
const providerRegistry = require("../providers/providerRegistry");

function round(value, decimals = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(decimals)) : null;
}

/**
 * Four independent dimensions, each honestly null when there's no run
 * history to compute it from — never a fabricated 100%/0%.
 */
function computeQualityForRuns(runs) {
  if (!runs.length) {
    return { availability: null, dataQuality: null, freshness: null, completeness: null, lastSubstantiveRunAt: null, totalRuns: 0 };
  }

  const reachableRuns = runs.filter((run) => run.status !== "FAILED");
  const availability = round((reachableRuns.length / runs.length) * 100);

  // Data Quality: of the runs that were technically reachable, how many
  // actually returned a real, non-empty payload — the specific gap the
  // mission names ("a provider returning empty payloads must never appear
  // healthy").
  const substantiveRuns = reachableRuns.filter((run) => run.itemsFetched > 0);
  const dataQuality = reachableRuns.length ? round((substantiveRuns.length / reachableRuns.length) * 100) : null;

  // Freshness: real elapsed time since the most recent run that actually
  // returned real data — not just the most recent "successful" (possibly
  // empty) run.
  const sortedSubstantive = [...substantiveRuns].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  const lastSubstantiveRunAt = sortedSubstantive[0]?.startedAt || null;
  const freshnessHours = lastSubstantiveRunAt ? round((Date.now() - new Date(lastSubstantiveRunAt).getTime()) / (60 * 60 * 1000), 1) : null;

  // Completeness: of items actually fetched, what fraction survived
  // dedup/persistence — a real signal distinct from availability or
  // data quality (a provider can be available, return real items, and
  // still have most of them rejected downstream).
  const runsWithFetched = reachableRuns.filter((run) => run.itemsFetched > 0);
  const completeness = runsWithFetched.length
    ? round((runsWithFetched.reduce((sum, run) => sum + Math.min(run.itemsPersisted / run.itemsFetched, 1), 0) / runsWithFetched.length) * 100)
    : null;

  return { availability, dataQuality, freshness: freshnessHours, completeness, lastSubstantiveRunAt, totalRuns: runs.length };
}

async function getProviderQuality(providerId) {
  const provider = providerRegistry.getProvider(providerId);
  if (!provider) return null;
  const runs = await providerRunLogRepository.getAllRunsForProvider(providerId);
  return { providerId, ...computeQualityForRuns(runs) };
}

async function getAllProviderQuality() {
  const providers = providerRegistry.listProviders();
  return Promise.all(providers.map((provider) => getProviderQuality(provider.providerId)));
}

module.exports = { getProviderQuality, getAllProviderQuality, computeQualityForRuns };
