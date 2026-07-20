// Sprint 39 Priority 8 — Source Provenance.
//
// Every visible claim must expose where it came from. This file never
// invents a provider, timestamp, or status — every field is read directly
// off the evidence matrix row it's given. It never imports a provider or
// evidenceMatrixService itself; it only formats a matrix it's handed.
function statusFor(row) {
  if (row.stance === "UNAVAILABLE") return "UNAVAILABLE";
  if (row.isFixture) return "FIXTURE";
  return "LIVE";
}

function freshnessFor(row) {
  if (row.stance === "UNAVAILABLE") return "UNKNOWN";
  if (row.isStale) return "STALE";
  return row.newestSource ? "CURRENT" : "UNKNOWN";
}

/**
 * One provenance record per evidence-matrix category — deterministic
 * evidenceId so the same (symbol, category, generatedAt) always produces
 * the same id, never a random/invented one.
 */
function buildProvenance(evidenceMatrix) {
  return evidenceMatrix.categories.map((row) => ({
    category: row.category,
    evidenceId: `${evidenceMatrix.symbol}:${row.category}:${evidenceMatrix.generatedAt}`,
    providerTimestamp: row.newestSource || null,
    retrievalTimestamp: evidenceMatrix.generatedAt,
    freshness: freshnessFor(row),
    status: statusFor(row),
    sourceCount: row.sourceCount,
  }));
}

module.exports = { buildProvenance, statusFor, freshnessFor };
