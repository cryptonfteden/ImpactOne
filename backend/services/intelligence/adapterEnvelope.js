// Sprint 37 Priority 3 — Source Adapter Foundation.
//
// Every new source adapter (Finviz, TipRanks, Zacks, SPDR, CFTC COT,
// CoinGlass, options flow, technical analysis, X/social) wraps its output
// in this shape before it's used anywhere else — the required fields the
// mission names for "every adapter": status, source timestamp, retrieval
// timestamp, symbol/market scope, raw signal, normalized signal, evidence
// strength, provenance, freshness, error state, rate-limit state.
//
// This is a presentation/normalization layer ON TOP of the existing
// provider framework (baseProviderContract/eventEnvelope), not a
// replacement for it — an adapter can still feed providerIngestionService
// through its own fetch(), and separately expose this richer status
// envelope for the console and the evidence matrix, which need more detail
// than a CanonicalEvent row alone carries (e.g. rate-limit state).
const ADAPTER_STATUS = Object.freeze({
  LIVE: "LIVE", // real network call to the real external source succeeded
  DEGRADED: "DEGRADED", // real source reachable but returned partial/stale data
  FIXTURE: "FIXTURE", // deterministic sample data, clearly labeled as such
  DISABLED: "DISABLED", // adapter exists but is intentionally turned off
  UNCONFIGURED: "UNCONFIGURED", // adapter exists but lacks required credentials/access
  ERROR: "ERROR", // a real call was attempted and failed
});

function buildAdapterResult({
  providerId,
  status,
  scope,
  sourceTimestamp = null,
  rawSignal = null,
  normalizedSignal = null,
  evidenceStrength = null,
  provenance,
  errorState = null,
  rateLimitState = null,
  externalRequirement = null,
} = {}) {
  if (!providerId || typeof providerId !== "string") {
    throw new Error("buildAdapterResult requires a providerId");
  }
  if (!Object.values(ADAPTER_STATUS).includes(status)) {
    throw new Error(`buildAdapterResult received an unknown status: ${status}`);
  }

  const retrievalTimestamp = new Date().toISOString();
  const freshnessMs = sourceTimestamp ? Date.now() - new Date(sourceTimestamp).getTime() : null;

  return {
    providerId,
    status,
    scope: scope || null,
    sourceTimestamp,
    retrievalTimestamp,
    freshnessMs: Number.isFinite(freshnessMs) ? freshnessMs : null,
    rawSignal,
    normalizedSignal,
    // Sprint 37 — a 0-100 scale, never a naked confidence score: how much
    // weight this single adapter's output deserves given its status alone
    // (a FIXTURE or UNCONFIGURED adapter can never claim real evidence
    // strength, regardless of how confident its sample data looks).
    evidenceStrength: [ADAPTER_STATUS.LIVE, ADAPTER_STATUS.DEGRADED].includes(status)
      ? evidenceStrength
      : 0,
    provenance: provenance || { providerId, status },
    errorState,
    rateLimitState,
    // Sprint 37 — only populated for UNCONFIGURED/DISABLED, so the console
    // and any downstream consumer can show exactly what's missing rather
    // than a generic "not available."
    externalRequirement,
  };
}

module.exports = { ADAPTER_STATUS, buildAdapterResult };
