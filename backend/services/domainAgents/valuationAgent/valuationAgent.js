// Phase VALUATION-AGENT-001 — "Build the Valuation Intelligence Agent."
// This module is the reusable analysis engine, composing every piece
// this phase's approved research documents (VALUATION_RESEARCH.md,
// VALUATION_SCORING_MODEL.md, FAIR_VALUE_METHODOLOGY.md) describe.
// backend/services/agentOrchestrator/agents/valuationAgent.js is the
// thin adapter wiring it into the generic Agent interface — the same
// engine-vs-adapter split OPTIONS-AGENT-001/EARNINGS-AGENT-001 used.
const { createFinnhubValuationDataProvider } = require("./valuationDataProvider");
const { createBroadMarketPeerGroupProvider, createDamodaranPeerGroupProvider } = require("./peerGroupProvider");
const { determineApplicableMethods } = require("./negativeEarningsHandler");
const { computeImpliedPrices } = require("./impliedPriceCalculator");
const { getProfileWeights } = require("./profileWeighting");
const { combineImpliedPrices, computeDiscountToFairValue } = require("./fairValueComposer");
const { computeValuationConfidence } = require("./confidenceModel");
const { classifyZones } = require("./zoneClassifier");
const { buildSupportingMetrics } = require("./supportingMetrics");
const { buildAiSummary } = require("./aiSummary");

const defaultProvider = createFinnhubValuationDataProvider();
const defaultPeerProvider = createDamodaranPeerGroupProvider();

function buildValuationExplanation(metrics, report) {
  const pe = metrics.directRatios?.pe;
  return {
    trailingPe: Number.isFinite(pe) ? pe : null,
    pePlainLanguage: Number.isFinite(pe)
      ? `The market currently pays about $${pe.toFixed(1)} for each $1 of trailing annual earnings.`
      : "A verified trailing P/E ratio is not available.",
    earningsGrowthYoY: Number.isFinite(metrics.epsGrowthYoY) ? metrics.epsGrowthYoY : null,
    priceFitScore: report.signalEligible && Number.isFinite(report.discountToFairValue)
      ? Math.max(0, Math.min(10, Math.round((5 + report.discountToFairValue * 10) * 10) / 10))
      : null,
    priceFitMeaning: report.signalEligible
      ? "0 means expensive versus verified peers; 10 means a large verified discount."
      : "No score is shown until a current, verified sector peer group supports the comparison.",
  };
}

const MINIMUM_METHOD_AGREEMENT_SCORE = 25;

function assessDataQuality(metrics, sectorReference, contributingMethods, confidence, methodAgreementScore) {
  const verifiedPeerSource = sectorReference.source === "sector-peer-group" && sectorReference.peerGroupSize >= 5;
  const methodsAgree = Number.isFinite(methodAgreementScore) && methodAgreementScore >= MINIMUM_METHOD_AGREEMENT_SCORE;
  const signalEligible = verifiedPeerSource && contributingMethods.length >= 2 && confidence >= 40 && methodsAgree && Number.isFinite(metrics.price);
  return {
    source: metrics.sourceProvider || "Unknown",
    peerSource: sectorReference.source,
    peerSourceProvider: sectorReference.sourceProvider || null,
    peerSourceUrl: sectorReference.sourceUrl || null,
    peerSourceAsOf: sectorReference.sourceAsOf || null,
    matchedIndustries: sectorReference.matchedIndustries || [],
    peerGroupSize: sectorReference.peerGroupSize || 0,
    contributingMethodCount: contributingMethods.length,
    methodAgreementScore: Number.isFinite(methodAgreementScore) ? methodAgreementScore : null,
    methodsAgree,
    verifiedPeerSource,
    signalEligible,
    blockers: [
      ...(!verifiedPeerSource ? [sectorReference.unavailableReason || "A verified current sector peer group is not connected."] : []),
      ...(contributingMethods.length < 2 ? ["Fewer than two independent valuation methods contributed."] : []),
      ...(!methodsAgree ? [`The valuation methods disagree too widely (${Number.isFinite(methodAgreementScore) ? methodAgreementScore : 0}/100 agreement), so no fair-value label is shown.`] : []),
      ...(confidence < 40 ? [`Valuation confidence is only ${confidence}/100.`] : []),
    ],
  };
}

function buildUnavailableReport(symbol, asOf, reason, inputs) {
  const report = {
    symbol,
    generatedAt: asOf,
    dataAvailable: false,
    unavailableReason: reason,
    sourceProvider: inputs?.sourceProvider || null,
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
    signalEligible: false,
    dataQuality: { source: inputs?.sourceProvider || null, signalEligible: false, blockers: [reason] },
    valuationExplanation: null,
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
      sourceProvider: metrics.sourceProvider || null,
      primaryUnavailableReason: metrics.primaryUnavailableReason || null,
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
      signalEligible: false,
      dataQuality: {
        source: metrics.sourceProvider || null,
        peerSource: sectorReference.source,
        peerGroupSize: sectorReference.peerGroupSize || 0,
        contributingMethodCount: 0,
        verifiedPeerSource: false,
        signalEligible: false,
        blockers: [sectorReference.unavailableReason || "No verified peer-relative method could be computed."],
      },
      inputs: metrics,
    };
    report.valuationExplanation = buildValuationExplanation(metrics, report);
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
  const dataQuality = assessDataQuality(metrics, sectorReference, contributingMethods, valuationConfidence, components.methodAgreementScore);
  const reliableEstimate = dataQuality.signalEligible;
  const unreliableEstimateReason = reliableEstimate
    ? null
    : dataQuality.blockers.join(" ") || "The available valuation evidence is not reliable enough for a fair-value label.";

  const report = {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: true,
    unavailableReason: null,
    sourceProvider: metrics.sourceProvider || null,
    primaryUnavailableReason: metrics.primaryUnavailableReason || null,
    valuationStatus: reliableEstimate ? zones.valuationStatus : "UNKNOWN",
    estimatedFairValue: reliableEstimate ? fairValueEstimate : null,
    unavailableForFairValueReason: unreliableEstimateReason,
    fairValueRange: reliableEstimate ? fairValueRange : null,
    discountToFairValue: reliableEstimate ? discountToFairValue : null,
    attractiveRange: reliableEstimate ? zones.attractiveRange : false,
    attractiveRangeCaveat: reliableEstimate ? zones.attractiveRangeCaveat : null,
    highMarginOfSafety: reliableEstimate ? zones.highMarginOfSafety : false,
    indicativeCompositeForAudit: {
      estimate: fairValueEstimate,
      range: fairValueRange,
      discountToFairValue,
    },
    confidence: valuationConfidence,
    confidenceComponents: components,
    profile,
    sectorReferenceSource: sectorReference.source,
    sectorReferenceProvider: sectorReference.sourceProvider || null,
    sectorReferenceUrl: sectorReference.sourceUrl || null,
    sectorReferenceAsOf: sectorReference.sourceAsOf || null,
    supportingMetrics,
    excludedMethods,
    signalEligible: dataQuality.signalEligible,
    dataQuality,
    // Retained for auditability/debugging — every number above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
  };
  report.valuationExplanation = buildValuationExplanation(metrics, report);
  report.aiSummary = buildAiSummary(report);
  return report;
}

module.exports = {
  generateReport,
  createFinnhubValuationDataProvider,
  createBroadMarketPeerGroupProvider,
  createDamodaranPeerGroupProvider,
  assessDataQuality,
  buildValuationExplanation,
  MINIMUM_METHOD_AGREEMENT_SCORE,
};
