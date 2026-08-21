// Phase AI-ENGINE-001.1 — Unusual Options Agent foundation. The service
// layer required by OPTIONS_AGENT_API.md — one function per contract
// read endpoint, plus the ingestion/detection orchestration
// (OPTIONS_AGENT_ARCHITECTURE.md §4). No Express route/controller is
// wired to these yet in this phase (scope explicitly limited to
// provider/normalization/detection/governance/persistence/service-layer —
// see OPTIONS_AGENT_IMPLEMENTATION_REPORT.md for the deferred-scope
// disclosure); every function here is directly callable/testable and
// already shaped to match the approved API contract's response bodies.
const optionsFlowProvider = require("../providers/definitions/optionsFlowProvider");
const providerHealthService = require("../providerHealthService");
const providerRunLogRepository = require("../providerRunLogRepository");
const normalizer = require("./optionsFlowNormalizer");
const aggregator = require("./optionsFlowAggregator");
const detectors = require("./optionsSignalDetectors");
const confidence = require("./optionsAnomalyConfidence");
const { buildOptionsSignalExplanation } = require("./optionsSignalExplanation");
const { sanitizeOptionsSignal } = require("./optionsSignalGovernance");
const repository = require("./optionsFlowRepository");
const { createInternalOptionsDataProvider } = require("../domainAgents/optionsFlowAgent/optionsDataProvider");
const optionsActivityProvider = createInternalOptionsDataProvider();

const NOT_CONNECTED_MESSAGE = "Options flow provider is not connected yet.";

/**
 * GET /status — always safe, never requires identity (API contract §3).
 */
async function getStatus() {
  const connected = optionsFlowProvider.isConfigured();
  const runs = await providerRunLogRepository.getRecentRunsForProvider("optionsFlow", 1);
  return {
    connected,
    provider: connected ? optionsFlowProvider.providerId : "pending",
    message: connected ? null : NOT_CONNECTED_MESSAGE,
    endOfDayFallback: {
      available: true,
      provider: "OCC Volume Query",
      scope: "Official customer Call/Put contract volume by symbol",
      freshness: "end-of-day",
      excludes: ["sweeps", "blocks", "aggressor side", "IV", "Greeks", "gamma exposure"],
    },
    trackedSymbolCount: 0, // real scan-universe wiring is a future phase per architecture §10 — honestly 0, never guessed
    lastIngestionRunAt: runs[0]?.startedAt || null,
    lastOiConfirmationRunAt: null, // no OI-confirmation scheduler exists yet this phase — see implementation report
  };
}

/**
 * The core detection pipeline (architecture §4 steps 1-7), run for one
 * batch of already-fetched raw provider records. Callable directly
 * (ingestion scheduling itself is out of scope for this phase — see
 * OPTIONS_AGENT_IMPLEMENTATION_REPORT.md).
 *
 * `baselineLookup(symbol, expiry, strike, optionType)` and
 * `skewBaselineLookup(symbol)` are optional injected functions returning
 * real historical baseline stats — when omitted (the honest default,
 * since this engine has no accumulated history yet), every detector
 * correctly reports `insufficientBaselineHistory: true` rather than a
 * fabricated multiple/Z-score.
 */
async function ingestAndDetect(rawRecords = [], { baselineLookup = null, skewBaselineLookup = null, now = new Date() } = {}) {
  const { validPrints, rejected, duplicateCount } = normalizer.normalizeBatch(rawRecords);

  const mostRecentTimestamp = validPrints.reduce((latest, print) => (!latest || print.tradeTimestamp > latest ? print.tradeTimestamp : latest), null);
  const freshness = normalizer.computeDataFreshness(mostRecentTimestamp, { now });

  const persistResult = validPrints.length ? await repository.createPrints(validPrints) : { created: 0, skippedExisting: 0 };

  const signals = [];
  const contractGroups = aggregator.aggregateByContract(validPrints);
  const symbolCallPutVolumes = aggregator.aggregateSymbolCallPutVolume(validPrints);
  const skewBySymbol = new Map();
  for (const entry of symbolCallPutVolumes) {
    const baseline = skewBaselineLookup ? skewBaselineLookup(entry.symbol) : null;
    const skew = detectors.detectCallPutSkew({
      callVolume: entry.callVolume,
      putVolume: entry.putVolume,
      baselineRatioMean: baseline?.mean ?? null,
      baselineRatioStdDev: baseline?.stdDev ?? null,
    });
    if (skew) skewBySymbol.set(entry.symbol, skew);
  }

  for (const group of contractGroups) {
    const baseline = baselineLookup ? baselineLookup(group.symbol, group.expiry, group.strike, group.optionType) : null;
    const volumeSignal = detectors.detectVolumeBaseline({ totalVolume: group.totalVolume, baselineVolume: baseline?.baselineVolume ?? null });
    const sweepSignal = detectors.detectSweep(group.prints);
    const blockSignal = detectors.detectBlock(group.prints);
    const skewSignal = skewBySymbol.get(group.symbol) || null;

    const hasVolumeSpike = Boolean(volumeSignal?.signalType === "VOLUME_SPIKE");
    const hasSweep = Boolean(sweepSignal);
    const hasBlock = Boolean(blockSignal);

    if (!hasVolumeSpike && !hasSweep && !hasBlock) {
      continue; // nothing anomalous in this contract's window — no signal, not a fabricated low-confidence one
    }

    const primarySignalType = hasSweep ? "SWEEP" : hasBlock ? "BLOCK_TRADE" : "VOLUME_SPIKE";
    const aggressorSide = sweepSignal?.aggressorSide || blockSignal?.aggressorSide || "UNKNOWN";
    const oiConfirmationStatus = "PENDING"; // always PENDING at detection time (architecture §5e) — confirmed later, never same-day

    const anomalyScore = confidence.computeAnomalyScore({
      volumeMultiple: volumeSignal?.volumeMultiple ?? null,
      hasSweep,
      hasBlock,
      hasVolumeSpike,
      oiConfirmationStatus,
      hasSkewSignal: Boolean(skewSignal),
      skewDirection: skewSignal?.direction || null,
      tradeDirection: aggressorSide === "UNKNOWN" ? null : aggressorSide,
    });

    if (anomalyScore === null) continue; // no computable evidence — never fabricated

    const explanation = buildOptionsSignalExplanation({
      symbol: group.symbol,
      optionType: group.optionType,
      strike: group.strike,
      expiry: group.expiry,
      signalType: primarySignalType,
      volumeMultiple: volumeSignal?.volumeMultiple ?? null,
      notionalValue: group.notionalValue,
      sweepExchangeCount: sweepSignal?.sweepExchangeCount ?? null,
      oiConfirmationStatus,
      putCallSkewZScore: skewSignal?.putCallSkewZScore ?? null,
      aggressorSide,
    });

    const signal = sanitizeOptionsSignal({
      symbol: group.symbol,
      expiry: group.expiry,
      strike: group.strike,
      optionType: group.optionType,
      signalType: primarySignalType,
      aggressorSide,
      totalVolume: group.totalVolume,
      baselineVolume: baseline?.baselineVolume ?? null,
      volumeMultiple: volumeSignal?.volumeMultiple ?? null,
      notionalValue: group.notionalValue,
      sweepExchangeCount: sweepSignal?.sweepExchangeCount ?? null,
      largestSinglePrintSize: blockSignal?.largestSinglePrintSize ?? group.largestSinglePrintSize ?? null,
      openInterestPriorSession: null,
      openInterestDelta: null,
      oiConfirmationStatus,
      putCallSkewZScore: skewSignal?.putCallSkewZScore ?? null,
      anomalyScore,
      explanation,
      evidenceSnapshot: { volumeSignal, sweepSignal, blockSignal, skewSignal, printCount: group.prints.length },
      methodologyVersion: confidence.METHODOLOGY_VERSION,
      sourceProviderId: optionsFlowProvider.providerId,
    });

    // Append-only persistence (data model doc §2/§4) — the durable
    // evidence record. `label` is a governance-view-only field (added by
    // sanitizeOptionsSignal), never written to the DB row itself.
    const { label: _label, ...persistable } = signal;
    const created = await repository.createSignal(persistable);
    signals.push(sanitizeOptionsSignal(created));
  }

  return {
    providerStatus: optionsFlowProvider.isConfigured() ? "connected" : "not_connected",
    freshness,
    printsIngested: persistResult.created,
    printsSkippedExisting: persistResult.skippedExisting,
    printsRejected: rejected.length,
    rejectedDetail: rejected,
    duplicatesDroppedInBatch: duplicateCount,
    signals,
  };
}

/**
 * GET /signals (API contract §3) — honestly empty, never a fabricated
 * placeholder, when the provider isn't connected.
 */
async function listSignals({ symbol, signalType, since, minAnomalyScore, limit } = {}) {
  if (!optionsFlowProvider.isConfigured()) {
    return { generatedAt: new Date().toISOString(), count: 0, signals: [], unavailableReason: NOT_CONNECTED_MESSAGE };
  }
  const rows = await repository.listSignals({ symbol, signalType, since, minAnomalyScore, limit });
  const signals = rows.map((row) => sanitizeOptionsSignal(row));
  return { generatedAt: new Date().toISOString(), count: signals.length, signals, unavailableReason: null };
}

/**
 * GET /signals/:signalId — a real 404 (distinct from the honest-empty-
 * array case above) when the id doesn't exist.
 */
async function getSignalById(signalId) {
  const row = await repository.getSignalById(signalId);
  if (!row) return null;
  return sanitizeOptionsSignal(row);
}

/**
 * GET /symbols/:symbol (API contract §3) — the composed per-symbol view.
 */
async function getSymbolView(symbol, { activityProvider = optionsActivityProvider } = {}) {
  if (!optionsFlowProvider.isConfigured()) {
    const metrics = await activityProvider.getSymbolMetrics(symbol);
    return {
      symbol,
      generatedAt: metrics.asOf,
      activeSignalCount: 0,
      highestAnomalyScore: null,
      recentSignals: [],
      unavailable: !metrics.dataAvailable,
      reason: metrics.dataAvailable ? null : metrics.unavailableReason,
      optionsActivity: metrics.dataAvailable ? {
        optionVolume: metrics.optionVolume,
        putCallRatio: metrics.putCallRatio,
        reportDate: metrics.reportDate,
        source: metrics.sourceProvider,
        sourceUrl: metrics.sourceUrl,
        freshness: metrics.dataFreshness,
        limitations: metrics.limitations,
      } : null,
      liveFlowUnavailableReason: NOT_CONNECTED_MESSAGE,
    };
  }
  const rows = await repository.listSignals({ symbol, limit: 50 });
  const recentSignals = rows.map((row) => sanitizeOptionsSignal(row));
  const highestAnomalyScore = recentSignals.length ? Math.max(...recentSignals.map((signal) => Number(signal.anomalyScore))) : null;
  return { symbol, generatedAt: new Date().toISOString(), activeSignalCount: recentSignals.length, highestAnomalyScore, recentSignals, unavailable: false, reason: null };
}

/**
 * The daily OI-confirmation pass (architecture §5e/§9) — callable
 * directly; no scheduler wires it automatically in this phase.
 * `lookupCurrentOi(signal)` must return `{ priorSessionOi, currentSessionOi }`
 * or `null` fields when genuinely unavailable — never guessed here.
 */
async function confirmPendingOpenInterest(sessionCutoff, lookupCurrentOi) {
  const pending = await repository.listPendingSignalsBefore(sessionCutoff);
  const results = [];
  for (const signal of pending) {
    const oi = (await lookupCurrentOi(signal)) || { priorSessionOi: null, currentSessionOi: null };
    const confirmation = detectors.detectOiConfirmation({ priorSessionOi: oi.priorSessionOi, currentSessionOi: oi.currentSessionOi });
    const updated = await repository.confirmOpenInterest(signal.id, confirmation);
    results.push(sanitizeOptionsSignal(updated));
  }
  return results;
}

/**
 * GET /providers/health (API contract §3, dev-console gated) — thin
 * wrapper around the existing provider health service plus this engine's
 * own detection-level health, distinct from raw fetch success (avoiding
 * the "false success" pattern the contract doc explicitly names).
 */
async function getProviderHealth() {
  const providerHealth = await providerHealthService.getHealthForProvider("optionsFlow");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentSignals = optionsFlowProvider.isConfigured() ? await repository.listSignals({ since, limit: 200 }) : [];
  return {
    providerHealth,
    detectionHealth: {
      signalsProducedLast24h: recentSignals.length,
      baselineBootstrapInProgress: true, // honest: no baseline-history accumulation mechanism exists yet in this foundation phase
      note: "100% provider fetch success does not by itself mean real anomalies are being found — see detectionHealth for the metric that actually matters.",
    },
  };
}

module.exports = {
  NOT_CONNECTED_MESSAGE,
  getStatus,
  ingestAndDetect,
  listSignals,
  getSignalById,
  getSymbolView,
  confirmPendingOpenInterest,
  getProviderHealth,
};
