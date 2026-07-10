import { useEffect, useMemo, useState } from "react";
import { committeeApi, intelligenceApi, marketApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import {
  getVirtualPortfolioEventName,
  readVirtualPortfolio,
  resetVirtualPortfolio,
  STARTING_CAPITAL,
  writeVirtualPortfolio,
} from "../services/virtualPortfolioStorage";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parsePercentRange(value) {
  const text = String(value || "");
  const matches = text.match(/-?\d+(?:\.\d+)?/g) || [];
  if (!matches.length) {
    return 0;
  }
  return Number(matches[matches.length - 1]);
}

function parseRiskReward(value) {
  const text = String(value || "");
  const match = text.match(/(\d+(?:\.\d+)?):1/);
  return match ? Number(match[1]) : 0;
}

function inferAssetType(symbol = "") {
  const normalized = String(symbol || "").toUpperCase();
  if (["BTC", "ETH", "SOL"].includes(normalized)) return "Crypto";
  if (["OIL", "XOM", "CVX", "CL"].includes(normalized)) return normalized === "OIL" ? "Commodity" : "Equity";
  if (["SPY", "QQQ", "SMH", "XLE"].includes(normalized)) return "ETF";
  return "Equity";
}

function inferSector(symbol = "", overview = null) {
  const rank = (overview?.watchlistRankings || []).find((item) => item.symbol === symbol);
  const idea = (overview?.alphaDiscovery?.top10InvestmentIdeas || []).find((item) => item.symbol === symbol);
  return idea?.affectedSectors?.[0] || rank?.primaryDriver || "General";
}

function buildPositionSizeDollars(state, suggested = "", rules = {}) {
  const maxCapital = (state.totalPortfolioValue || STARTING_CAPITAL) * Number(rules.maxPositionPct || 0.1);
  const text = String(suggested || "");
  const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    return Math.min(maxCapital, (state.totalPortfolioValue || STARTING_CAPITAL) * (Number(pctMatch[1]) / 100));
  }
  if (text.includes("starter")) {
    return Math.min(maxCapital, (state.totalPortfolioValue || STARTING_CAPITAL) * 0.02);
  }
  if (text.includes("avoid") || text.includes("0%")) {
    return 0;
  }
  return maxCapital;
}

function getPosition(state, symbol) {
  return (state.positions || []).find((item) => item.symbol === symbol) || null;
}

function sectorExposure(state, sector) {
  const positions = state.positions || [];
  const total = state.totalPortfolioValue || STARTING_CAPITAL;
  const sectorValue = positions.filter((item) => item.sector === sector).reduce((sum, item) => sum + Number(item.marketValue || 0), 0);
  return total > 0 ? sectorValue / total : 0;
}

function marketRegimePass(overview) {
  const riskMode = overview?.globalMap?.macroRegime?.riskMode || "mixed";
  return riskMode !== "risk-off";
}

function eventImpactPass(overview, symbol) {
  return (overview?.feed || []).some((item) => (item.relatedTickers || []).includes(symbol) || (item.affectedAssets || []).includes(symbol));
}

function committeeVotePass(vote = "Hold") {
  return ["Strong Buy", "Buy", "Hold"].includes(String(vote || "Hold"));
}

function buildTradeRecord({ symbol, action, confidence, reason, sourceSignals, entryPrice, suggestedPositionSize, stopLevel, targetPrice, timeHorizon, quantity, value, thesis }) {
  return {
    id: `${symbol}:${action}:${Date.now()}`,
    dateTime: new Date().toISOString(),
    ticker: symbol,
    action,
    confidence,
    reason,
    sourceSignals,
    entryPrice,
    suggestedPositionSize,
    stopLevel,
    targetPrice,
    timeHorizon,
    quantity,
    value,
    thesis,
    status: action === "Exit" ? "Closed" : "Open",
    currentPnL: 0,
  };
}

function recomputeState(state, quotesMap = {}, spyPrice = null) {
  const positions = (state.positions || []).map((position) => {
    const quote = quotesMap[position.symbol] || null;
    const currentPrice = Number(quote?.quote?.price || position.currentPrice || position.averageEntryPrice || 0);
    const marketValue = currentPrice * Number(position.quantity || 0);
    const unrealizedPnL = (currentPrice - Number(position.averageEntryPrice || 0)) * Number(position.quantity || 0);
    return {
      ...position,
      currentPrice,
      marketValue: Number(marketValue.toFixed(2)),
      unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
      unrealizedPnLPct: Number(position.averageEntryPrice ? (((currentPrice - position.averageEntryPrice) / position.averageEntryPrice) * 100).toFixed(2) : 0),
    };
  });

  const openValue = positions.reduce((sum, item) => sum + Number(item.marketValue || 0), 0);
  const totalPortfolioValue = Number((Number(state.cashBalance || 0) + openValue).toFixed(2));
  const dailyReturn = positions.reduce((sum, item) => sum + (Number(item.marketValue || 0) * (Number(quotesMap[item.symbol]?.quote?.change || 0) / 100)), 0);
  const totalReturn = totalPortfolioValue - STARTING_CAPITAL;
  const allocationBySectorMap = {};
  const allocationByAssetMap = {};

  positions.forEach((item) => {
    allocationBySectorMap[item.sector] = (allocationBySectorMap[item.sector] || 0) + Number(item.marketValue || 0);
    allocationByAssetMap[item.assetType] = (allocationByAssetMap[item.assetType] || 0) + Number(item.marketValue || 0);
  });

  const allocationBySector = Object.entries(allocationBySectorMap).map(([name, value]) => ({ name, value, pct: totalPortfolioValue > 0 ? Number(((value / totalPortfolioValue) * 100).toFixed(2)) : 0 }));
  const allocationByAssetType = Object.entries(allocationByAssetMap).map(([name, value]) => ({ name, value, pct: totalPortfolioValue > 0 ? Number(((value / totalPortfolioValue) * 100).toFixed(2)) : 0 }));

  const closedTrades = (state.trades || []).filter((trade) => trade.status === "Closed" && Number.isFinite(Number(trade.currentPnL)));
  const wins = closedTrades.filter((trade) => Number(trade.currentPnL) > 0);
  const losses = closedTrades.filter((trade) => Number(trade.currentPnL) < 0);
  const averageGain = wins.length ? wins.reduce((sum, trade) => sum + Number(trade.currentPnL || 0), 0) / wins.length : 0;
  const averageLoss = losses.length ? losses.reduce((sum, trade) => sum + Number(trade.currentPnL || 0), 0) / losses.length : 0;
  const benchmarkBaseline = Number(state.benchmark?.baselinePrice || spyPrice || 0);
  const benchmarkCurrent = Number(spyPrice || state.benchmark?.currentPrice || benchmarkBaseline || 0);
  const benchmarkReturn = benchmarkBaseline > 0 ? ((benchmarkCurrent - benchmarkBaseline) / benchmarkBaseline) * 100 : 0;
  const openTrades = positions.filter((item) => Number(item.quantity || 0) > 0);
  const bestTrade = [...openTrades].sort((a, b) => Number(b.unrealizedPnL || 0) - Number(a.unrealizedPnL || 0))[0] || null;
  const worstTrade = [...openTrades].sort((a, b) => Number(a.unrealizedPnL || 0) - Number(b.unrealizedPnL || 0))[0] || null;

  const equityCurve = [STARTING_CAPITAL, ...(state.trades || []).map((trade, index) => STARTING_CAPITAL + (state.realizedPnL || 0) + index * 0)];
  let peak = STARTING_CAPITAL;
  let maxDrawdown = 0;
  equityCurve.forEach((value) => {
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, value - peak);
  });

  return {
    ...state,
    positions,
    totalPortfolioValue,
    dailyReturn: Number(dailyReturn.toFixed(2)),
    totalReturn: Number(totalReturn.toFixed(2)),
    allocationBySector,
    allocationByAssetType,
    benchmark: {
      symbol: "SPY",
      baselinePrice: benchmarkBaseline || benchmarkCurrent || null,
      currentPrice: benchmarkCurrent || null,
      returnPct: Number(benchmarkReturn.toFixed(2)),
    },
    performance: {
      winRate: closedTrades.length ? Number(((wins.length / closedTrades.length) * 100).toFixed(2)) : 0,
      averageGain: Number(averageGain.toFixed(2)),
      averageLoss: Number(averageLoss.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      benchmarkVsSpy: Number((totalReturn - ((benchmarkReturn / 100) * STARTING_CAPITAL)).toFixed(2)),
      bestTrade,
      worstTrade,
    },
    riskExposure: Number(((openValue / Math.max(totalPortfolioValue, 1)) * 100).toFixed(2)),
  };
}

async function fetchQuotes(symbols = []) {
  const entries = await Promise.all(symbols.map(async (symbol) => ({ symbol, quote: await marketApi.getQuote(symbol).catch(() => null) })));
  return Object.fromEntries(entries.map((item) => [item.symbol, item.quote]));
}

function closeTradeAndPosition(state, symbol, action, currentPrice, reason, sourceSignals) {
  const position = getPosition(state, symbol);
  if (!position) {
    return state;
  }

  const proceeds = Number(position.quantity || 0) * Number(currentPrice || position.currentPrice || 0);
  const pnl = proceeds - (Number(position.quantity || 0) * Number(position.averageEntryPrice || 0));
  const trade = buildTradeRecord({
    symbol,
    action,
    confidence: 0,
    reason,
    sourceSignals,
    entryPrice: Number(currentPrice || position.currentPrice || 0),
    suggestedPositionSize: "Exit",
    stopLevel: position.stopLevel,
    targetPrice: position.targetPrice,
    timeHorizon: position.timeHorizon,
    quantity: Number(position.quantity || 0),
    value: Number(proceeds.toFixed(2)),
    thesis: reason,
  });
  trade.status = "Closed";
  trade.currentPnL = Number(pnl.toFixed(2));

  return {
    ...state,
    cashBalance: Number((Number(state.cashBalance || 0) + proceeds).toFixed(2)),
    realizedPnL: Number((Number(state.realizedPnL || 0) + pnl).toFixed(2)),
    positions: (state.positions || []).filter((item) => item.symbol !== symbol),
    trades: [...(state.trades || []), trade],
  };
}

function openOrAddPosition(state, candidate, committee, quote, overview) {
  const symbol = candidate.symbol;
  const currentPrice = Number(quote?.quote?.price || 0);
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    return state;
  }

  const current = getPosition(state, symbol);
  const rules = state.rules || {};
  const suggestedValue = buildPositionSizeDollars(state, candidate.portfolioAction?.positionSize, rules);
  if (suggestedValue <= 0 || Number(state.cashBalance || 0) <= 0) {
    return state;
  }
  const sector = inferSector(symbol, overview);
  if (sectorExposure(state, sector) >= Number(rules.maxSectorPct || 0.25)) {
    return state;
  }

  const maxCapital = Math.min(suggestedValue, Number(state.cashBalance || 0));
  const quantity = Math.floor(maxCapital / currentPrice);
  if (quantity <= 0) {
    return state;
  }
  const value = Number((quantity * currentPrice).toFixed(2));
  const action = current ? "Accumulate" : "Buy";
  const newTrade = buildTradeRecord({
    symbol,
    action,
    confidence: candidate.convictionScore,
    reason: candidate.thesis,
    sourceSignals: [candidate.primaryDriver, ...(candidate.affectedSectors || []).slice(0, 2)],
    entryPrice: currentPrice,
    suggestedPositionSize: candidate.portfolioAction?.positionSize,
    stopLevel: candidate.portfolioAction?.stopLevel,
    targetPrice: candidate.portfolioAction?.expectedUpside,
    timeHorizon: candidate.portfolioAction?.timeHorizon,
    quantity,
    value,
    thesis: committee?.committee?.cio?.executiveSummary || candidate.thesis,
  });

  const nextPositions = [...(state.positions || [])];
  const assetType = inferAssetType(symbol);
  if (current) {
    const idx = nextPositions.findIndex((item) => item.symbol === symbol);
    const totalQuantity = Number(current.quantity || 0) + quantity;
    const totalCost = (Number(current.averageEntryPrice || 0) * Number(current.quantity || 0)) + value;
    nextPositions[idx] = {
      ...current,
      quantity: totalQuantity,
      averageEntryPrice: Number((totalCost / Math.max(totalQuantity, 1)).toFixed(2)),
      currentPrice,
      marketValue: Number((totalQuantity * currentPrice).toFixed(2)),
      sector,
      assetType,
      stopLevel: candidate.portfolioAction?.stopLevel,
      targetPrice: candidate.portfolioAction?.expectedUpside,
      timeHorizon: candidate.portfolioAction?.timeHorizon,
      thesis: candidate.thesis,
    };
  } else {
    nextPositions.push({
      symbol,
      sector,
      assetType,
      quantity,
      averageEntryPrice: currentPrice,
      currentPrice,
      marketValue: Number((quantity * currentPrice).toFixed(2)),
      unrealizedPnL: 0,
      stopLevel: candidate.portfolioAction?.stopLevel,
      targetPrice: candidate.portfolioAction?.expectedUpside,
      timeHorizon: candidate.portfolioAction?.timeHorizon,
      thesis: candidate.thesis,
    });
  }

  return {
    ...state,
    cashBalance: Number((Number(state.cashBalance || 0) - value).toFixed(2)),
    positions: nextPositions,
    trades: [...(state.trades || []), newTrade],
  };
}

async function syncPortfolioState(currentState, watchlist, overview) {
  const symbols = Array.from(new Set([
    ...(watchlist || []),
    ...((overview?.alphaDiscovery?.top10InvestmentIdeas || []).map((item) => item.symbol)),
    "SPY",
  ])).filter(Boolean);
  const quotesMap = await fetchQuotes(symbols);
  let nextState = recomputeState({ ...currentState }, quotesMap, Number(quotesMap.SPY?.quote?.price || 0));
  const candidates = (overview?.alphaDiscovery?.top10InvestmentIdeas || []).slice(0, 10);

  for (const candidate of candidates) {
    const symbol = String(candidate.symbol || "").toUpperCase();
    const conviction = Number(candidate.convictionScore || 0);
    const riskReward = parseRiskReward(candidate.portfolioAction?.riskRewardRatio);
    const riskRank = (overview?.watchlistRankings || []).find((item) => item.symbol === symbol);
    const riskScore = Number(riskRank?.riskScore || 0);
    const lastProcessed = nextState.lastProcessedSymbols?.[symbol];
    const now = Date.now();
    if (lastProcessed && now - lastProcessed < 10 * 60 * 1000) {
      continue;
    }

    const committee = await committeeApi.analyze({ symbol }).catch(() => null);
    const committeeVote = committee?.committee?.cio?.decision || "Hold";
    const meetsThresholds = conviction >= Number(nextState.rules?.minConfidence || 75)
      && riskReward >= Number(nextState.rules?.minRiskReward || 1.5)
      && committeeVotePass(committeeVote)
      && marketRegimePass(overview)
      && eventImpactPass(overview, symbol)
      && riskScore <= 70;

    if (!meetsThresholds) {
      nextState.lastProcessedSymbols = { ...(nextState.lastProcessedSymbols || {}), [symbol]: now };
      continue;
    }

    const desiredAction = candidate.portfolioAction?.action || "Wait";
    if (["Buy", "Accumulate"].includes(desiredAction)) {
      nextState = openOrAddPosition(nextState, candidate, committee, quotesMap[symbol], overview);
    } else if (desiredAction === "Reduce") {
      nextState = closeTradeAndPosition(nextState, symbol, "Reduce", Number(quotesMap[symbol]?.quote?.price || 0), candidate.thesis, [candidate.primaryDriver]);
    } else if (desiredAction === "Exit") {
      nextState = closeTradeAndPosition(nextState, symbol, "Exit", Number(quotesMap[symbol]?.quote?.price || 0), candidate.thesis, [candidate.primaryDriver]);
    } else {
      const holdTrade = buildTradeRecord({
        symbol,
        action: "Hold",
        confidence: conviction,
        reason: candidate.thesis,
        sourceSignals: [candidate.primaryDriver],
        entryPrice: Number(quotesMap[symbol]?.quote?.price || 0),
        suggestedPositionSize: candidate.portfolioAction?.positionSize,
        stopLevel: candidate.portfolioAction?.stopLevel,
        targetPrice: candidate.portfolioAction?.expectedUpside,
        timeHorizon: candidate.portfolioAction?.timeHorizon,
        quantity: 0,
        value: 0,
        thesis: committee?.committee?.cio?.executiveSummary || candidate.thesis,
      });
      nextState.trades = [...(nextState.trades || []), holdTrade];
    }

    nextState.lastProcessedSymbols = { ...(nextState.lastProcessedSymbols || {}), [symbol]: now };
    nextState = recomputeState(nextState, quotesMap, Number(quotesMap.SPY?.quote?.price || 0));
  }

  nextState = recomputeState(nextState, quotesMap, Number(quotesMap.SPY?.quote?.price || 0));
  return nextState;
}

export default function useVirtualPortfolio({ watchlist = [], overview = null, autoSync = false } = {}) {
  const [portfolio, setPortfolio] = useState(() => recomputeState(readVirtualPortfolio(), {}, null));

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => {};
    }
    const sync = () => setPortfolio(recomputeState(readVirtualPortfolio(), {}, null));
    const eventName = getVirtualPortfolioEventName();
    window.addEventListener("storage", sync);
    window.addEventListener(eventName, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(eventName, sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function runSync() {
      if (!autoSync || !overview) {
        return;
      }
      try {
        const nextState = await syncPortfolioState(readVirtualPortfolio(), watchlist, overview);
        if (!cancelled) {
          writeVirtualPortfolio(nextState);
          setPortfolio(nextState);
        }
      } catch (error) {
        logError("Virtual portfolio sync failed", error);
      }
    }

    runSync();
    return () => {
      cancelled = true;
    };
  }, [autoSync, overview, watchlist]);

  const api = useMemo(() => ({
    portfolio,
    reset() {
      const nextState = recomputeState(resetVirtualPortfolio(), {}, null);
      setPortfolio(nextState);
    },
    setPortfolioState(nextState) {
      writeVirtualPortfolio(nextState);
      setPortfolio(nextState);
    },
  }), [portfolio]);

  return api;
}
