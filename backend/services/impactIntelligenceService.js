const { get, set } = require("./intelligenceCache");
const { buildImpactGraph } = require("./relationshipGraphService");
const { getHistoricalMatches } = require("./historicalSimilarityService");
const { getScenario } = require("./scenarioEngineService");
const { propagateByTheme } = require("./propagationEngineService");
const { analyzePortfolio } = require("./portfolioIntelligenceService");
const { getUnifiedFusion } = require("./alternativeFusionService");

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

function adjustAffected(event = "") {
  const text = String(event || "").toLowerCase();
  const output = JSON.parse(JSON.stringify(assetTemplates));

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
      why: `The event '${event}' affects cross-asset pricing through macro regime, positioning, and liquidity channels.`,
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
