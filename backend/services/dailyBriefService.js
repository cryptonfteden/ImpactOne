const axios = require("axios");
const { OPENAI_API_KEY } = require("../config/env");
const { getQuote } = require("./finnhubService");
const { getAltDataSummary } = require("./altDataService");
const {
  analyzeIntelligence,
  analyzePortfolioIntelligence,
} = require("./impactIntelligenceService");
const { get, set } = require("./intelligenceCache");
const { captureTodaySnapshot } = require("./dailyBriefArchiveService");

const DEFAULT_SCENARIOS = ["Oil spike", "Fed rate hike", "BTC ETF approval", "Israel conflict"];

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeWatchlist(watchlist = []) {
  const normalized = watchlist
    .map((item) => String(item || "").trim().toUpperCase())
    .filter(Boolean);
  return normalized.length ? unique(normalized) : ["AAPL", "NVDA", "TSLA"];
}

function inferImpactType(score) {
  if (score >= 72) return "opportunity";
  if (score <= 45) return "risk";
  return "neutral";
}

function inferUrgency(score) {
  if (score >= 75 || score <= 30) return "high";
  if (score >= 60 || score <= 45) return "medium";
  return "low";
}

function scoreImportance({ watchlist, sectors, tickers, confidenceScore, event }) {
  const wl = new Set(watchlist);
  const relatedTickers = (tickers || []).map((item) => String(item || "").toUpperCase());
  const tickerOverlap = relatedTickers.filter((item) => wl.has(item)).length;
  const sectorSignal = (sectors || []).length >= 3 ? 10 : (sectors || []).length * 3;
  const eventBonus = String(event || "").toLowerCase().includes("fed") ? 8 : 0;
  return clamp(Math.round(Number(confidenceScore || 50) * 0.7 + tickerOverlap * 12 + sectorSignal + eventBonus), 0, 100);
}

function buildActionCards(relevanceItems = []) {
  const byType = {
    risk: relevanceItems.filter((item) => item.impactType === "risk").sort((a, b) => b.importanceScore - a.importanceScore),
    opportunity: relevanceItems.filter((item) => item.impactType === "opportunity").sort((a, b) => b.importanceScore - a.importanceScore),
    neutral: relevanceItems.filter((item) => item.impactType === "neutral").sort((a, b) => b.importanceScore - a.importanceScore),
  };

  return [
    {
      type: "Needs attention",
      item: relevanceItems.slice().sort((a, b) => b.importanceScore - a.importanceScore)[0] || null,
    },
    {
      type: "Opportunity detected",
      item: byType.opportunity[0] || null,
    },
    {
      type: "Risk increasing",
      item: byType.risk[0] || null,
    },
    {
      type: "Macro event today",
      item: relevanceItems.find((item) => String(item.event || "").toLowerCase().includes("fed") || String(item.event || "").toLowerCase().includes("oil")) || null,
    },
    {
      type: "Watchlist movement",
      item: relevanceItems.find((item) => (item.relatedTickers || []).length > 0) || null,
    },
    {
      type: "Ignore for now",
      item: byType.neutral[0] || null,
    },
  ];
}

function buildRuleSummary({ topRisks, topOpportunities, watchlist, overnight, relevanceItems }) {
  const focus = relevanceItems
    .slice()
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 3)
    .map((item) => `${item.event} (${item.importanceScore}/100)`);

  return {
    executiveSummary: `Overnight conditions suggest selective risk-taking with elevated macro cross-currents across ${watchlist.join(", ")}.`,
    keyRisks: topRisks.slice(0, 4),
    keyOpportunities: topOpportunities.slice(0, 4),
    watchlistImpact: overnight.map((item) => `${item.symbol}: ${item.change >= 0 ? "+" : ""}${item.change.toFixed(2)}%`).join(" | "),
    todaysFocus: focus.length ? focus : ["Monitor macro catalysts and watchlist volatility."],
    confidenceScore: clamp(Math.round(relevanceItems.reduce((sum, item) => sum + Number(item.importanceScore || 0), 0) / Math.max(relevanceItems.length, 1)), 0, 100),
    providerNotice: "Using rule-based daily brief summary.",
    source: "fallback",
  };
}

async function generateAiSummary(payload, fallback) {
  if (!OPENAI_API_KEY) {
    return {
      ...fallback,
      providerNotice: "OpenAI is not configured. Using rule-based summary.",
      source: "fallback",
    };
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
            content: "You are a professional buy-side strategist. Return strict JSON keys only: executiveSummary, keyRisks, keyOpportunities, watchlistImpact, todaysFocus, confidenceScore.",
          },
          {
            role: "user",
            content: `Generate a concise daily investor brief from this context: ${JSON.stringify(payload).slice(0, 14000)}`,
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
      keyRisks: Array.isArray(parsed.keyRisks) ? parsed.keyRisks : fallback.keyRisks,
      keyOpportunities: Array.isArray(parsed.keyOpportunities) ? parsed.keyOpportunities : fallback.keyOpportunities,
      watchlistImpact: parsed.watchlistImpact || fallback.watchlistImpact,
      todaysFocus: Array.isArray(parsed.todaysFocus) ? parsed.todaysFocus : fallback.todaysFocus,
      confidenceScore: clamp(Number(parsed.confidenceScore || fallback.confidenceScore), 0, 100),
      providerNotice: null,
      source: "openai",
    };
  } catch (error) {
    return {
      ...fallback,
      providerNotice: "OpenAI brief generation failed. Using rule-based summary.",
      source: "fallback",
    };
  }
}

function buildChangedSinceYesterday(current, previous) {
  if (!previous) {
    return [
      "Initial autonomous brief generated; baseline established for future day-over-day tracking.",
    ];
  }

  const currentTop = current.relevanceItems.slice().sort((a, b) => b.importanceScore - a.importanceScore)[0];
  const previousTop = previous.relevanceItems.slice().sort((a, b) => b.importanceScore - a.importanceScore)[0];
  const changes = [];

  if (currentTop && previousTop && currentTop.event !== previousTop.event) {
    changes.push(`Top driver shifted from ${previousTop.event} to ${currentTop.event}.`);
  }

  const currentRisk = current.topRisks[0];
  const previousRisk = previous.topRisks[0];
  if (currentRisk && previousRisk && currentRisk !== previousRisk) {
    changes.push(`Primary risk focus changed from '${previousRisk}' to '${currentRisk}'.`);
  }

  return changes.length ? changes : ["No material regime shift detected vs the prior brief snapshot."];
}

async function getDailyBrief({
  watchlist = ["AAPL", "NVDA", "TSLA"],
  scenarios = DEFAULT_SCENARIOS,
  sessionType = "morning",
} = {}) {
  const normalizedWatchlist = normalizeWatchlist(watchlist);
  const normalizedScenarios = (scenarios || []).length ? scenarios : DEFAULT_SCENARIOS;
  const cacheKey = JSON.stringify({ watchlist: normalizedWatchlist, scenarios: normalizedScenarios, sessionType });
  const cached = get("intel:dailyBrief", cacheKey);
  if (cached) {
    return cached;
  }

  const overnight = await Promise.all(
    normalizedWatchlist.map(async (symbol) => {
      const quote = await getQuote(symbol).catch(() => null);
      return {
        symbol,
        change: Number(quote?.quote?.change || 0),
        price: Number(quote?.quote?.price || 0),
        trend: Number(quote?.quote?.change || 0) >= 0 ? "up" : "down",
      };
    })
  );

  const anchorSymbol = normalizedWatchlist[0] || "AAPL";
  const [altSummary, scenarioAnalyses] = await Promise.all([
    getAltDataSummary({ symbol: anchorSymbol }).catch(() => null),
    Promise.all(
      normalizedScenarios.map(async (event) => {
        const analysis = await analyzeIntelligence({ event, symbol: anchorSymbol });
        return analysis;
      })
    ),
  ]);

  const relevanceItems = scenarioAnalyses.map((analysis) => {
    const sectors = analysis?.affected?.sectors || [];
    const tickers = analysis?.affected?.stocks || [];
    const importanceScore = scoreImportance({
      watchlist: normalizedWatchlist,
      sectors,
      tickers,
      confidenceScore: analysis?.confidenceScore,
      event: analysis?.event,
    });

    return {
      event: analysis?.event,
      importanceScore,
      urgency: inferUrgency(importanceScore),
      impactType: inferImpactType(importanceScore),
      relatedTickers: unique([...(tickers || []), ...normalizedWatchlist.filter((ticker) => (tickers || []).includes(ticker))]).slice(0, 8),
      relatedSectors: sectors.slice(0, 6),
      timeHorizon: analysis?.timeHorizon || "1-3 months",
      explanation: analysis?.explainability?.why || "Event impact is derived from cross-asset propagation and regime sensitivity.",
      confidenceScore: analysis?.confidenceScore || 0,
    };
  });

  const impactedSectors = unique(relevanceItems.flatMap((item) => item.relatedSectors)).slice(0, 10);
  const impactedTickers = unique(relevanceItems.flatMap((item) => item.relatedTickers)).slice(0, 12);
  const topRisks = unique(
    scenarioAnalyses.flatMap((analysis) => analysis?.explainability?.possibleRisks || [])
  ).slice(0, 6);
  const topOpportunities = unique(
    scenarioAnalyses.flatMap((analysis) => analysis?.scenario?.expectedSectorRotation || [])
  ).slice(0, 6);

  const portfolioInput = normalizedWatchlist.map((symbol) => ({ symbol, weight: 1 / normalizedWatchlist.length }));
  const watchlistExposure = analyzePortfolioIntelligence({ holdings: portfolioInput });
  const actionCards = buildActionCards(relevanceItems);

  const provisional = {
    generatedAt: new Date().toISOString(),
    sessionType,
    overnightMarketChanges: overnight,
    topMarketMovingEvents: relevanceItems.slice().sort((a, b) => b.importanceScore - a.importanceScore).slice(0, 4),
    impactedSectors,
    impactedTickers,
    portfolioWatchlistExposure: watchlistExposure,
    topRisks,
    topOpportunities,
    whatToMonitorToday: relevanceItems
      .slice()
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, 4)
      .map((item) => `${item.event} (${item.urgency} urgency, ${item.impactType})`),
    relevanceItems,
    actionCards,
    dataModel: {
      morningBrief: { supported: true, generatedAt: new Date().toISOString() },
      marketCloseRecap: { supported: true, generatedAt: null },
      weeklySummary: { supported: true, generatedAt: null },
    },
    altSignalsSnapshot: altSummary?.signals || null,
  };

  const previous = get("intel:dailyBrief:previous", cacheKey) || null;
  const withChange = {
    ...provisional,
    whatChangedSinceYesterday: buildChangedSinceYesterday(provisional, previous),
  };

  const fallbackSummary = buildRuleSummary({
    topRisks: withChange.topRisks,
    topOpportunities: withChange.topOpportunities,
    watchlist: normalizedWatchlist,
    overnight,
    relevanceItems,
  });

  const aiSummary = await generateAiSummary(withChange, fallbackSummary);
  const result = {
    ...withChange,
    aiSummary,
  };

  set("intel:dailyBrief", cacheKey, result, 5 * 60 * 1000);
  set("intel:dailyBrief:previous", cacheKey, result, 36 * 60 * 60 * 1000);

  // Best-effort: the archive (Sprint 15 §4.9) must never break the brief
  // itself, e.g. if DATABASE_URL isn't configured in a given environment.
  captureTodaySnapshot(result).catch(() => null);

  return result;
}

module.exports = { getDailyBrief };
