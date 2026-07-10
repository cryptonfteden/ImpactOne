const { getQuote, getPeerSymbols } = require("./finnhubService");

const positiveNewsKeywords = [
  "beat",
  "beats",
  "growth",
  "upgrade",
  "upgrades",
  "expands",
  "expansion",
  "partnership",
  "contract",
  "guidance raise",
  "record",
  "strong",
  "launch",
  "launches",
  "wins",
  "approval",
];

const negativeNewsKeywords = [
  "miss",
  "misses",
  "downgrade",
  "downgrades",
  "probe",
  "lawsuit",
  "cuts",
  "cut",
  "warning",
  "slows",
  "slowdown",
  "recall",
  "delay",
  "weak",
  "fraud",
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mean(values = []) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values = []) {
  if (!values.length) {
    return 0;
  }

  const average = mean(values);
  const variance = mean(values.map((value) => (value - average) ** 2));
  return Math.sqrt(variance);
}

function parseFearGreedScore(fearGreed) {
  if (!fearGreed) {
    return 50;
  }

  const value = Number(fearGreed.value);
  if (Number.isFinite(value)) {
    return clamp(value, 0, 100);
  }

  const classification = String(fearGreed.classification || fearGreed.value_classification || "Neutral").toLowerCase();
  if (classification.includes("extreme fear")) return 20;
  if (classification.includes("fear")) return 35;
  if (classification.includes("greed") && !classification.includes("extreme")) return 68;
  if (classification.includes("extreme greed")) return 82;
  return 50;
}

function extractNewsText(news = []) {
  return news
    .slice(0, 6)
    .map((item) => `${item.headline || ""} ${item.summary || ""}`.trim().toLowerCase())
    .filter(Boolean);
}

function analyzeNewsSentiment(news = []) {
  const textItems = extractNewsText(news);
  if (!textItems.length) {
    return {
      score: 50,
      label: "Neutral",
      summary: "No fresh news catalyst found.",
    };
  }

  let score = 50;
  for (const text of textItems) {
    for (const keyword of positiveNewsKeywords) {
      if (text.includes(keyword)) {
        score += 4;
      }
    }
    for (const keyword of negativeNewsKeywords) {
      if (text.includes(keyword)) {
        score -= 4;
      }
    }
  }

  score = clamp(score, 0, 100);
  const label = score >= 65 ? "Positive" : score <= 40 ? "Negative" : "Neutral";
  return {
    score,
    label,
    summary: label === "Positive"
      ? "News flow is supportive and leans positive for the stock."
      : label === "Negative"
        ? "News flow is defensive or pressured and is weighing on sentiment."
        : "News flow is mixed and not driving a strong directional move.",
  };
}

function analyzePriceMomentum(quote = {}, chart = []) {
  const currentChange = Number(quote.change || 0);
  const recentChart = Array.isArray(chart) ? chart.filter((point) => Number.isFinite(point?.value)) : [];
  const chartReturn = recentChart.length > 1
    ? ((recentChart[recentChart.length - 1].value - recentChart[0].value) / recentChart[0].value) * 100
    : 0;

  const score = clamp(50 + currentChange * 4 + chartReturn * 0.75, 0, 100);
  const label = score >= 65 ? "Positive" : score <= 40 ? "Negative" : "Mixed";

  return {
    score,
    label,
    summary: `${quote.symbol || "The stock"} is ${currentChange >= 0 ? "higher" : "lower"} ${Math.abs(currentChange).toFixed(2)}% on the day${chartReturn ? ` and ${chartReturn >= 0 ? "up" : "down"} ${Math.abs(chartReturn).toFixed(1)}% over the recent chart window` : ""}.`,
  };
}

function analyzeVolatility(chart = []) {
  const closes = Array.isArray(chart) ? chart.map((point) => Number(point?.value)).filter(Number.isFinite) : [];
  if (closes.length < 5) {
    return {
      score: 50,
      label: "Moderate",
      summary: "Recent volatility data is limited.",
    };
  }

  const returns = [];
  for (let index = 1; index < closes.length; index += 1) {
    const previous = closes[index - 1];
    const current = closes[index];
    if (previous) {
      returns.push(((current - previous) / previous) * 100);
    }
  }

  const deviation = standardDeviation(returns);
  const score = clamp(100 - deviation * 12, 0, 100);
  const label = score >= 70 ? "Low" : score <= 40 ? "High" : "Moderate";

  return {
    score,
    label,
    summary: `Recent price swings are ${label.toLowerCase()} with approximately ${deviation.toFixed(2)}% daily volatility.`,
  };
}

function analyzeRecommendation(recommendation = {}, recommendationTrend = {}) {
  const label = String(recommendation.label || "Hold");
  const direction = String(recommendationTrend.direction || "Flat");

  let score = 50;
  if (label === "Strong Buy") {
    score += 22;
  } else if (label === "Buy") {
    score += 12;
  } else if (label === "Sell") {
    score -= 20;
  }

  if (direction === "Improving") {
    score += 10;
  } else if (direction === "Weakening") {
    score -= 10;
  }

  score = clamp(score, 0, 100);
  return {
    score,
    label: score >= 65 ? "Positive" : score <= 40 ? "Negative" : "Neutral",
    summary: recommendationTrend.summary || recommendation.reason || "Analyst sentiment is stable.",
  };
}

function buildWhyMovingToday({ symbol, quote, news = [], recommendationTrend = {}, marketImpactScore }) {
  const bullets = [];
  const latestNews = news.slice(0, 3);

  if (latestNews.length) {
    const headline = latestNews[0].headline || latestNews[0].summary || `${symbol} has fresh news flow.`;
    bullets.push(`Latest coverage centers on: ${headline}`);
  }

  bullets.push(`${symbol} is ${Number(quote?.change || 0) >= 0 ? "up" : "down"} ${Math.abs(Number(quote?.change || 0)).toFixed(2)}% today, which is contributing to short-term momentum.`);

  if (recommendationTrend?.summary) {
    bullets.push(`Analyst tape: ${recommendationTrend.summary}`);
  }

  const eventHeadline = latestNews.find((item) => /earnings|guidance|contract|launch|product|partnership|deal|upgrade|downgrade/i.test(`${item.headline || ""} ${item.summary || ""}`));
  if (eventHeadline) {
    bullets.push(`Company event signal: ${eventHeadline.headline}`);
  }

  bullets.push(`Market Impact Score is ${marketImpactScore}/100, suggesting ${marketImpactScore >= 70 ? "strong event-driven momentum" : marketImpactScore >= 50 ? "mixed but tradable movement" : "cautious conditions"}.`);

  return bullets.slice(0, 6);
}

function determineSectorMovement(symbolChange, peerChanges = []) {
  if (!peerChanges.length) {
    return {
      type: "company-specific",
      summary: "Insufficient peer data to confirm sector-wide movement.",
    };
  }

  const avgPeer = mean(peerChanges);
  const peersMoveWithStock = Math.sign(avgPeer) === Math.sign(symbolChange) && Math.abs(avgPeer - symbolChange) <= 1.75;

  if (peersMoveWithStock) {
    return {
      type: "sector-wide",
      summary: "The broader sector is moving with this stock rather than this being a single-name move.",
    };
  }

  return {
    type: "company-specific",
    summary: "This looks more company-specific than a full sector move.",
  };
}

async function getRelatedCompanies(symbol, count = 3) {
  const peerSymbols = await getPeerSymbols(symbol, count);
  const rows = [];

  for (const peerSymbol of peerSymbols) {
    try {
      const payload = await getQuote(peerSymbol);
      rows.push({
        symbol: payload.quote?.symbol || peerSymbol,
        company: payload.company?.name || peerSymbol,
        priceChange: Number(payload.quote?.change || 0),
        marketCap: payload.quote?.marketCap || "--",
        pe: payload.quote?.pe || "--",
        recommendation: payload.recommendation?.label || "Hold",
      });
    } catch (error) {
      rows.push({
        symbol: peerSymbol,
        company: peerSymbol,
        priceChange: 0,
        marketCap: "--",
        pe: "--",
        recommendation: "Hold",
      });
    }
  }

  return rows;
}

function buildMarketOpportunities(symbol, company, quote, relatedCompanies, marketImpactScore) {
  const baseDirection = Number(quote?.change || 0) >= 0 ? "benefit" : "hurt";

  return relatedCompanies.slice(0, 3).map((item, index) => ({
    symbol: item.symbol,
    company: item.company,
    thesis: `${item.company} could ${baseDirection} if the same event spreads across the ${company?.industry || "sector"} group.`,
    direction: baseDirection,
    reason: index === 0
      ? `Closest comparable to ${symbol} in the current market tape.`
      : marketImpactScore >= 60
        ? "Momentum spillover candidate"
        : "Watch for secondary effect",
  }));
}

async function analyzeMarketImpact(symbol, context = {}) {
  try {
    const normalizedSymbol = (symbol || "NVDA").toUpperCase();
    const quote = context.quote || {};
    const company = context.company || {};
    const recommendation = context.recommendation || {};
    const recommendationTrend = context.recommendationTrend || {};
    const news = context.news || [];
    const chart = context.chart || [];
    const fearGreed = context.fearGreed || null;

    const newsAnalysis = analyzeNewsSentiment(news);
    const momentumAnalysis = analyzePriceMomentum(quote, chart);
    const volatilityAnalysis = analyzeVolatility(chart);
    const analystAnalysis = analyzeRecommendation(recommendation, recommendationTrend);
    const fearGreedScore = parseFearGreedScore(fearGreed);

    const marketImpactScore = Math.round(
      newsAnalysis.score * 0.25 +
        analystAnalysis.score * 0.2 +
        momentumAnalysis.score * 0.25 +
        fearGreedScore * 0.15 +
        volatilityAnalysis.score * 0.15
    );

    const relatedCompanies = await getRelatedCompanies(normalizedSymbol, 3);
    const peerChanges = relatedCompanies.map((item) => item.priceChange).filter((value) => Number.isFinite(value));
    const sectorMovement = determineSectorMovement(Number(quote?.change || 0), peerChanges);

    return {
      marketImpactScore,
      marketImpactLabel: marketImpactScore >= 75 ? "Very High" : marketImpactScore >= 60 ? "High" : marketImpactScore >= 45 ? "Moderate" : "Low",
      breakdown: {
        newsSentiment: newsAnalysis,
        analystTrend: analystAnalysis,
        priceMomentum: momentumAnalysis,
        fearGreed: {
          score: fearGreedScore,
          label: fearGreed?.classification || fearGreed?.value_classification || "Neutral",
        },
        volatility: volatilityAnalysis,
      },
      whyMovingToday: buildWhyMovingToday({
        symbol: normalizedSymbol,
        quote,
        news,
        recommendationTrend,
        marketImpactScore,
      }),
      sectorImpact: {
        sector: company.industry || company.sector || "Unknown",
        industry: company.industry || "Unknown",
        topCompetitors: relatedCompanies.map((item) => ({
          symbol: item.symbol,
          company: item.company,
          priceChange: item.priceChange,
          marketCap: item.marketCap,
        })),
        movement: sectorMovement.type,
        summary: sectorMovement.summary,
      },
      marketOpportunities: buildMarketOpportunities(normalizedSymbol, company, quote, relatedCompanies, marketImpactScore),
    };
  } catch (error) {
    return {
      marketImpactScore: 50,
      marketImpactLabel: "Moderate",
      breakdown: {
        newsSentiment: { score: 50, label: "Neutral", summary: "Market impact sentiment is unavailable." },
        analystTrend: { score: 50, label: "Neutral", summary: "Analyst trend is unavailable." },
        priceMomentum: { score: 50, label: "Mixed", summary: "Price momentum is unavailable." },
        fearGreed: { score: 50, label: "Neutral" },
        volatility: { score: 50, label: "Moderate", summary: "Volatility data is unavailable." },
      },
      whyMovingToday: ["Market impact details are temporarily unavailable because peer data could not be fetched."],
      sectorImpact: {
        sector: context.company?.industry || context.company?.sector || "Unknown",
        industry: context.company?.industry || "Unknown",
        topCompetitors: [],
        movement: "unknown",
        summary: error?.message || "Sector impact data is unavailable.",
      },
      marketOpportunities: [],
      providerNotice: error?.message || "Market impact data is currently unavailable.",
    };
  }
}

module.exports = { analyzeMarketImpact };
