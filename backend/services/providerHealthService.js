const providerRegistry = require("./providers/providerRegistry");
const providerRunLogRepository = require("./providerRunLogRepository");

function summarizeRuns(runs) {
  if (!runs.length) {
    return { lastRunAt: null, lastStatus: null, successRate: null, lastRunFetchedItems: null, lastRunPersistedItems: null, dataState: "NO_RUN_HISTORY" };
  }
  const successCount = runs.filter((run) => run.status === "SUCCESS").length;
  const latest = runs[0];
  const lastRunFetchedItems = Number(latest.itemsFetched || 0);
  const lastRunPersistedItems = Number(latest.itemsPersisted || 0);
  return {
    lastRunAt: latest.startedAt,
    lastStatus: latest.status,
    successRate: Math.round((successCount / runs.length) * 100),
    lastRunFetchedItems,
    lastRunPersistedItems,
    // A completed request with zero items means the transport completed —
    // not that this source supplied usable intelligence. Keep those truths
    // separate so the product never paints an empty stub as "live data".
    dataState: latest.status === "SUCCESS" && lastRunFetchedItems === 0 ? "NO_DATA" : latest.status === "SUCCESS" ? "DATA_RECEIVED" : "RUN_FAILED",
  };
}

/**
 * One row per registered provider, whether or not it has ever run — a
 * provider with no run history yet is honestly reported as such, not
 * omitted or fabricated as healthy.
 */
async function getHealthSummary() {
  const providers = providerRegistry.listProviders();
  return Promise.all(
    providers.map(async (provider) => {
      const runs = await providerRunLogRepository.getRecentRunsForProvider(provider.providerId, 10);
      return {
        providerId: provider.providerId,
        label: provider.label,
        sourceType: provider.sourceType,
        ...summarizeRuns(runs),
      };
    })
  );
}

async function getHealthForProvider(providerId) {
  const provider = providerRegistry.getProvider(providerId);
  if (!provider) return null;
  const runs = await providerRunLogRepository.getRecentRunsForProvider(providerId, 10);
  return {
    providerId: provider.providerId,
    label: provider.label,
    sourceType: provider.sourceType,
    recentRuns: runs,
    ...summarizeRuns(runs),
  };
}

module.exports = { getHealthSummary, getHealthForProvider };
