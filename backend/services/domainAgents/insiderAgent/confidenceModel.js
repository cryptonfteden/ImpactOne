// Phase INSIDER-AGENT-001 — overall "Confidence" (0-100), a disclosed,
// hand-set weighted formula (never a naive average): data availability
// (30 pts if EDGAR data was found at all), real sample size — both
// transaction count (up to 25 pts) and filings actually fetched (up to
// 15 pts) — a real cluster-corroboration bonus (15 pts, since multiple
// independent insiders agreeing is stronger evidence than one), and a
// real recency bonus based on how fresh the most recent real filing is.
const BASE_AVAILABLE = 30;
const MAX_SAMPLE_BONUS = 25;
const SAMPLE_CAP = 10; // transactions
const MAX_FILINGS_BONUS = 15;
const FILINGS_CAP = 10;
const CLUSTER_BONUS = 15;
const RECENT_30_DAY_BONUS = 15;
const RECENT_90_DAY_BONUS = 8;

function recencyBonus(mostRecentFilingDate, now) {
  if (!mostRecentFilingDate) return 0;
  const ageDays = (now.getTime() - new Date(`${mostRecentFilingDate}T00:00:00Z`).getTime()) / 86400000;
  if (ageDays <= 30) return RECENT_30_DAY_BONUS;
  if (ageDays <= 90) return RECENT_90_DAY_BONUS;
  return 0;
}

/**
 * @param {{ dataAvailable: boolean, filingsFetched: number, transactionCount: number, hasCluster: boolean, mostRecentFilingDate: string|null, now?: Date }} params
 * @returns {{ confidence: number, components: object }}
 */
function computeConfidence({ dataAvailable, filingsFetched, transactionCount, hasCluster, mostRecentFilingDate, now = new Date() }) {
  if (!dataAvailable) {
    return { confidence: 0, components: { base: 0, sampleBonus: 0, filingsBonus: 0, clusterBonus: 0, recencyBonus: 0 } };
  }

  const base = BASE_AVAILABLE;
  const sampleBonus = Math.round((Math.min(transactionCount, SAMPLE_CAP) / SAMPLE_CAP) * MAX_SAMPLE_BONUS);
  const filingsBonus = Math.round((Math.min(filingsFetched, FILINGS_CAP) / FILINGS_CAP) * MAX_FILINGS_BONUS);
  const clusterBonus = hasCluster ? CLUSTER_BONUS : 0;
  const recency = recencyBonus(mostRecentFilingDate, now);

  const confidence = Math.round(Math.max(0, Math.min(100, base + sampleBonus + filingsBonus + clusterBonus + recency)));

  return { confidence, components: { base, sampleBonus, filingsBonus, clusterBonus, recencyBonus: recency } };
}

module.exports = { computeConfidence };
