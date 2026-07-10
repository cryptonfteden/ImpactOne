function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const defaults = {
  AAPL: { sector: "Technology", country: "US", beta: 1.1, macro: "growth" },
  NVDA: { sector: "Semiconductors", country: "US", beta: 1.4, macro: "ai" },
  TSLA: { sector: "Automotive", country: "US", beta: 1.6, macro: "consumer" },
  XOM: { sector: "Energy", country: "US", beta: 1.0, macro: "commodities" },
  BTC: { sector: "Crypto", country: "Global", beta: 2.0, macro: "liquidity" },
};

function infer(symbol) {
  return defaults[String(symbol || "").toUpperCase()] || { sector: "Unknown", country: "US", beta: 1.0, macro: "macro" };
}

function aggregate(items, key) {
  const map = {};
  items.forEach((item) => {
    map[item[key]] = (map[item[key]] || 0) + item.weight;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, weight]) => ({ name, weight: Number(weight.toFixed(4)) }));
}

function analyzePortfolio({ holdings = [] } = {}) {
  const normalized = (holdings || []).map((item) => {
    const symbol = String(item.symbol || "").toUpperCase();
    const weight = Math.max(0, toNumber(item.weight, 0));
    return { symbol, weight, ...infer(symbol) };
  }).filter((item) => item.symbol);

  const total = normalized.reduce((sum, item) => sum + item.weight, 0) || 1;
  const weighted = normalized.map((item) => ({ ...item, weight: item.weight / total }));

  const sectorExposure = aggregate(weighted, "sector");
  const countryExposure = aggregate(weighted, "country");
  const macroExposure = aggregate(weighted, "macro");
  const betaWeighted = weighted.reduce((sum, item) => sum + item.beta * item.weight, 0);

  return {
    portfolioExposure: weighted,
    sectorConcentration: sectorExposure,
    countryExposure,
    riskConcentration: {
      betaWeighted: Number(betaWeighted.toFixed(3)),
      topPosition: weighted.sort((a, b) => b.weight - a.weight)[0] || null,
    },
    macroExposure,
    aiSuggestions: [
      "Diversify high-conviction positions across at least two non-correlated sectors.",
      "Monitor macro-sensitive exposures when rates and inflation signals diverge.",
      "Use event-driven hedging around high-impact macro calendar dates.",
    ],
  };
}

module.exports = { analyzePortfolio };
