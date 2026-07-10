const PORTFOLIO_KEY = "impactone-virtual-portfolio";
const PORTFOLIO_EVENT = "impactone:virtual-portfolio-updated";
const STARTING_CAPITAL = 100000;

function defaultState() {
  return {
    cashBalance: STARTING_CAPITAL,
    realizedPnL: 0,
    positions: [],
    trades: [],
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    lastProcessedSymbols: {},
    benchmark: {
      symbol: "SPY",
      baselinePrice: null,
      currentPrice: null,
      returnPct: 0,
    },
    rules: {
      maxPositionPct: 0.1,
      maxSectorPct: 0.25,
      leverageAllowed: false,
      shortSellingAllowed: false,
      minConfidence: 75,
      minRiskReward: 1.5,
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getVirtualPortfolioEventName() {
  return PORTFOLIO_EVENT;
}

export function readVirtualPortfolio() {
  if (typeof window === "undefined") {
    return defaultState();
  }

  try {
    const raw = window.localStorage.getItem(PORTFOLIO_KEY);
    if (!raw) {
      return defaultState();
    }
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch (error) {
    return defaultState();
  }
}

export function writeVirtualPortfolio(nextState) {
  if (typeof window === "undefined") {
    return;
  }

  const state = {
    ...defaultState(),
    ...clone(nextState),
    lastUpdatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(state));
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent(PORTFOLIO_EVENT, { detail: state }));
  });
}

export function resetVirtualPortfolio() {
  const state = defaultState();
  writeVirtualPortfolio(state);
  return state;
}

export { STARTING_CAPITAL };
