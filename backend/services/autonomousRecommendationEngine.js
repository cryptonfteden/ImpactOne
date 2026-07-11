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

// Above this sector weight (%), a held position's concentration risk can
// independently trigger a REDUCE recommendation even when the underlying
// AI score alone would say "Wait" — this is what makes the engine analyze
// portfolio exposure, not just repackage the existing opportunity list.
// Deliberately higher than dashboardMetrics' 25% risk-penalty floor, which
// is tuned for a continuous score, not a discrete action trigger.
const CONCENTRATION_OVERRIDE_THRESHOLD_PCT = 35;

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

function findMatchedEvents(feed, symbol) {
  return (feed || [])
    .filter((item) => (item.relatedTickers || []).includes(symbol) || (item.affectedAssets || []).includes(symbol))
    .slice(0, 3)
    .map((item) => ({ headline: item.headline, importanceScore: item.importanceScore, whyItMatters: item.whyItMatters, sourceUrl: item.sourceUrl || null }));
}

function buildReasoning({ symbol, action, rankingItem, portfolioAction, heldPosition, sectorWeightPct, concentrationTriggered }) {
  const parts = [];

  parts.push(rankingItem.explanation || `${symbol} is being scored on macro, event, and positioning exposure.`);

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
  const matchedEvents = findMatchedEvents(feed, symbol);
  const reasoning = buildReasoning({ symbol, action, rankingItem, portfolioAction, heldPosition, sectorWeightPct, concentrationTriggered });

  const portfolioContext = heldPosition
    ? {
        quantity: heldPosition.quantity,
        marketValue: heldPosition.marketValue,
        unrealizedPnlPct: heldPosition.unrealizedPnlPct,
        sector: heldPosition.sector,
        weightPct: portfolioSummary.totalValue > 0 ? Number(((heldPosition.marketValue / portfolioSummary.totalValue) * 100).toFixed(2)) : 0,
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
    evidence: {
      overallAiScore: rankingItem.overallAiScore,
      opportunityScore: rankingItem.opportunityScore,
      riskScore: rankingItem.riskScore,
      convictionScore,
      primaryDriver: rankingItem.primaryDriver,
      explanation: rankingItem.explanation,
      matchedEvents,
      sectorWeightPct,
      concentrationTriggered,
      macroRegime,
      currentPrice: rankingItem.currentPrice ?? null,
      dayChangePercent: rankingItem.dayChangePercent ?? null,
      symbolSource,
    },
    portfolioContext,
  });

  await autonomousRecommendationRepository.supersedeActiveForSymbol(symbol, created.id);

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
};
