function detectTheme(event = "") {
  const text = String(event || "").toLowerCase();
  if (text.includes("oil")) return "oil";
  if (text.includes("fed") || text.includes("rate")) return "rates";
  if (text.includes("earnings")) return "earnings";
  if (text.includes("ai") || text.includes("nvidia")) return "ai";
  if (text.includes("conflict") || text.includes("war") || text.includes("israel")) return "geopolitical";
  if (text.includes("btc") || text.includes("bitcoin") || text.includes("etf")) return "crypto";
  return "macro";
}

const templates = {
  oil: {
    bull: "Oil spike fades quickly and inflation pass-through remains contained.",
    base: "Energy outperforms while transport and consumer margins compress.",
    bear: "Oil shock persists, inflation re-accelerates, and rates rise.",
    marketReaction: "Risk assets bifurcate; energy leadership strengthens.",
    sectorRotation: ["Energy", "Defense", "Airlines", "Consumer"],
  },
  rates: {
    bull: "Fed hike is perceived as final hike with stable growth.",
    base: "Duration remains pressured while quality cash-flow names outperform.",
    bear: "Policy stays restrictive and growth decelerates sharply.",
    marketReaction: "Valuation compression in growth; dollar firm.",
    sectorRotation: ["Financials", "Utilities", "Tech", "REITs"],
  },
  earnings: {
    bull: "Beat and raise with improving guidance quality.",
    base: "Inline print; reaction driven by commentary and margins.",
    bear: "Miss with weaker forward demand signal.",
    marketReaction: "Single-name volatility spills into peers.",
    sectorRotation: ["Core sector", "Suppliers", "Competitors"],
  },
  ai: {
    bull: "AI capex accelerates and supply chain bottlenecks ease.",
    base: "Leadership stays concentrated in a few mega-cap names.",
    bear: "Valuation de-rating after crowded positioning.",
    marketReaction: "Semis and cloud remain sensitivity centers.",
    sectorRotation: ["Semiconductors", "Cloud", "Utilities", "Legacy IT"],
  },
  geopolitical: {
    bull: "Conflict de-escalates and risk premium declines.",
    base: "Localized risk with commodity volatility.",
    bear: "Escalation drives commodity and shipping stress.",
    marketReaction: "Defense bid; transport and cyclicals pressured.",
    sectorRotation: ["Defense", "Energy", "Travel", "EM assets"],
  },
  crypto: {
    bull: "ETF flows sustain and liquidity broadens market participation.",
    base: "Spot-driven volatility with selective crypto-equity beta.",
    bear: "Regulatory friction and risk-off macro unwind gains.",
    marketReaction: "High-beta cross-asset reaction.",
    sectorRotation: ["Crypto", "Exchanges", "Semis", "Rates-sensitive assets"],
  },
  macro: {
    bull: "Growth and inflation remain balanced.",
    base: "Mixed macro regime with selective risk taking.",
    bear: "Growth scare and tightening financial conditions.",
    marketReaction: "Higher dispersion across sectors.",
    sectorRotation: ["Quality growth", "Defensives", "Cyclicals"],
  },
};

function getScenario(event = "") {
  const theme = detectTheme(event);
  const model = templates[theme] || templates.macro;

  return {
    theme,
    bullCase: { narrative: model.bull, probability: 0.3 },
    baseCase: { narrative: model.base, probability: 0.5 },
    bearCase: { narrative: model.bear, probability: 0.2 },
    expectedMarketReaction: model.marketReaction,
    expectedSectorRotation: model.sectorRotation,
  };
}

module.exports = { getScenario };
