// Phase VALUATION-AGENT-001 — "Build the Valuation Intelligence Agent."
// This module is the reusable analysis engine, composing every piece
// this phase's approved research documents (VALUATION_RESEARCH.md,
// VALUATION_SCORING_MODEL.md, FAIR_VALUE_METHODOLOGY.md) describe.
// backend/services/agentOrchestrator/agents/valuationAgent.js is the
// thin adapter wiring it into the generic Agent interface — the same
// engine-vs-adapter split OPTIONS-AGENT-001/EARNINGS-AGENT-001 used.
const { createFinnhubValuationDataProvider } = require("./valuationDataProvider");
const { createBroadMarketPeerGroupProvider } = require("./peerGroupProvider");
const { determineApplicableMethods } = require("./negativeEarningsHandler");
const { computeImpliedPrices } = require("./impliedPriceCalculator");
const { getProfileWeights } = require("./profileWeighting");
const { combineImpliedPrices, computeDiscountToFairValue } = require("./fairValueComposer");
const { computeValuationConfidence } = require("./confidenceModel");
const { classifyZones } = require("./zoneClassifier");
const { buildSupportingMetrics } = require("./supportingMetrics");
const { buildAiSummary } = require("./aiSummary");

const defaultProvider = createFinnhubValuationDataProvider();
const defaultPeerProvider = createBroadMarketPeerGroupProvider();

function buildUnavailableReport(symbol, asOf, reason, inputs) {
  const report = {
    symbol,
    generatedAt: asOf,
    dataAvailable: false,
    unavailableReason: reason,
    valuationStatus: "UNKNOWN",
    estimatedFairValue: null,
    unavailableForFairValueReason: null,
    fairValueRange: null,
    discountToFairValue: null,
    attractiveRange: false,
    attractiveRangeCaveat: null,
    highMarginOfSafety: false,
    confidence: 0,
    confidenceComponents: null,
    supportingMetrics: [],
    excludedMethods: [],
    inputs,
  };
  report.aiSummary = buildAiSummary(report);
  return report;
}

/**
 * Generates the full normalized Valuation Intelligence report for one
 * symbol. `provider`/`peerProvider` default to the real, Finnhub-backed
 * and broad-market-reference implementations respectively, but accept
 * any object implementing the documented interfaces — the seam a future
 * SEC EDGAR/Alpha Vantage/Damodaran/live-peer-group provider plugs into
 * without any other line in this file changing.
 */
async function generateReport(symbol, { provider = defaultProvider, peerProvider = defaultPeerProvider } = {}) {
  const metrics = await provider.getSymbolValuation(symbol);

  if (!metrics.dataAvailable) {
    return buildUnavailableReport(symbol, metrics.asOf, metrics.unavailableReason, metrics);
  }

  const sectorReference = await peerProvider.getSectorReference(metrics.industry);
  const { applicableMethods } = determineApplicableMethods(metrics);
  const { impliedPrices, excludedMethods } = computeImpliedPrices(metrics, sectorReference);

  const { profile, weights } = getProfileWeights(metrics);
  const { fairValueEstimate, fairValueRange, contributingMethods } = combineImpliedPrices(impliedPrices, weights);

  if (fairValueEstimate === null) {
    // VALUATION_SCORING_MODEL.md §2.3 — a genuinely unresolvable case:
    // no usable method survived exclusion/weighting. Honest, explicit,
    // never a forced estimate from whatever partial data exists.
    const report = {
      symbol: metrics.symbol,
      generatedAt: metrics.asOf,
      dataAvailable: true,
      unavailableReason: null,
      valuationStatus: "UNKNOWN",
      estimatedFairValue: null,
      unavailableForFairValueReason:
        "No valuation method could be honestly computed for this company today — it does not have enough usable revenue, cash-flow, book-value, or earnings data (and/or no sector-relative reference multiple was applicable) to support a fair-value estimate.",
      fairValueRange: null,
      discountToFairValue: null,
      attractiveRange: false,
      attractiveRangeCaveat: null,
      highMarginOfSafety: false,
      confidence: 0,
      confidenceComponents: null,
      supportingMetrics: [],
      excludedMethods,
      inputs: metrics,
    };
    report.aiSummary = buildAiSummary(report);
    return report;
  }

  const discountToFairValue = computeDiscountToFairValue(fairValueEstimate, metrics.price);

  const { valuationConfidence, components } = computeValuationConfidence({
    usableMethodCount: contributingMethods.length,
    totalApplicableMethodCount: Math.max(applicableMethods.length, 1),
    impliedPrices: impliedPrices.map((entry) => entry.impliedPrice),
    peerGroupSize: sectorReference.peerGroupSize,
    earningsQualityFlags: { negativeEarningsFlag: !Number.isFinite(metrics.eps.trailing) || metrics.eps.trailing <= 0 },
  });

  const zones = classifyZones({
    discountToFairValue,
    valuationConfidence,
    methodAgreementScore: components.methodAgreementScore,
    roic: metrics.roic,
    wacc: sectorReference.wacc,
  });

  const supportingMetrics = buildSupportingMetrics(contributingMethods);

  const report = {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: true,
    unavailableReason: null,
    valuationStatus: zones.valuationStatus,
    estimatedFairValue: fairValueEstimate,
    unavailableForFairValueReason: null,
    fairValueRange,
    discountToFairValue,
    attractiveRange: zones.attractiveRange,
    attractiveRangeCaveat: zones.attractiveRangeCaveat,
    highMarginOfSafety: zones.highMarginOfSafety,
    confidence: valuationConfidence,
    confidenceComponents: components,
    profile,
    sectorReferenceSource: sectorReference.source,
    supportingMetrics,
    excludedMethods,
    // Retained for auditability/debugging — every number above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
  };
  report.aiSummary = buildAiSummary(report);
  return report;
}

module.exports = { generateReport, createFinnhubValuationDataProvider, createBroadMarketPeerGroupProvider };
