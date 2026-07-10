const axios = require("axios");
const { OPENAI_API_KEY } = require("../config/env");
const { getQuote } = require("./finnhubService");
const { getAltDataSummary } = require("./altDataService");
const { analyzeMarketImpact } = require("./marketImpactService");
const { analyzeIntelligence } = require("./impactIntelligenceService");
const { get, set } = require("./intelligenceCache");
const { upsertCommitteeDecision, getCommitteeTrackRecord } = require("./committeeTrackRecordService");

const COMMITTEE_VOTES = ["Strong Buy", "Buy", "Hold", "Reduce", "Sell", "Strong Sell"];
const ASSET_ALIASES = {
  BTC: { displaySymbol: "BTC", proxySymbol: "BTC", assetClass: "crypto", defaultEvent: "BTC ETF approval" },
  OIL: { displaySymbol: "Oil", proxySymbol: "XOM", assetClass: "commodity", defaultEvent: "Oil spike" },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeVote(vote = "Hold") {
  const normalized = String(vote || "Hold").trim();
  return COMMITTEE_VOTES.includes(normalized) ? normalized : "Hold";
}

function scoreVote(vote = "Hold") {
  return {
    "Strong Buy": 3,
    Buy: 2,
    Hold: 0,
    Reduce: -1,
    Sell: -2,
    "Strong Sell": -3,
  }[normalizeVote(vote)] || 0;
}

function resolveAsset(symbol = "AAPL") {
  const normalized = String(symbol || "AAPL").trim().toUpperCase();
  return {
    normalized,
    displaySymbol: ASSET_ALIASES[normalized]?.displaySymbol || normalized,
    proxySymbol: ASSET_ALIASES[normalized]?.proxySymbol || normalized,
    assetClass: ASSET_ALIASES[normalized]?.assetClass || "equity",
    defaultEvent: ASSET_ALIASES[normalized]?.defaultEvent || `${normalized} earnings`,
  };
}

function inferEventFromContext(asset, context = {}) {
  const headline = context.news?.[0]?.headline || "";
  if (headline) {
    return headline;
  }
  return asset.defaultEvent;
}

function inferTrendFromChart(chart = []) {
  if (!Array.isArray(chart) || chart.length < 2) {
    return "flat";
  }
  const first = Number(chart[0]?.value || 0);
  const last = Number(chart[chart.length - 1]?.value || 0);
  if (last > first * 1.03) return "uptrend";
  if (last < first * 0.97) return "downtrend";
  return "range-bound";
}

function voteFromScore(score) {
  if (score >= 85) return "Strong Buy";
  if (score >= 68) return "Buy";
  if (score >= 48) return "Hold";
  if (score >= 32) return "Reduce";
  if (score >= 16) return "Sell";
  return "Strong Sell";
}

function buildMacroStrategist({ asset, context, altSignals, intelligence, marketImpact }) {
  const macro = altSignals?.macroRegime || {};
  const prediction = Number(altSignals?.predictionMarketProbabilities?.probability || 0.5);
  const baseScore = 50
    + (macro.riskMode === "risk-on" ? 10 : -8)
    + (macro.inflationPressure === "low" ? 6 : macro.inflationPressure === "high" ? -8 : 0)
    + (macro.recessionRisk === "low" ? 6 : macro.recessionRisk === "high" ? -10 : -2)
    + (intelligence?.affected?.stocks || []).includes(asset.proxySymbol) * 8
    + (prediction > 0.6 ? 6 : prediction < 0.45 ? -6 : 0)
    + (Number(marketImpact?.marketImpactScore || 50) - 50) * 0.15;
  const confidence = clamp(Math.round((Number(intelligence?.confidenceScore || 50) + Number(altSignals?.confidenceScore || 50)) / 2), 35, 92);

  return {
    agent: "Macro Strategist",
    focus: ["Rates", "Inflation", "Fed", "COT", "Macro", "Currencies", "Yield Curve", "Global Economy"],
    bullArguments: [
      `Macro regime is currently ${macro.riskMode || "mixed"}, which is supportive for ${asset.displaySymbol} if risk appetite holds.`,
      altSignals?.smartMoneyPositioning?.signal
        ? `Institutional positioning shows ${altSignals.smartMoneyPositioning.signal.toLowerCase()} in the relevant macro complex.`
        : `Macro positioning does not show a clear negative skew against ${asset.displaySymbol}.`,
    ],
    bearArguments: [
      `Inflation pressure is ${macro.inflationPressure || "uncertain"}, which can tighten valuation multiples quickly.`,
      `Recession risk is ${macro.recessionRisk || "uncertain"}, so macro downside remains a real drag on expected returns.`,
    ],
    confidence,
    supportingEvidence: [
      `Risk mode: ${macro.riskMode || "N/A"}`,
      `Inflation: ${macro.inflationPressure || "N/A"}`,
      `Recession: ${macro.recessionRisk || "N/A"}`,
      `Prediction market probability: ${Math.round(prediction * 100)}%`,
    ],
    unknowns: [
      "Next macro data release could change the regime quickly.",
      "Policy communication may invalidate the current macro read.",
    ],
    vote: voteFromScore(baseScore),
  };
}

function buildEquityAnalyst({ asset, context, intelligence, recommendation }) {
  const change = Number(context.quote?.change || 0);
  const pe = context.quote?.pe === "--" ? null : Number(context.quote?.pe);
  const rating = String(recommendation?.label || recommendation?.investmentRating || "Hold");
  const qualityBoost = rating.includes("Buy") ? 12 : rating === "Hold" ? 2 : -10;
  const valuationPenalty = Number.isFinite(pe) ? (pe > 40 ? -10 : pe < 20 ? 6 : 0) : 0;
  const proxyBoost = (intelligence?.affected?.stocks || []).includes(asset.proxySymbol) ? 8 : 0;
  const baseScore = 52 + qualityBoost + valuationPenalty + proxyBoost + (change > 0 ? 5 : change < 0 ? -4 : 0);
  const confidence = clamp(Math.round((Number(intelligence?.confidenceScore || 50) + 58) / 2), 35, 90);

  const valuationText = Number.isFinite(pe) ? `P/E is ${pe.toFixed(1)}` : "Valuation multiple is not available";
  const assetSpecificBull = asset.assetClass === "equity"
    ? `${context.company?.name || asset.displaySymbol} retains business quality that can support upside if execution remains solid.`
    : `${asset.displaySymbol} can still benefit if the underlying demand narrative continues to strengthen.`;
  const assetSpecificBear = asset.assetClass === "equity"
    ? `Competitive pressure or margin disappointment would weaken the investment case quickly.`
    : `${asset.displaySymbol} lacks company-specific margin support and depends heavily on macro follow-through.`;

  return {
    agent: "Equity Analyst",
    focus: ["Company", "Valuation", "Growth", "Margins", "Competition", "Management", "Financial Statements"],
    bullArguments: [
      assetSpecificBull,
      `${valuationText}, while analyst posture currently reads ${rating}.`,
    ],
    bearArguments: [
      assetSpecificBear,
      `Consensus can reverse quickly if growth slows or expectations were too high.`,
    ],
    confidence,
    supportingEvidence: [
      `Analyst posture: ${rating}`,
      valuationText,
      `Market cap: ${context.quote?.marketCap || "N/A"}`,
      `Price change: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
    ],
    unknowns: [
      "Future earnings quality is still uncertain.",
      "Management execution and guidance remain open variables.",
    ],
    vote: voteFromScore(baseScore),
  };
}

function buildTechnicalAnalyst({ context, marketImpact }) {
  const trend = inferTrendFromChart(context.chart || []);
  const change = Number(context.quote?.change || 0);
  const fearGreed = Number(context.fearGreed?.value || 50);
  const volatilityLabel = marketImpact?.breakdown?.volatility?.label || "Moderate";
  const baseScore = 50
    + (trend === "uptrend" ? 14 : trend === "downtrend" ? -14 : 0)
    + (change > 0 ? 8 : change < 0 ? -8 : 0)
    + (fearGreed > 60 ? 5 : fearGreed < 40 ? -5 : 0)
    + (volatilityLabel === "High" ? -6 : 0);
  const confidence = clamp(Math.round((Number(marketImpact?.marketImpactScore || 50) + 52) / 2), 30, 88);

  return {
    agent: "Technical Analyst",
    focus: ["Trend", "Momentum", "Support", "Resistance", "Volume", "Volatility", "Market Structure"],
    bullArguments: [
      `Current structure is ${trend}, which improves the technical setup when follow-through exists.`,
      `Momentum is ${change >= 0 ? "positive" : "negative"} at ${change >= 0 ? "+" : ""}${change.toFixed(2)}% on the day.`,
    ],
    bearArguments: [
      `Volatility is currently labeled ${volatilityLabel.toLowerCase()}, which can invalidate near-term technical levels.`,
      `If momentum fades, support can fail quickly and turn the trade into a mean-reversion setup.`,
    ],
    confidence,
    supportingEvidence: [
      `Trend: ${trend}`,
      `Daily move: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
      `Fear & Greed: ${fearGreed}`,
      `Volatility: ${volatilityLabel}`,
    ],
    unknowns: [
      "Intraday volume confirmation is limited.",
      "Support and resistance can shift after the next catalyst.",
    ],
    vote: voteFromScore(baseScore),
  };
}

function buildAlternativeDataAnalyst({ altSignals, intelligence }) {
  const prediction = Number(altSignals?.predictionMarketProbabilities?.probability || 0.5);
  const smartMoney = String(altSignals?.smartMoneyPositioning?.signal || "Neutral");
  const political = String(altSignals?.politicalTradingSignal || "No active signal.");
  const secSignal = String(altSignals?.secFilingSignal || "No SEC signal.");
  const baseScore = 50
    + (prediction > 0.62 ? 10 : prediction < 0.4 ? -10 : 0)
    + (smartMoney.toLowerCase().includes("bull") ? 10 : smartMoney.toLowerCase().includes("bear") ? -10 : 0)
    + (secSignal.toLowerCase().includes("risk") ? -6 : 2)
    + (political.toLowerCase().includes("buy") ? 5 : 0)
    + ((intelligence?.explainability?.dataSourcesUsed || []).length >= 4 ? 6 : 0);
  const confidence = clamp(Math.round((Number(altSignals?.confidenceScore || 50) + Number(intelligence?.confidenceScore || 50)) / 2), 35, 91);

  return {
    agent: "Alternative Data Analyst",
    focus: ["Polymarket", "Congress Trading", "SEC", "Fear & Greed", "News", "Institutional positioning", "Prediction markets"],
    bullArguments: [
      `Prediction markets imply ${Math.round(prediction * 100)}% probability on the current macro narrative.`,
      `Alternative positioning reads ${smartMoney.toLowerCase()}, which can reinforce directional conviction.`,
    ],
    bearArguments: [
      `SEC or political signals can become adverse quickly and are not always durable alpha sources.`,
      `Alternative data can overstate crowding when liquidity is thin or narrative positioning is extreme.`,
    ],
    confidence,
    supportingEvidence: [
      `Prediction trend: ${altSignals?.predictionMarketProbabilities?.trend || "N/A"}`,
      `Smart money: ${smartMoney}`,
      `SEC: ${secSignal}`,
      `Political: ${political}`,
    ],
    unknowns: [
      "Alternative data can change before price fully reacts.",
      "Institutional positioning may reverse around the next catalyst.",
    ],
    vote: voteFromScore(baseScore),
  };
}

function buildRiskManager({ asset, intelligence, marketImpact, context }) {
  const change = Number(context.quote?.change || 0);
  const impactScore = Number(marketImpact?.marketImpactScore || 50);
  const confidence = clamp(Math.round((Number(intelligence?.confidenceScore || 50) + 62) / 2), 40, 95);
  const baseScore = 38 - (impactScore > 65 ? 10 : 0) - (change < -2 ? 12 : 0) - (asset.assetClass === "commodity" ? 6 : 0);

  return {
    agent: "Risk Manager",
    focus: ["Worst case", "Tail risk", "Liquidity", "Volatility", "Hidden risks"],
    bullArguments: [
      `If the thesis works, upside can compound because the current debate is still unresolved.`,
      `Known catalysts provide a framework for risk sizing and monitoring.`,
    ],
    bearArguments: [
      `Tail risk remains elevated if the core catalyst is wrong or already priced in.`,
      `Liquidity, volatility, and crowded positioning can produce losses even when the long-term narrative is intact.`,
    ],
    confidence,
    supportingEvidence: [
      `Market impact score: ${impactScore}/100`,
      `Daily move: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
      `Top risk: ${(intelligence?.explainability?.possibleRisks || ["Macro repricing risk"])[0]}`,
    ],
    unknowns: [
      "Hidden balance-sheet or liquidity issues may not be visible yet.",
      "The market can react more violently than the base case implies.",
    ],
    vote: voteFromScore(baseScore),
  };
}

function buildRuleBasedCio(asset, agents) {
  const avgVoteScore = agents.reduce((sum, item) => sum + scoreVote(item.vote), 0) / Math.max(agents.length, 1);
  const decision = avgVoteScore >= 2.4 ? "Strong Buy"
    : avgVoteScore >= 1.4 ? "Buy"
      : avgVoteScore >= -0.4 ? "Hold"
        : avgVoteScore >= -1.4 ? "Reduce"
          : avgVoteScore >= -2.4 ? "Sell"
            : "Strong Sell";
  const confidence = clamp(Math.round(agents.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / Math.max(agents.length, 1)), 0, 100);
  const bullish = agents.flatMap((item) => item.bullArguments || []).slice(0, 4);
  const bearish = agents.flatMap((item) => item.bearArguments || []).slice(0, 4);

  return {
    executiveSummary: `${asset.displaySymbol} has been reviewed by a multi-disciplinary committee. The balance of views currently points to ${decision.toLowerCase()} with confidence ${confidence}/100.`,
    decision,
    expectedReturn: avgVoteScore >= 1.4 ? "12-18%" : avgVoteScore >= 0 ? "5-10%" : avgVoteScore >= -1.4 ? "-5% to 3%" : "-10% to -18%",
    risk: avgVoteScore >= 1.4 ? "Moderate" : avgVoteScore >= 0 ? "Balanced" : "Elevated",
    confidence,
    catalysts: bullish,
    threats: bearish,
    investmentHorizon: avgVoteScore >= 0 ? "3-12 months" : "1-6 months",
    portfolioAllocationSuggestion: avgVoteScore >= 1.4 ? "3-5% tactical allocation" : avgVoteScore >= 0 ? "1-3% starter position" : "Avoid adding size until risk improves",
    providerNotice: "Using rule-based CIO summary.",
    source: "fallback",
  };
}

async function buildOpenAiCioSummary(asset, agents, fallback) {
  if (!OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are the Chief Investment Officer. You never see raw data directly; you only read committee reports. Return strict JSON keys: executiveSummary, decision, expectedReturn, risk, confidence, catalysts, threats, investmentHorizon, portfolioAllocationSuggestion.",
          },
          {
            role: "user",
            content: `Asset: ${asset.displaySymbol}. Committee reports only: ${JSON.stringify(agents)}`,
          },
        ],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const parsed = JSON.parse(response.data?.choices?.[0]?.message?.content || "{}");
    return {
      executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
      decision: normalizeVote(parsed.decision || fallback.decision),
      expectedReturn: parsed.expectedReturn || fallback.expectedReturn,
      risk: parsed.risk || fallback.risk,
      confidence: clamp(Number(parsed.confidence || fallback.confidence), 0, 100),
      catalysts: Array.isArray(parsed.catalysts) ? parsed.catalysts : fallback.catalysts,
      threats: Array.isArray(parsed.threats) ? parsed.threats : fallback.threats,
      investmentHorizon: parsed.investmentHorizon || fallback.investmentHorizon,
      portfolioAllocationSuggestion: parsed.portfolioAllocationSuggestion || fallback.portfolioAllocationSuggestion,
      providerNotice: null,
      source: "openai",
    };
  } catch (error) {
    return {
      ...fallback,
      providerNotice: "OpenAI CIO synthesis failed. Using rule-based committee conclusion.",
      source: "fallback",
    };
  }
}

function buildDisagreement(agents) {
  const counts = agents.reduce((map, item) => {
    map[item.vote] = (map[item.vote] || 0) + 1;
    return map;
  }, {});
  const maxCount = Math.max(...Object.values(counts));
  const agreement = Math.round((maxCount / Math.max(agents.length, 1)) * 100);
  const score = 100 - agreement;
  const expertsDisagree = agreement < 60;
  const disagreementExplanation = expertsDisagree
    ? `Experts disagree because the committee splits across ${Object.entries(counts).map(([vote, count]) => `${vote} (${count})`).join(", ")}.`
    : "Committee alignment is high enough to support a cleaner final recommendation.";

  return {
    committeeAgreement: agreement,
    disagreementScore: score,
    expertsDisagree,
    disagreementExplanation,
    voteBreakdown: Object.entries(counts).map(([vote, count]) => ({ vote, count })),
  };
}

async function buildBaseContext(asset, incomingContext = {}) {
  if (incomingContext.quote || asset.assetClass === "commodity") {
    return incomingContext;
  }

  const quoteData = await getQuote(asset.proxySymbol).catch(() => null);
  if (!quoteData) {
    return incomingContext;
  }

  return {
    quote: quoteData.quote || null,
    company: quoteData.company || null,
    recommendation: quoteData.recommendation || null,
    recommendationTrend: quoteData.recommendationTrend || null,
    news: quoteData.news || [],
    chart: quoteData.chart || [],
    fearGreed: quoteData.fearGreed || null,
    metrics: quoteData.quote || null,
  };
}

async function analyzeInvestmentCommittee({ symbol = "NVDA", context = {}, intelligenceReport = null, altDataSummary = null, marketImpact = null } = {}) {
  const asset = resolveAsset(symbol);
  const cacheKey = JSON.stringify({ symbol: asset.normalized, context, intelligenceReport, hasAlt: Boolean(altDataSummary), hasImpact: Boolean(marketImpact) });
  const cached = get("committee:analyze", cacheKey);
  if (cached) {
    return cached;
  }

  const baseContext = await buildBaseContext(asset, context || {});
  const eventHint = inferEventFromContext(asset, baseContext);
  const [altSummary, intelligence, impact] = await Promise.all([
    altDataSummary ? Promise.resolve(altDataSummary) : getAltDataSummary({ symbol: asset.proxySymbol }).catch(() => null),
    intelligenceReport ? Promise.resolve(intelligenceReport) : analyzeIntelligence({ event: eventHint, symbol: asset.proxySymbol }).catch(() => null),
    marketImpact ? Promise.resolve(marketImpact) : analyzeMarketImpact(asset.proxySymbol, baseContext).catch(() => null),
  ]);

  const altSignals = altSummary?.signals || null;
  const macro = buildMacroStrategist({ asset, context: baseContext, altSignals, intelligence, marketImpact: impact });
  const equity = buildEquityAnalyst({ asset, context: baseContext, intelligence, recommendation: baseContext.recommendation });
  const technical = buildTechnicalAnalyst({ context: baseContext, marketImpact: impact });
  const alternative = buildAlternativeDataAnalyst({ altSignals, intelligence });
  const risk = buildRiskManager({ asset, intelligence, marketImpact: impact, context: baseContext });
  const agents = [macro, equity, technical, alternative, risk];
  const fallbackCio = buildRuleBasedCio(asset, agents);
  const cio = await buildOpenAiCioSummary(asset, agents, fallbackCio);
  const disagreement = buildDisagreement(agents);

  const recordSummary = upsertCommitteeDecision({
    symbol: asset.normalized,
    displaySymbol: asset.displaySymbol,
    generatedAt: new Date().toISOString(),
    finalDecision: cio.decision,
    confidence: cio.confidence,
    entryPrice: Number(baseContext.quote?.price || NaN),
    expectedReturn: cio.expectedReturn,
    disagreementScore: disagreement.disagreementScore,
    assetClass: asset.assetClass,
  });
  const trackRecord = await getCommitteeTrackRecord({ symbol: asset.normalized });

  const result = {
    symbol: asset.normalized,
    displaySymbol: asset.displaySymbol,
    committee: {
      generatedAt: new Date().toISOString(),
      eventHint,
      agents,
      cio,
      ...disagreement,
      trackRecordSummary: trackRecord.stats || recordSummary,
    },
    trackRecord,
  };

  set("committee:analyze", cacheKey, result, 10 * 60 * 1000);
  return result;
}

module.exports = {
  analyzeInvestmentCommittee,
};
