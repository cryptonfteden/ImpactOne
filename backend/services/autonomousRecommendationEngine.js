// Sprint 16 Phase A — Autonomous Recommendation Engine.
//
// Advisory only. This module analyzes market events (via
// autonomousMarketService's already-cached overview) and real portfolio
// exposure (via portfolioEngineService's real position data), and persists
// Recommendation rows explaining what a user could do about it. It never
// imports portfolioEngineService.placeOrder or any portfolio-mutating
// repository function — there is no code path in this file that can place
// a trade.
const autonomousMarketService = require("./autonomousMarketService");
const portfolioEngineService = require("./portfolioEngineService");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const portfolioRiskMetrics = require("../utils/portfolioRiskMetrics");
const scenarioEngineService = require("./scenarioEngineService");
// Sprint 18A — Canonical Decision Architecture.
// Sprint 41 — Committee Unification: the ONE canonical committee (see
// SPRINT_41_REPORT.md). This replaces the retired investmentCommitteeService.js.
const intelligenceCommitteeService = require("./intelligenceCommittee/intelligenceCommitteeService");
const eventEnvelope = require("./eventEnvelope");
const scoringVocabulary = require("./scoringVocabulary");
const canonicalVerdict = require("./canonicalVerdict");
// Sprint 29 — Feedback Intelligence Layer, Priority 1 (Outcome Pipeline).
const worldMemoryRepository = require("./worldMemoryRepository");
const outcomeGradingService = require("./outcomeGradingService");
// Sprint 31 — Outcome Intelligence, Priority 4.
const outcomeIntelligenceService = require("./outcomeIntelligenceService");

// Above this sector weight (%), a held position's concentration risk can
// independently trigger a REDUCE recommendation even when the underlying
// AI score alone would say "Wait" — this is what makes the engine analyze
// portfolio exposure, not just repackage the existing opportunity list.
// Deliberately higher than dashboardMetrics' 25% risk-penalty floor, which
// is tuned for a continuous score, not a discrete action trigger.
const CONCENTRATION_OVERRIDE_THRESHOLD_PCT = 35;

// Sprint 16 Phase D — documented, transparent weights for the quality
// score rollup (requirement: "expose the score and its components").
const QUALITY_WEIGHTS = {
  sourceQuality: 0.15,
  evidenceFreshness: 0.15,
  portfolioRelevance: 0.2,
  evidenceAgreement: 0.2,
  dataCompleteness: 0.1,
  modelConfidence: 0.2,
};

function buildUniverse(heldSymbols = [], watchlistSymbols = []) {
  const merged = new Set([...heldSymbols, ...watchlistSymbols, ...autonomousMarketService.DEFAULT_WATCHLIST]);
  return Array.from(merged);
}

function normalizeSymbolList(values = []) {
  const normalized = (values || [])
    .map((value) => String(value || "").trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function findSectorWeightPct(allocationBySector, sector) {
  const entry = (allocationBySector || []).find((row) => row.name === sector);
  return entry ? Number(entry.pct || 0) : 0;
}

function computeSymbolRiskScore({ rankingItem, sectorWeightPct, macroRegime }) {
  const baseRisk = Number(rankingItem?.riskScore ?? 50);
  const concentrationPenalty = Math.max(0, sectorWeightPct - 25) * 0.6;
  const recessionPenalty = macroRegime?.recessionRisk === "high" ? 12 : macroRegime?.recessionRisk === "medium" ? 4 : 0;
  const inflationPenalty = macroRegime?.inflationPressure === "high" ? 8 : macroRegime?.inflationPressure === "moderate" ? 2 : 0;
  return portfolioRiskMetrics.clamp(Math.round(baseRisk * 0.7 + concentrationPenalty + recessionPenalty + inflationPenalty), 0, 100);
}

/**
 * Sprint 16 Phase C — a plain-language line explaining why a matched event
 * matters to this specific user, not just the market in general.
 */
function buildPersonalRelevance({ symbol, heldPosition, positionWeightPct, watchlistSymbols = [] }) {
  if (heldPosition) {
    return `Directly affects ${symbol} — ${Math.round(positionWeightPct)}% of your portfolio.`;
  }
  if (watchlistSymbols.includes(symbol)) {
    return `${symbol} is on your watchlist.`;
  }
  return `${symbol} is part of today's broader market scan.`;
}

// Sprint 16 Phase D — capped at 5 (was 3 through Phase C) so the
// explanation/scenario builders below have enough source material to do a
// real supporting-vs-opposing split, not just a short citation list.
function findMatchedEvents(feed, symbol, context = {}) {
  return (feed || [])
    .filter((item) => (item.relatedTickers || []).includes(symbol) || (item.affectedAssets || []).includes(symbol))
    .slice(0, 5)
    .map((item) => ({
      headline: item.headline,
      importanceScore: item.importanceScore,
      whyItMatters: item.whyItMatters,
      sourceUrl: item.sourceUrl || null,
      sourceName: item.sourceName || null,
      publishedAt: item.publishedAt || null,
      confidence: item.confidence ?? null,
      reliability: item.reliability || null,
      impactType: item.impactType || "neutral",
      riskLevel: item.riskLevel || "low",
      timeHorizon: item.timeHorizon || null,
      counterarguments: item.explainability?.counterarguments || [],
      invalidationSignals: item.explainability?.invalidationSignals || [],
      personalRelevance: buildPersonalRelevance({ symbol, ...context }),
    }));
}

// Sprint 16 Phase D — splits matched events into ones that support the
// recommended action vs. ones that argue against it, using each event's
// already-computed impactType. Neutral events land in neither bucket
// rather than inflating either side.
function splitMatchedEvents({ matchedEvents, action }) {
  const favorableType = action === "BUY" ? "opportunity" : "risk";
  const unfavorableType = action === "BUY" ? "risk" : "opportunity";

  return {
    supporting: matchedEvents.filter((event) => event.impactType === favorableType),
    opposing: matchedEvents.filter((event) => event.impactType === unfavorableType),
  };
}

function buildThesis({ symbol, action, rankingItem }) {
  const verb = action === "BUY" ? "Buy" : action === "REDUCE" ? "Reduce" : "Exit";
  const driver = rankingItem.primaryDriver && rankingItem.primaryDriver !== "No dominant event"
    ? rankingItem.primaryDriver
    : rankingItem.explanation;
  return `${verb} ${symbol}: ${driver}`;
}

function buildKeyRisks({ opposing, sectorWeightPct, concentrationTriggered, macroRegime }) {
  const risks = opposing
    .filter((event) => event.riskLevel === "high")
    .map((event) => event.headline);

  if (concentrationTriggered) {
    risks.push(`Sector concentration: ${Math.round(sectorWeightPct)}% of portfolio in this sector.`);
  }
  if (macroRegime?.recessionRisk === "high") {
    risks.push("Elevated macro recession risk.");
  }
  if (macroRegime?.inflationPressure === "high") {
    risks.push("Elevated inflation pressure.");
  }

  return Array.from(new Set(risks));
}

function buildInvalidationConditions(matchedEvents) {
  const all = matchedEvents.flatMap((event) => event.invalidationSignals || []);
  return Array.from(new Set(all)).slice(0, 5);
}

function buildConfidenceFactors(rankingItem) {
  const drivers = [];
  const reducers = [];

  if (rankingItem.opportunityScore >= 70) drivers.push(`Strong opportunity score (${rankingItem.opportunityScore}/100).`);
  if (rankingItem.riskScore <= 40) drivers.push(`Low underlying risk score (${rankingItem.riskScore}/100).`);
  else if (rankingItem.riskScore >= 70) reducers.push(`Elevated underlying risk score (${rankingItem.riskScore}/100).`);
  if (rankingItem.momentum >= 65) drivers.push(`Positive price momentum (${rankingItem.momentum}/100).`);
  else if (rankingItem.momentum <= 35) reducers.push(`Weak price momentum (${rankingItem.momentum}/100).`);
  if (rankingItem.institutionalActivity >= 65) drivers.push("Favorable institutional positioning.");
  if (rankingItem.predictionMarketSignal >= 65) drivers.push("Prediction markets lean favorable.");
  else if (rankingItem.predictionMarketSignal <= 35) reducers.push("Prediction markets lean unfavorable.");
  if (rankingItem.macroExposure >= 70) reducers.push(`High macro exposure to broader conditions (${rankingItem.macroExposure}/100).`);

  if (!drivers.length) drivers.push("Signal strength alone is the primary basis for this recommendation.");
  if (!reducers.length) reducers.push("No material confidence reducers detected this run.");

  return { confidenceDrivers: drivers, confidenceReducers: reducers };
}

/**
 * Sprint 16 Phase D — requirement #1. Aggregates data `processEvent`
 * already computes per matched event (impactType, riskLevel,
 * counterarguments, invalidationSignals) into one structured,
 * challengeable explanation, rather than generating new analysis.
 */
function buildExplanation({ symbol, action, rankingItem, matchedEvents, heldPosition, positionWeightPct, watchlistSymbols, portfolioAction, sectorWeightPct, concentrationTriggered, macroRegime, committeeDebate }) {
  const { supporting, opposing } = splitMatchedEvents({ matchedEvents, action });
  const { confidenceDrivers, confidenceReducers } = buildConfidenceFactors(rankingItem);

  return {
    thesis: buildThesis({ symbol, action, rankingItem }),
    supportingEvidence: supporting.map((event) => ({ headline: event.headline, whyItMatters: event.whyItMatters, sourceName: event.sourceName, sourceUrl: event.sourceUrl })),
    opposingEvidence: opposing.map((event) => ({ headline: event.headline, whyItMatters: event.whyItMatters, sourceName: event.sourceName, sourceUrl: event.sourceUrl, counterarguments: event.counterarguments })),
    keyRisks: buildKeyRisks({ opposing, sectorWeightPct, concentrationTriggered, macroRegime }),
    invalidationConditions: buildInvalidationConditions(matchedEvents),
    timeHorizon: portfolioAction.timeHorizon,
    affectedPositions: heldPosition
      ? [{ symbol, quantity: heldPosition.quantity, marketValue: heldPosition.marketValue, weightPct: positionWeightPct, sector: heldPosition.sector }]
      : [],
    affectedWatchlistSymbols: watchlistSymbols.includes(symbol) ? [symbol] : [],
    confidenceDrivers,
    confidenceReducers,
    // Sprint 18A — the Committee's debate as explanatory context only.
    // Never a second verdict: committeeDebate is sanitized (see
    // canonicalVerdict.sanitizeCommitteeDebate) so it structurally cannot
    // carry an action/decision/verdict field, on top of the unified
    // committee (Sprint 41, intelligenceCommitteeService) already never
    // producing one (isVerdict: false throughout its own output).
    committeeDebate: canonicalVerdict.sanitizeCommitteeDebate(committeeDebate),
  };
}

// Sprint 16 Phase D — reuses the existing conviction-tiered
// buildPortfolioAction (Phase A) three times with a score offset, rather
// than a new price-impact formula: bull = conviction+15, base = actual
// conviction, bear = conviction-15.
function buildScenarioPriceImpacts(convictionScore) {
  const bullScore = portfolioRiskMetrics.clamp(convictionScore + 15, 0, 100);
  const bearScore = portfolioRiskMetrics.clamp(convictionScore - 15, 0, 100);

  return {
    bull: autonomousMarketService.buildPortfolioAction({ convictionScore: bullScore }).expectedUpside,
    base: autonomousMarketService.buildPortfolioAction({ convictionScore }).expectedUpside,
    bear: autonomousMarketService.buildPortfolioAction({ convictionScore: bearScore }).stopLevel,
  };
}

function parseMidpointPercent(rangeText) {
  const matches = String(rangeText || "").match(/-?\d+(\.\d+)?/g);
  if (!matches || !matches.length) {
    return null;
  }
  const numbers = matches.map(Number);
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

/**
 * Only returns a number when the price-impact text is actually numeric
 * (e.g. "10-16%") — tiers like "Wait for confirmation" have no midpoint to
 * extract, so this returns null rather than guessing.
 */
function buildPortfolioImpact({ priceImpactText, positionWeightPct, heldPosition }) {
  if (!heldPosition) {
    return null;
  }
  const midpoint = parseMidpointPercent(priceImpactText);
  if (midpoint === null) {
    return null;
  }
  const impactPct = Number(((midpoint * positionWeightPct) / 100).toFixed(2));
  return `${impactPct >= 0 ? "+" : ""}${impactPct}% of total portfolio value (approx.)`;
}

/**
 * Sprint 16 Phase D — requirement #2. Reuses the existing
 * scenarioEngineService.getScenario (theme-matched bull/base/bear
 * narratives + probabilities + sector rotation, previously unused by the
 * recommendation engine) and layers on catalysts/risks/invalidation drawn
 * from the same matched-event split used for the explanation.
 */
function buildScenarios({ symbol, rankingItem, action, matchedEvents, heldPosition, positionWeightPct, convictionScore }) {
  const base = scenarioEngineService.getScenario(rankingItem.primaryDriver || rankingItem.explanation || symbol);
  const priceImpacts = buildScenarioPriceImpacts(convictionScore);
  const { supporting, opposing } = splitMatchedEvents({ matchedEvents, action });
  const invalidationConditions = buildInvalidationConditions(matchedEvents);

  const catalysts = supporting.map((event) => event.headline).slice(0, 3);
  const risks = opposing.map((event) => event.headline).slice(0, 3);

  return [
    {
      case: "bull",
      narrative: base.bullCase.narrative,
      probability: base.bullCase.probability,
      priceImpact: priceImpacts.bull,
      portfolioImpact: buildPortfolioImpact({ priceImpactText: priceImpacts.bull, positionWeightPct, heldPosition }),
      catalysts: catalysts.length ? catalysts : [base.expectedMarketReaction],
      risks: risks.slice(0, 2),
      invalidationTrigger: invalidationConditions[0] || "Supporting data fails to confirm the first-order move.",
    },
    {
      case: "base",
      narrative: base.baseCase.narrative,
      probability: base.baseCase.probability,
      priceImpact: priceImpacts.base,
      portfolioImpact: buildPortfolioImpact({ priceImpactText: priceImpacts.base, positionWeightPct, heldPosition }),
      catalysts: [base.expectedMarketReaction],
      risks: risks.slice(0, 3),
      invalidationTrigger: invalidationConditions[1] || invalidationConditions[0] || "Base-case assumptions fail to hold over the stated horizon.",
    },
    {
      case: "bear",
      narrative: base.bearCase.narrative,
      probability: base.bearCase.probability,
      priceImpact: priceImpacts.bear,
      portfolioImpact: buildPortfolioImpact({ priceImpactText: priceImpacts.bear, positionWeightPct, heldPosition }),
      catalysts: risks.length ? risks : [base.expectedMarketReaction],
      risks: risks.length ? risks : ["Broader risk-off macro shift."],
      invalidationTrigger: invalidationConditions[invalidationConditions.length - 1] || "Bear-case catalysts fail to materialize.",
    },
  ];
}

/**
 * Sprint 16 Phase D — requirement #3. Six 0-100 components, each traced
 * to real computed data (see QUALITY_WEIGHTS for the documented rollup
 * weights) — not a single opaque number.
 */
function computeQualityScore({ matchedEvents, symbolSource, positionWeightPct, convictionScore, rankingItem, macroRegime, supportingCount, opposingCount }) {
  const sourceQuality = matchedEvents.length
    ? Math.round(matchedEvents.reduce((sum, event) => sum + autonomousMarketService.sourceQualityScore(event.sourceName), 0) / matchedEvents.length)
    : 50;

  const evidenceFreshness = matchedEvents.length
    ? Math.round(matchedEvents.reduce((sum, event) => sum + autonomousMarketService.recencyScore(event.publishedAt), 0) / matchedEvents.length)
    : 40;

  const relevanceBase = symbolSource === "portfolio" ? 100 : symbolSource === "watchlist" ? 70 : 40;
  const portfolioRelevance = portfolioRiskMetrics.clamp(
    Math.round(relevanceBase + (symbolSource === "portfolio" ? Math.min(20, positionWeightPct) : 0)),
    0,
    100
  );

  const totalDirectional = supportingCount + opposingCount;
  const evidenceAgreement = totalDirectional > 0 ? Math.round((supportingCount / totalDirectional) * 100) : 50;

  let dataCompleteness = 0;
  if (matchedEvents.length > 0) dataCompleteness += 25;
  if (Number.isFinite(rankingItem.currentPrice)) dataCompleteness += 25;
  if (macroRegime) dataCompleteness += 25;
  if (matchedEvents.some((event) => event.sourceUrl)) dataCompleteness += 25;

  const modelConfidence = convictionScore;

  const qualityComponents = { sourceQuality, evidenceFreshness, portfolioRelevance, evidenceAgreement, dataCompleteness, modelConfidence };

  const qualityScore = portfolioRiskMetrics.clamp(
    Math.round(
      sourceQuality * QUALITY_WEIGHTS.sourceQuality +
        evidenceFreshness * QUALITY_WEIGHTS.evidenceFreshness +
        portfolioRelevance * QUALITY_WEIGHTS.portfolioRelevance +
        evidenceAgreement * QUALITY_WEIGHTS.evidenceAgreement +
        dataCompleteness * QUALITY_WEIGHTS.dataCompleteness +
        modelConfidence * QUALITY_WEIGHTS.modelConfidence
    ),
    0,
    100
  );

  return { qualityScore, qualityComponents };
}

/**
 * Sprint 16 Phase D — requirement #4. Contains only already-processed
 * application data (ranking scores, matched-event summaries, portfolio
 * snapshot) — never a raw provider HTTP response or an API key, so there
 * is nothing here that could leak a secret.
 */
function buildDecisionTraceInput({ rankingItem, matchedEvents, heldPosition, sectorWeightPct, positionWeightPct, macroRegime }) {
  return {
    rankingItem,
    matchedEvents,
    portfolioSnapshot: heldPosition
      ? { symbol: heldPosition.symbol, quantity: heldPosition.quantity, marketValue: heldPosition.marketValue, sector: heldPosition.sector, sectorWeightPct, positionWeightPct }
      : null,
    macroRegime,
  };
}

/**
 * Sprint 18A — runs the Committee's debate/explanation layer for symbols
 * where an action has already triggered (same gate as recommendation
 * creation itself, so this never runs against the full scan universe —
 * only the bounded set of symbols that were already going to produce a
 * recommendation). Already off the request path since evaluateSymbol only
 * runs inside runOnce()'s scheduled background job. Never fails a
 * recommendation: a committee-call failure degrades to no debate, not a
 * broken run — consistent with the rest of this engine's fallback
 * discipline.
 *
 * Sprint 41 — Committee Unification. This is now the ONE call site that
 * convenes the ONE committee (intelligenceCommitteeService, Sprint 38's
 * evidence-matrix-driven system) for the live recommendation path —
 * replacing the retired investmentCommitteeService.js. Returns
 * { committee, cio } (the coordinator summary and CIO summary), stored
 * verbatim (after sanitization) as DecisionTrace.committeeDebate — same
 * column, unified content.
 */
async function buildCommitteeDebate({ symbol }) {
  try {
    const result = await intelligenceCommitteeService.convene(symbol);
    return { committee: result.committee, cio: result.cio };
  } catch (error) {
    return null;
  }
}

/**
 * Sprint 18A — projects each matched event onto the canonical Event
 * Envelope (eventEnvelope.js), stored in DecisionTrace.evidenceReferences
 * *alongside*, not instead of, evidence.matchedEvents — preserving the
 * existing shape other code/tests/UI already depend on.
 */
function buildEvidenceReferences({ matchedEvents, symbol }) {
  return matchedEvents.map((event) => eventEnvelope.adaptLegacyFeedItemToEnvelope(event, { symbol }));
}

function buildReasoning({ symbol, action, rankingItem, portfolioAction, heldPosition, sectorWeightPct, concentrationTriggered }) {
  const parts = [];

  // Sprint 25 — rankingItem.explanation is now itself always derived from
  // real per-symbol scores upstream (autonomousMarketService.js), never
  // generic boilerplate; this defensive fallback, for the rare case that
  // field is somehow missing, still derives from this call's own real
  // scores rather than repeating an identical sentence across symbols.
  parts.push(
    rankingItem.explanation ||
      `${symbol}: AI score ${rankingItem.overallAiScore ?? "n/a"}/100 (opportunity ${rankingItem.opportunityScore ?? "n/a"}, risk ${rankingItem.riskScore ?? "n/a"}).`
  );

  if (Number.isFinite(rankingItem.currentPrice)) {
    const changePct = Number.isFinite(rankingItem.dayChangePercent) ? rankingItem.dayChangePercent : 0;
    parts.push(`Currently trading at $${rankingItem.currentPrice.toFixed(2)}, ${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% today.`);
  }

  if (concentrationTriggered) {
    parts.push(
      `${heldPosition.sector} now makes up ${Math.round(sectorWeightPct)}% of total portfolio value, above the concentration threshold — this recommendation is driven by exposure risk, not the underlying AI score alone.`
    );
  } else if (action === "BUY") {
    parts.push(`AI conviction and risk/reward currently favor a new position (suggested size ${portfolioAction.positionSize}).`);
  } else if (action === "REDUCE") {
    parts.push(`Signal strength has weakened for a position currently held (${heldPosition.sector}, ${Math.round(sectorWeightPct)}% of portfolio).`);
  } else if (action === "EXIT") {
    parts.push(`Signal strength points to exiting a position currently held (${heldPosition.sector}, ${Math.round(sectorWeightPct)}% of portfolio).`);
  }

  return parts.join(" ");
}

async function evaluateSymbol({ symbol, rankingItem, portfolioSummary, feed, macroRegime, watchlistSymbols = [] }) {
  const heldPosition = portfolioSummary.positions.find((position) => position.symbol === symbol) || null;
  const symbolSource = heldPosition ? "portfolio" : watchlistSymbols.includes(symbol) ? "watchlist" : "market-scan";
  const convictionScore = autonomousMarketService.computeConvictionScore(rankingItem);
  const portfolioAction = autonomousMarketService.buildPortfolioAction({ convictionScore });
  const sectorWeightPct = heldPosition ? findSectorWeightPct(portfolioSummary.allocation.bySector, heldPosition.sector) : 0;

  let action = null;
  let concentrationTriggered = false;

  if ((portfolioAction.action === "Buy" || portfolioAction.action === "Accumulate") && !heldPosition) {
    action = "BUY";
  } else if (portfolioAction.action === "Reduce" && heldPosition) {
    action = "REDUCE";
  } else if (portfolioAction.action === "Exit" && heldPosition) {
    action = "EXIT";
  }

  if (!action && heldPosition && sectorWeightPct >= CONCENTRATION_OVERRIDE_THRESHOLD_PCT) {
    action = "REDUCE";
    concentrationTriggered = true;
  }

  if (!action) {
    return null;
  }

  const riskScore = computeSymbolRiskScore({ rankingItem, sectorWeightPct, macroRegime });
  const riskLabel = portfolioRiskMetrics.riskLevelLabel(riskScore);
  const positionWeightPct = heldPosition && portfolioSummary.totalValue > 0
    ? Number(((heldPosition.marketValue / portfolioSummary.totalValue) * 100).toFixed(2))
    : 0;
  const matchedEvents = findMatchedEvents(feed, symbol, { heldPosition, positionWeightPct, watchlistSymbols });
  const reasoning = buildReasoning({ symbol, action, rankingItem, portfolioAction, heldPosition, sectorWeightPct, concentrationTriggered });

  // Sprint 18A — the Committee runs only for symbols that already triggered
  // an action (this line), never across the full scan universe.
  const committeeDebate = await buildCommitteeDebate({ symbol });

  const { supporting, opposing } = splitMatchedEvents({ matchedEvents, action });
  const explanation = buildExplanation({
    symbol,
    action,
    rankingItem,
    matchedEvents,
    heldPosition,
    positionWeightPct,
    watchlistSymbols,
    portfolioAction,
    sectorWeightPct,
    concentrationTriggered,
    macroRegime,
    committeeDebate,
  });
  const scenarios = buildScenarios({ symbol, rankingItem, action, matchedEvents, heldPosition, positionWeightPct, convictionScore });
  const { qualityScore, qualityComponents } = computeQualityScore({
    matchedEvents,
    symbolSource,
    positionWeightPct,
    convictionScore,
    rankingItem,
    macroRegime,
    supportingCount: supporting.length,
    opposingCount: opposing.length,
  });

  const portfolioContext = heldPosition
    ? {
        quantity: heldPosition.quantity,
        marketValue: heldPosition.marketValue,
        unrealizedPnlPct: heldPosition.unrealizedPnlPct,
        sector: heldPosition.sector,
        weightPct: positionWeightPct,
      }
    : null;

  const created = await autonomousRecommendationRepository.createRecommendation({
    symbol,
    action,
    confidenceScore: convictionScore,
    expectedUpside: portfolioAction.expectedUpside,
    expectedDownside: portfolioAction.stopLevel,
    riskScore,
    riskLabel,
    positionSizeSuggestion: portfolioAction.positionSize,
    reasoning,
    timeHorizon: portfolioAction.timeHorizon,
    explanation,
    scenarios,
    qualityScore,
    qualityComponents,
    evidence: {
      overallAiScore: rankingItem.overallAiScore,
      opportunityScore: rankingItem.opportunityScore,
      riskScore: rankingItem.riskScore,
      convictionScore,
      primaryDriver: rankingItem.primaryDriver,
      rankingExplanation: rankingItem.explanation,
      matchedEvents,
      sectorWeightPct,
      concentrationTriggered,
      macroRegime,
      currentPrice: rankingItem.currentPrice ?? null,
      dayChangePercent: rankingItem.dayChangePercent ?? null,
      symbolSource,
    },
    portfolioContext,
    // Sprint 29 Priority 1 — expiresAt existed on the schema with no
    // writer; a flat 30-day default means a recommendation nobody acted
    // on and that wasn't naturally superseded by a fresher one eventually
    // transitions to EXPIRED (see expireStaleRecommendations) instead of
    // reading as "still active" indefinitely.
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  await autonomousRecommendationRepository.supersedeActiveForSymbol(symbol, created.id);

  // Sprint 18A — confidenceCalculation gains the full shared scoring-
  // vocabulary breakdown (conviction, uncertainty) alongside the existing
  // qualityScore/qualityComponents/riskScore/riskLabel; three new,
  // additive DecisionTrace columns capture the committee debate, the
  // canonical event-envelope evidence references, and version metadata.
  // Immutability is unchanged — this is still the only write, at creation.
  const decisionTrace = await autonomousRecommendationRepository.createDecisionTrace({
    recommendationId: created.id,
    inputEvidence: buildDecisionTraceInput({ rankingItem, matchedEvents, heldPosition, sectorWeightPct, positionWeightPct, macroRegime }),
    rankingResult: { convictionScore, portfolioAction, symbolSource, action, concentrationTriggered },
    confidenceCalculation: {
      qualityScore,
      qualityComponents,
      riskScore,
      riskLabel,
      conviction: convictionScore,
      uncertainty: scoringVocabulary.computeUncertainty({
        evidenceAgreement: qualityComponents.evidenceAgreement,
        // Sprint 41 — real numeric consensus derived from the unified
        // committee's own agreement/disagreement structure (never an
        // arbitrary label-to-number mapping); null when the committee
        // call failed, which computeUncertainty treats as "not available".
        consensusLevel: committeeDebate?.committee ? intelligenceCommitteeService.computeConsensusLevel(committeeDebate.committee) : undefined,
      }),
    },
    finalOutput: {
      action,
      expectedUpside: portfolioAction.expectedUpside,
      expectedDownside: portfolioAction.stopLevel,
      positionSizeSuggestion: portfolioAction.positionSize,
      timeHorizon: portfolioAction.timeHorizon,
      reasoning,
    },
    committeeDebate: canonicalVerdict.sanitizeCommitteeDebate(committeeDebate),
    evidenceReferences: buildEvidenceReferences({ matchedEvents, symbol }),
    modelVersionMetadata: {
      eventEnvelopeVersion: eventEnvelope.EVENT_ENVELOPE_VERSION,
      contractVersion: canonicalVerdict.CANONICAL_VERDICT_CONTRACT_VERSION,
    },
  });

  // Sprint 29 Priority 1 — every recommendation now writes a real
  // WorldMemoryPrediction (previously an orphaned table with no
  // production writer). The grading job (outcomeGradingService.js) later
  // reads the entry price from this same recommendation's own
  // evidence.currentPrice — already persisted above — rather than storing
  // it a second time here. Wrapped in try/catch: World Memory bookkeeping
  // must never block a recommendation from being created, matching this
  // file's existing resilience pattern (buildCommitteeDebate above
  // degrades to null on failure, not a thrown error).
  try {
    const worldMemoryRecord = await worldMemoryRepository.createRecord({
      canonicalEventId: null,
      occurredAt: new Date(),
      primaryThemeKey: null,
      symbols: [symbol],
      sectors: heldPosition?.sector ? [heldPosition.sector] : [],
      headline: `Recommendation: ${action} ${symbol}`,
    });
    await worldMemoryRepository.createPrediction({
      worldMemoryRecordId: worldMemoryRecord.id,
      recommendationId: created.id,
      decisionTraceId: decisionTrace.id,
      predictedAction: action,
      predictedConfidence: Math.round(convictionScore),
    });
  } catch (error) {
    // World Memory is evidence for future calibration, not a dependency
    // of today's recommendation — an outage here is silently absorbed.
  }

  return created;
}

async function runOnce({ watchlist = [] } = {}) {
  const errors = [];
  let recommendationsGenerated = 0;
  let symbolsEvaluated = 0;

  try {
    const normalizedWatchlist = normalizeSymbolList(watchlist);
    const portfolioSummary = await portfolioEngineService.getPortfolioSummary();
    const heldSymbols = portfolioSummary.positions.map((position) => position.symbol);
    const universe = buildUniverse(heldSymbols, normalizedWatchlist);

    // "Current recommendation context" for news personalization — read
    // before this round writes anything, so it reflects the prior round's
    // flagged symbols (keeps their news fresh) without self-referencing
    // this round's own new recommendations.
    const sectors = Array.from(new Set((portfolioSummary.allocation?.bySector || []).map((row) => row.name).filter(Boolean)));
    const activeRecommendations = await autonomousRecommendationRepository.listActive();
    const activeRecommendationSymbols = Array.from(new Set(activeRecommendations.map((item) => item.symbol)));

    const portfolioContext = {
      heldSymbols,
      watchlistSymbols: normalizedWatchlist,
      sectors,
      activeRecommendationSymbols,
    };

    const overview = await autonomousMarketService.getAutonomousOverview({ watchlist: universe, portfolioContext });
    const macroRegime = overview.globalMap?.macroRegime || null;

    for (const symbol of universe) {
      symbolsEvaluated += 1;
      try {
        const rankingItem = overview.watchlistRankings.find((item) => item.symbol === symbol);
        if (!rankingItem) {
          continue;
        }

        const created = await evaluateSymbol({ symbol, rankingItem, portfolioSummary, feed: overview.feed, macroRegime, watchlistSymbols: normalizedWatchlist });
        if (created) {
          recommendationsGenerated += 1;
        }
      } catch (symbolError) {
        errors.push({ symbol, message: symbolError.message });
      }
    }
  } catch (runError) {
    errors.push({ symbol: null, message: runError.message });
  }

  // Sprint 29 Priority 1 — the rest of the Outcome Pipeline runs on the
  // same existing schedule as recommendation generation itself (no new
  // scheduler): expire anything nobody acted on past its window, then
  // grade any prediction whose window has elapsed. Both are best-effort
  // and never block the run or fail runOnce — a lifecycle-bookkeeping
  // failure must not look like a recommendation-generation failure.
  try {
    await autonomousRecommendationRepository.expireStaleRecommendations();
  } catch (expiryError) {
    // stays ACTIVE, retried next run
  }
  try {
    await outcomeGradingService.gradePendingOutcomes();
  } catch (gradingError) {
    // stays pending, retried next run
  }
  // Sprint 31 Priority 4 — lessons are generated right after grading, on
  // the same existing schedule, so every newly-graded outcome gets one
  // shortly after it's graded rather than waiting for a separate job.
  try {
    await outcomeIntelligenceService.generateLessonsFromOutcomes();
  } catch (lessonError) {
    // stays without a lesson, retried next run
  }

  const runLog = await autonomousRecommendationRepository.createRunLog({
    symbolsEvaluated,
    recommendationsGenerated,
    errors: errors.length ? errors : null,
  });

  return { runLog, symbolsEvaluated, recommendationsGenerated, errors };
}

module.exports = {
  buildUniverse,
  runOnce,
  // Exported directly for unit testing per Sprint 16 Phase D requirement
  // #7 ("direct tests for score calculation and decision trace creation").
  computeQualityScore,
  buildExplanation,
  buildScenarios,
  QUALITY_WEIGHTS,
  // Sprint 18A — exported directly for unit testing the committee/event-
  // envelope integration without needing a full evaluateSymbol run.
  buildEvidenceReferences,
};
