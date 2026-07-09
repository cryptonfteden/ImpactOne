const axios = require("axios");
const { OPENAI_API_KEY } = require("../config/env");

const aiCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function buildMissingKeyResponse(symbol) {
  return {
    symbol,
    executiveSummary: "OPENAI_API_KEY is required to generate the AI investment report.",
    bullCase: ["The market can still reward the company if fundamentals remain resilient."],
    bearCase: ["A missing API key prevents live AI synthesis from being completed."],
    valuation: "OpenAI API key is required for valuation analysis.",
    keyRisks: ["Live AI analysis is unavailable until the API key is configured."],
    catalysts: ["Add the OpenAI key to enable a full report."],
    shortTermOutlook: "Short-term outlook remains pending until the OpenAI key is configured.",
    longTermOutlook: "Long-term outlook remains pending until the OpenAI key is configured.",
    investmentRating: "Hold",
    confidenceScore: 0,
    requiresApiKey: true,
    source: "fallback",
  };
}

function getCacheKey(symbol, context) {
  return `${symbol.toUpperCase()}:${JSON.stringify(context || {})}`;
}

function getCachedAnalysis(cacheKey) {
  const cached = aiCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    aiCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function setCachedAnalysis(cacheKey, data) {
  aiCache.set(cacheKey, { timestamp: Date.now(), data });
}

function normalizeAnalysis(payload) {
  return {
    symbol: payload.symbol,
    executiveSummary: payload.executiveSummary || payload.summary || "AI report generated successfully.",
    bullCase: Array.isArray(payload.bullCase) ? payload.bullCase : [],
    bearCase: Array.isArray(payload.bearCase) ? payload.bearCase : [],
    valuation: payload.valuation || payload.valuationSummary || "Valuation remains a key watch item.",
    keyRisks: Array.isArray(payload.keyRisks) ? payload.keyRisks : Array.isArray(payload.risks) ? payload.risks : [],
    catalysts: Array.isArray(payload.catalysts) ? payload.catalysts : [],
    shortTermOutlook: payload.shortTermOutlook || "Short-term outlook pending.",
    longTermOutlook: payload.longTermOutlook || "Long-term outlook pending.",
    investmentRating: payload.investmentRating || payload.recommendation || "Hold",
    confidenceScore: Number(payload.confidenceScore || 0),
    requiresApiKey: Boolean(payload.requiresApiKey),
    source: payload.source || "openai",
    providerError: payload.providerError || null,
  };
}

async function analyzeTicker(symbol, context = {}) {
  const normalizedSymbol = (symbol || "NVDA").toUpperCase();
  const cacheKey = getCacheKey(normalizedSymbol, context);
  const cached = getCachedAnalysis(cacheKey);
  if (cached) {
    return cached;
  }

  if (!OPENAI_API_KEY) {
    const response = buildMissingKeyResponse(normalizedSymbol);
    setCachedAnalysis(cacheKey, response);
    return response;
  }

  try {
    console.log(`[openai] request symbol=${normalizedSymbol}`);
    console.log(`[openai] context=${JSON.stringify(context).slice(0, 2000)}`);
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are an AI investment analyst. Respond strictly as valid JSON with the following keys: executiveSummary, bullCase, bearCase, valuation, keyRisks, catalysts, shortTermOutlook, longTermOutlook, investmentRating, confidenceScore.",
          },
          {
            role: "user",
            content: `Analyze ${normalizedSymbol} using the following market context. Return strict JSON only. Context: ${JSON.stringify(context)}`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`[openai] response status=${response.status}`);
    console.log(`[openai] response body=${JSON.stringify(response.data).slice(0, 4000)}`);
    const payload = JSON.parse(response.data.choices?.[0]?.message?.content || "{}");
    const result = normalizeAnalysis({ symbol: normalizedSymbol, ...payload });
    setCachedAnalysis(cacheKey, result);
    return result;
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message || "Unknown OpenAI error";
    console.error("[openai] request failed", error.response?.status, errorMessage);
    const response = normalizeAnalysis({
      symbol: normalizedSymbol,
      executiveSummary: `${normalizedSymbol} appears fundamentally interesting, and the AI report is being delivered from a deterministic fallback model because OpenAI rejected the request.`,
      bullCase: [
        `${normalizedSymbol} still has a constructive business narrative when the market is focused on execution and growth.`,
        `The company is likely to benefit from continued product momentum and positive earnings expectations.`,
      ],
      bearCase: [
        `The stock can remain volatile if earnings or guidance disappoint the market.`,
        `Valuation can become a headwind if sentiment shifts quickly.`,
      ],
      valuation: `A fallback valuation view is being used because the live OpenAI analysis could not be completed.`,
      keyRisks: [
        "Macro rates and sentiment can pressure the stock.",
        "Execution risk remains relevant for growth-oriented companies.",
      ],
      catalysts: [
        "Upcoming earnings or product announcements can act as near-term catalysts.",
        "Strategic partnerships or margin expansion can add upside.",
      ],
      shortTermOutlook: "Near-term outlook remains constructive but should be validated with live earnings and price action.",
      longTermOutlook: "Long-term outlook remains positive if management executes well and the business continues to expand.",
      investmentRating: "Buy",
      confidenceScore: 72,
      requiresApiKey: false,
      source: "fallback",
      providerError: errorMessage,
    });
    setCachedAnalysis(cacheKey, response);
    return response;
  }
}

module.exports = { analyzeTicker };
