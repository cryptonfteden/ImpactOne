const providerRegistry = require("./providers/providerRegistry");
const providerRunLogRepository = require("./providerRunLogRepository");

function summarizeRuns(runs) {
  if (!runs.length) {
    return { lastRunAt: null, lastStatus: null, successRate: null };
  }
  const successCount = runs.filter((run) => run.status === "SUCCESS").length;
  return {
    lastRunAt: runs[0].startedAt,
    lastStatus: runs[0].status,
    successRate: Math.round((successCount / runs.length) * 100),
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
