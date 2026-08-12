const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const port = Number(process.env.MISSION_CONTROL_PORT || 5175);
const backendUrl = process.env.IMPACTONE_API_URL || "http://127.0.0.1:5000";
const markets = [
  ["S&P 500", "SPY"], ["NASDAQ 100", "QQQ"], ["Dow Jones", "DIA"], ["Gold", "GLD"], ["Oil", "USO"],
];

app.use(express.json({ limit: "256kb" }));

function pickQuote(payload) {
  const source = payload?.quote || payload?.data?.quote || payload;
  const price = source?.price ?? source?.current ?? source?.c;
  const change = source?.changePercent ?? source?.percentChange ?? source?.dp ?? source?.change;
  return Number.isFinite(Number(price)) ? { price: Number(price), change: Number(change), volume: source?.volume || null } : null;
}

async function readApi(pathname, options = {}) {
  return axios.get(`${backendUrl}${pathname}`, { timeout: options.timeout || 9000, params: options.params }).then((result) => result.data).catch(() => null);
}

function localAssistantAnswer(question, context = {}) {
  const portfolio = context.portfolio || {};
  const positions = Array.isArray(portfolio.positions) ? portfolio.positions : [];
  const recommendations = Array.isArray(context.recommendations) ? context.recommendations : [];
  const signals = Array.isArray(context.topSignals) ? context.topSignals : [];
  const riskDecision = [...recommendations].sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0))[0];
  const largestPosition = [...positions].sort((a, b) => Number(b.marketValue || 0) - Number(a.marketValue || 0))[0];
  const topSignal = [...signals].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
  const lower = question.toLowerCase();
  if (lower.includes("risk") || lower.includes("סיכון")) {
    if (riskDecision) return `The highest current committee risk is ${riskDecision.symbol}: ${riskDecision.action} with risk ${Math.round(Number(riskDecision.riskScore || 0))}/100. ${riskDecision.reasoning || "Review this position before adding exposure."}`;
    if (largestPosition) return `${largestPosition.symbol} is your largest position at ${moneyValue(largestPosition.marketValue)} and is therefore your main concentration to monitor. No higher-confidence committee warning is active.`;
  }
  if (lower.includes("portfolio") || lower.includes("תיק")) return `Your portfolio is ${moneyValue(portfolio.totalValue)}, with ${positions.length} open positions and ${moneyValue(portfolio.cashBalance)} in cash. Total return is ${Number(portfolio.totalReturnPct || 0).toFixed(2)}%, while today's P/L is ${moneyValue(portfolio.dailyPnl)}.`;
  if (lower.includes("attention") || lower.includes("today") || lower.includes("היום")) return topSignal ? `Your highest-priority verified signal is “${topSignal.title}” at ${Math.round(Number(topSignal.score || 0))}/100. ${topSignal.detail || "Open the signal for the affected assets and supporting evidence."}` : "No verified high-priority signal is active right now.";
  return topSignal ? `Live ImpactOne summary: ${positions.length} positions, portfolio value ${moneyValue(portfolio.totalValue)}, and the leading verified signal is “${topSignal.title}” (${Math.round(Number(topSignal.score || 0))}/100). Ask specifically about portfolio risk, today's priority, or a symbol for a more focused answer.` : `Live ImpactOne summary: ${positions.length} positions and portfolio value ${moneyValue(portfolio.totalValue)}. No high-priority verified signal is active right now.`;
}

function moneyValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `$${number.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "unavailable";
}

app.get("/api/dashboard", async (_request, response) => {
  const [quotes, sentiment, intelligence, brief, portfolio, feed, recommendations, watchlist, homeSummary] = await Promise.all([
    Promise.all(markets.map(async ([label, symbol]) => {
      try {
        const result = await readApi("/api/quote", { params: { symbol }, timeout: 12000 });
        let quote = pickQuote(result);
        if (!quote) {
          const history = await readApi(`/api/v2/market/chart/${encodeURIComponent(symbol)}`, { params: { range: "1mo" }, timeout: 15000 });
          const bars = history?.bars || [];
          const latest = bars.at(-1);
          const previous = bars.at(-2);
          if (latest && previous) {
            const change = ((Number(latest.close) - Number(previous.close)) / Number(previous.close)) * 100;
            quote = { price: Number(latest.close), change, volume: latest.volume || null };
          }
        }
        return { label, symbol, quote };
      } catch {
        return { label, symbol, quote: null };
      }
    })),
    readApi("/api/v2/market-sentiment/overview", { params: { market: "US" } }),
    readApi("/api/v2/agent-orchestrator/SPY", { timeout: 15000 }),
    readApi("/api/v2/morning-brief/today"),
    readApi("/api/v2/portfolio", { timeout: 15000 }),
    readApi("/api/intelligence/live-feed", { timeout: 15000 }),
    readApi("/api/v2/recommendations", { timeout: 15000 }),
    readApi("/api/watchlist", { timeout: 15000 }),
    readApi("/api/v2/home-summary", { timeout: 15000 }),
  ]);

  response.json({
    updatedAt: new Date().toISOString(),
    quotes,
    sentiment,
    intelligence: intelligence?.summary || null,
    brief: Array.isArray(brief?.items) ? brief.items.slice(0, 3) : [],
    portfolio,
    feed: Array.isArray(feed?.feed) ? feed.feed.filter((item) => Number(item.attentionScore ?? item.importanceScore ?? 0) >= 70).slice(0, 5) : [],
    recommendations: Array.isArray(recommendations?.recommendations) ? recommendations.recommendations.slice(0, 4) : [],
    watchlist: Array.isArray(watchlist?.watchlist) ? watchlist.watchlist : [],
    homeSummary,
  });
});

app.get("/api/symbol/:symbol", async (request, response) => {
  const symbol = String(request.params.symbol || "").trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 12);
  if (!symbol) return response.status(400).json({ error: "A valid symbol is required." });
  const range = String(request.query.range || "1mo");
  const [quote, chart, intelligence, recommendations] = await Promise.all([
    readApi("/api/quote", { params: { symbol }, timeout: 15000 }),
    readApi(`/api/v2/market/chart/${encodeURIComponent(symbol)}`, { params: { range }, timeout: 15000 }),
    readApi(`/api/v2/agent-orchestrator/${encodeURIComponent(symbol)}`, { timeout: 15000 }),
    readApi("/api/v2/recommendations", { timeout: 15000 }),
  ]);
  if (!quote?.quote && !chart?.bars?.length) return response.status(404).json({ error: `No live data is available for ${symbol}.` });
  response.json({
    symbol,
    quote,
    chart: chart?.bars || [],
    intelligence,
    recommendations: (recommendations?.recommendations || []).filter((item) => item.symbol === symbol),
    updatedAt: new Date().toISOString(),
  });
});

app.post("/api/assistant", async (request, response) => {
  const question = String(request.body?.question || "").trim().slice(0, 600);
  if (!question) return response.status(400).json({ error: "A question is required." });
  try {
    const result = await axios.post(`${backendUrl}/api/chat/ask`, {
      question,
      context: request.body?.context || {},
    }, { timeout: 25000 });
    const payload = result.data || {};
    response.json(payload.source === "openai" ? payload : {
      question,
      answer: localAssistantAnswer(question, request.body?.context || {}),
      source: "impactone-live-context",
      providerNotice: "Generated locally from the current live ImpactOne workspace.",
    });
  } catch (error) {
    response.status(error.response?.status || 503).json({ error: error.response?.data?.error || "ImpactOne assistant is unavailable." });
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_request, response) => response.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(port, "127.0.0.1", () => console.log(`Mission Control site: http://127.0.0.1:${port}`));
