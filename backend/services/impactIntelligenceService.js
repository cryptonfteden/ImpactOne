const { get, set } = require("./intelligenceCache");
const { buildImpactGraph } = require("./relationshipGraphService");
const { getHistoricalMatches } = require("./historicalSimilarityService");
const { getScenario } = require("./scenarioEngineService");
const { propagateByTheme } = require("./propagationEngineService");
const { analyzePortfolio } = require("./portfolioIntelligenceService");
const { getUnifiedFusion } = require("./alternativeFusionService");

// Sprint 26 — Trust Breaker fix: the prior adjustAffected only
// differentiated 4 event categories; every other event silently fell
// through to the same generic 4-stock/4-sector template. This uses the
// same 19 category keywords autonomousMarketService.CORE_EVENT_TYPES
// defines (duplicated here, not imported, to avoid a circular require —
// autonomousMarketService.js already requires this file), so the
// sector/company list genuinely reflects what kind of event this is for
// every category, not just four of them.
const CATEGORY_KEYWORDS = {
  macro: ["macro", "inflation", "jobs", "growth"],
  geopolitics: ["war", "conflict", "geopolit", "border", "sanction", "israel"],
  centralBanks: ["fed", "ecb", "boj", "rate", "central bank"],
  earnings: ["earnings", "guidance", "beat", "miss"],
  ma: ["acquire", "merger", "m&a", "deal"],
  regulation: ["regulation", "doj", "antitrust", "policy", "sec filing", "sec probe"],
  supplyChain: ["supply", "shipment", "factory", "logistics"],
  semiconductors: ["chip", "semiconductor", "foundry", "gpu"],
  energy: ["oil", "gas", "energy", "opec"],
  crypto: ["bitcoin", "btc", "crypto", "etf"],
  defense: ["defense", "missile", "military"],
  ai: ["ai", "nvidia", "model", "compute"],
  healthcare: ["drug", "healthcare", "fda", "biotech"],
  consumer: ["consumer", "retail", "spending", "discretionary"],
  financials: ["bank", "credit", "financial", "lending"],
  space: ["space", "launch", "satellite", "orbital"],
  nuclear: ["nuclear", "uranium", "reactor"],
  cybersecurity: ["cyber", "security", "breach", "software security"],
  quantum: ["quantum", "qubit", "quantum computing"],
};

function classifyForAssets(text) {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) return category;
  }
  return "macro";
}

const EVENT_TYPE_ASSETS = {
  macro: { stocks: ["SPY", "IWM", "AAPL", "JPM"], sectors: ["Broad Market", "Financials", "Consumer"] },
  geopolitics: { stocks: ["LMT", "NOC", "XOM", "GLD"], sectors: ["Defense", "Energy", "Transport", "Insurance"] },
  centralBanks: { stocks: ["JPM", "AAPL", "NVDA", "TLT"], sectors: ["Financials", "Rate-Sensitive Growth", "Bonds"] },
  earnings: { stocks: ["AAPL", "NVDA", "MSFT", "AMZN"], sectors: ["Technology", "Consumer Discretionary"] },
  ma: { stocks: ["GS", "MS", "AAPL", "MSFT"], sectors: ["Investment Banking", "Technology"] },
  regulation: { stocks: ["META", "GOOGL", "AAPL", "AMZN"], sectors: ["Big Tech", "Compliance-Sensitive"] },
  supplyChain: { stocks: ["AAPL", "TSM", "NVDA", "FDX"], sectors: ["Hardware", "Logistics", "Semiconductors"] },
  semiconductors: { stocks: ["NVDA", "AMD", "TSM", "ASML"], sectors: ["Semiconductors", "Hardware"] },
  energy: { stocks: ["XOM", "CVX", "DAL", "LUV"], sectors: ["Energy", "Airlines", "Shipping", "Consumer"] },
  crypto: { stocks: ["COIN", "MSTR", "RIOT", "NVDA"], sectors: ["Crypto", "Semiconductors", "Exchanges"] },
  defense: { stocks: ["LMT", "RTX", "NOC", "GD"], sectors: ["Defense", "Aerospace"] },
  ai: { stocks: ["NVDA", "MSFT", "GOOGL", "META"], sectors: ["AI Infrastructure", "Semiconductors", "Cloud"] },
  healthcare: { stocks: ["UNH", "JNJ", "PFE", "LLY"], sectors: ["Healthcare", "Biotech", "Pharma"] },
  consumer: { stocks: ["AMZN", "WMT", "TGT", "COST"], sectors: ["Consumer Discretionary", "Retail"] },
  financials: { stocks: ["JPM", "GS", "MS", "BAC"], sectors: ["Financials", "Banking", "Credit"] },
  space: { stocks: ["LMT", "RTX", "BA"], sectors: ["Aerospace", "Space", "Defense"] },
  nuclear: { stocks: ["CCJ", "LEU", "NEE"], sectors: ["Nuclear", "Utilities", "Uranium"] },
  cybersecurity: { stocks: ["CRWD", "PANW", "FTNT", "ZS"], sectors: ["Cybersecurity", "Enterprise Software"] },
  quantum: { stocks: ["IBM", "GOOGL", "IONQ", "RGTI"], sectors: ["Quantum Computing", "Technology"] },
};

const assetTemplates = {
  stocks: ["AAPL", "NVDA", "TSLA", "MSFT"],
  etfs: ["SPY", "QQQ", "XLE", "SMH"],
  sectors: ["Technology", "Semiconductors", "Energy", "Utilities"],
  countries: ["US", "China", "Taiwan", "EU"],
  currencies: ["USD", "EUR", "JPY"],
  bonds: ["UST 2Y", "UST 10Y"],
  commodities: ["Oil", "Natural Gas", "Copper", "Gold"],
  crypto: ["BTC", "ETH"],
  supplyChains: ["Semiconductor equipment", "Energy logistics", "Cloud infrastructure"],
};

function inferTimeHorizon(event = "") {
  const text = String(event || "").toLowerCase();
  if (text.includes("earnings") || text.includes("announcement")) return "1-4 weeks";
  if (text.includes("rate") || text.includes("conflict") || text.includes("oil")) return "1-3 months";
  return "1-6 months";
}

// Sprint 26 — replaces the prior boilerplate ("The event 'X' affects
// cross-asset pricing through macro regime, positioning, and liquidity
// channels.") that was identical for every event with only the event name
// substituted. Genuinely derived from this call's own real, already-
// computed inputs (affected sectors, the strongest historical analog, the
// theme this event propagates through) — never the same sentence twice for
// two different events, and honest when a given input is missing.
function buildWhy({ event, affected, history, propagation }) {
  const sectors = (affected?.sectors || []).slice(0, 2).join(" and ");
  const topAnalog = history?.[0];
  const parts = [`"${event}" is being weighed against ${sectors || "broad market"} exposure`];

  if (topAnalog?.event) {
    parts.push(`most comparable to "${topAnalog.event}" (${topAnalog.similarity ?? "n/a"}% historical similarity)`);
  }
  const topPropagation = propagation?.[0];
  if (topPropagation) {
    parts.push(`propagating from ${topPropagation.from} to ${topPropagation.to} (${topPropagation.effect})`);
  }

  return `${parts.join("; ")}.`;
}

function adjustAffected(event = "") {
  const text = String(event || "").toLowerCase();
  const output = JSON.parse(JSON.stringify(assetTemplates));

  // Broad category override first (covers all 19 categories); the four
  // sharper, more specific keyword overrides below take precedence over it
  // when they also match, since they're more precisely differentiated.
  const category = classifyForAssets(text);
  const categoryAssets = EVENT_TYPE_ASSETS[category];
  if (categoryAssets) {
    output.stocks = categoryAssets.stocks;
    output.sectors = categoryAssets.sectors;
  }

  if (text.includes("oil")) {
    output.stocks = ["XOM", "CVX", "DAL", "LUV"];
    output.sectors = ["Energy", "Airlines", "Shipping", "Consumer"];
    output.commodities = ["Oil", "Natural Gas", "Copper"];
  }

  if (text.includes("btc") || text.includes("bitcoin") || text.includes("etf")) {
    output.stocks = ["COIN", "MSTR", "RIOT", "NVDA"];
    output.crypto = ["BTC", "ETH", "SOL"];
    output.sectors = ["Crypto", "Semiconductors", "Exchanges"];
  }

  if (text.includes("fed") || text.includes("rate")) {
    output.stocks = ["JPM", "AAPL", "NVDA", "TLT"];
    output.bonds = ["UST 2Y", "UST 10Y", "Investment grade credit"];
    output.currencies = ["USD", "JPY", "CHF"];
  }

  if (text.includes("israel") || text.includes("conflict") || text.includes("war")) {
    output.stocks = ["LMT", "NOC", "XOM", "GLD"];
    output.sectors = ["Defense", "Energy", "Transport", "Insurance"];
    output.commodities = ["Oil", "Gold", "Natural Gas"];
  }

  return output;
}

async function analyzeIntelligence({ event = "Fed rate hike", symbol = "AAPL" } = {}) {
  const cacheKey = JSON.stringify({ event, symbol }).toLowerCase();
  const cached = get("intel:analyze", cacheKey);
  if (cached) {
    return cached;
  }

  const [fusion, scenario] = await Promise.all([
    getUnifiedFusion({ symbol }),
    Promise.resolve(getScenario(event)),
  ]);

  const history = getHistoricalMatches(event);
  const propagation = propagateByTheme(event);
  const graph = buildImpactGraph(event.includes(" ") ? event.split(" ")[0] : event);
  const affected = adjustAffected(event);

  const confidenceScore = Math.round((Number(fusion.unifiedConfidence || 60) + Number(history[0]?.similarity || 60)) / 2);
  const output = {
    event,
    symbol,
    confidenceScore,
    timeHorizon: inferTimeHorizon(event),
    historicalSimilarity: history,
    affected,
    relationshipGraph: graph,
    scenario,
    sectorPropagation: propagation,
    explainability: {
      why: buildWhy({ event, affected, history, propagation }),
      supportingEvidence: fusion.evidence,
      dataSourcesUsed: Object.entries(fusion.sourcesUsed).filter(([, value]) => value).map(([key]) => key),
      confidence: confidenceScore,
      possibleRisks: fusion.risks,
    },
  };

  set("intel:analyze", cacheKey, output, 15 * 60 * 1000);
  return output;
}

async function analyzeImpact({ event = "Fed rate hike", symbol = "AAPL" } = {}) {
  const cacheKey = JSON.stringify({ event, symbol }).toLowerCase();
  const cached = get("intel:impact", cacheKey);
  if (cached) {
    return cached;
  }

  const base = await analyzeIntelligence({ event, symbol });
  const result = {
    event,
    confidenceScore: base.confidenceScore,
    timeHorizon: base.timeHorizon,
    affected: base.affected,
    relationshipGraph: base.relationshipGraph,
    sectorPropagation: base.sectorPropagation,
  };

  set("intel:impact", cacheKey, result, 15 * 60 * 1000);
  return result;
}

function analyzeHistory({ event = "Fed rate hike" } = {}) {
  const cacheKey = String(event || "").toLowerCase();
  const cached = get("intel:history", cacheKey);
  if (cached) {
    return cached;
  }

  const result = {
    event,
    matches: getHistoricalMatches(event),
  };
  set("intel:history", cacheKey, result, 60 * 60 * 1000);
  return result;
}

function analyzeScenario({ event = "Fed rate hike" } = {}) {
  const cacheKey = String(event || "").toLowerCase();
  const cached = get("intel:scenario", cacheKey);
  if (cached) {
    return cached;
  }

  const result = {
    event,
    scenario: getScenario(event),
  };

  set("intel:scenario", cacheKey, result, 30 * 60 * 1000);
  return result;
}

function analyzePortfolioIntelligence({ holdings = [] } = {}) {
  const cacheKey = JSON.stringify(holdings || []);
  const cached = get("intel:portfolio", cacheKey);
  if (cached) {
    return cached;
  }

  const result = analyzePortfolio({ holdings });
  set("intel:portfolio", cacheKey, result, 10 * 60 * 1000);
  return result;
}

module.exports = {
  analyzeIntelligence,
  analyzeImpact,
  analyzeHistory,
  analyzeScenario,
  analyzePortfolioIntelligence,
};
