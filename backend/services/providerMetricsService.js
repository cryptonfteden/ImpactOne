const providerRegistry = require("./providers/providerRegistry");
const providerRunLogRepository = require("./providerRunLogRepository");

/**
 * Sprint 23A — distinct from providerHealthService (point-in-time status:
 * "is it working right now") this is an aggregated view over a provider's
 * FULL run history: "how has this provider performed overall." Read-only
 * aggregation over the existing ProviderRunLog table — no new persistence.
 */
function summarizeRuns(runs) {
  const totalRuns = runs.length;
  if (!totalRuns) {
    return {
      totalRuns: 0,
      totalItemsFetched: 0,
      totalItemsPersisted: 0,
      totalItemsDeduped: 0,
      dedupRate: null,
      errorRate: null,
      avgDurationMs: null,
      lastSuccessAt: null,
    };
  }

  let totalItemsFetched = 0;
  let totalItemsPersisted = 0;
  let totalItemsDeduped = 0;
  let errorCount = 0;
  let durationSum = 0;
  let durationCount = 0;
  let lastSuccessAt = null;

  for (const run of runs) {
    totalItemsFetched += run.itemsFetched;
    totalItemsPersisted += run.itemsPersisted;
    totalItemsDeduped += run.itemsDeduped;
    if (run.status === "FAILED" || run.status === "PARTIAL") errorCount += 1;
    if (Number.isFinite(run.durationMs)) {
      durationSum += run.durationMs;
      durationCount += 1;
    }
    if (run.status === "SUCCESS" && (!lastSuccessAt || run.startedAt > lastSuccessAt)) {
      lastSuccessAt = run.startedAt;
    }
  }

  const itemsSeen = totalItemsPersisted + totalItemsDeduped;

  return {
    totalRuns,
    totalItemsFetched,
    totalItemsPersisted,
    totalItemsDeduped,
    dedupRate: itemsSeen > 0 ? Math.round((totalItemsDeduped / itemsSeen) * 100) : null,
    errorRate: Math.round((errorCount / totalRuns) * 100),
    avgDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : null,
    lastSuccessAt,
  };
}

async function getMetricsForProvider(providerId) {
  const provider = providerRegistry.getProvider(providerId);
  if (!provider) return null;

  const runs = await providerRunLogRepository.getAllRunsForProvider(providerId);
  return { providerId, ...summarizeRuns(runs) };
}

module.exports = { getMetricsForProvider };
