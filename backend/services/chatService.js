const axios = require("axios");
const { OPENAI_API_KEY } = require("../config/env");

const chatCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;

function getCacheKey(question, context) {
  return `${String(question || "").trim().toLowerCase()}::${JSON.stringify(context || {})}`;
}

function getCached(cacheKey) {
  const cached = chatCache.get(cacheKey);
  if (!cached) {
    return null;
  }
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    chatCache.delete(cacheKey);
    return null;
  }
  return cached.data;
}

function setCached(cacheKey, data) {
  chatCache.set(cacheKey, { timestamp: Date.now(), data });
}

function buildMissingKeyResponse(question) {
  return {
    question,
    answer: "OPENAI_API_KEY is not configured, so Ask ImpactOne can't generate a live answer right now. Add the key to enable this feature.",
    source: "fallback",
    providerNotice: "OpenAI is not configured. Add OPENAI_API_KEY to enable Ask ImpactOne.",
  };
}

async function askImpactOne({ question, context = {} } = {}) {
  const normalizedQuestion = String(question || "").trim();
  if (!normalizedQuestion) {
    const error = new Error("A question is required.");
    error.statusCode = 400;
    throw error;
  }

  const cacheKey = getCacheKey(normalizedQuestion, context);
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  if (!OPENAI_API_KEY) {
    const response = buildMissingKeyResponse(normalizedQuestion);
    setCached(cacheKey, response);
    return response;
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are Ask ImpactOne, an in-app investment research assistant embedded in a market-intelligence dashboard. Answer the user's question directly and concisely (3-5 sentences) using the provided portfolio/watchlist/market context when relevant. Lead with the answer, then the supporting evidence. Do not fabricate specific prices or facts not present in the context.",
          },
          {
            role: "user",
            content: `Question: ${normalizedQuestion}\n\nContext: ${JSON.stringify(context).slice(0, 6000)}`,
          },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const answer = response.data?.choices?.[0]?.message?.content || "No answer was generated.";
    const result = {
      question: normalizedQuestion,
      answer,
      source: "openai",
      providerNotice: null,
    };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message || "Unknown OpenAI error";
    const friendly = errorMessage.includes("quota")
      ? "OpenAI quota is currently exceeded. Try again shortly."
      : errorMessage.includes("Incorrect API key") || errorMessage.includes("invalid_api_key")
        ? "OpenAI API key is invalid."
        : "OpenAI is temporarily unavailable. Try again shortly.";

    const result = {
      question: normalizedQuestion,
      answer: `I couldn't generate a live answer just now (${friendly}). Please try again in a moment.`,
      source: "fallback",
      providerNotice: friendly,
      providerError: errorMessage,
    };
    setCached(cacheKey, result);
    return result;
  }
}

module.exports = { askImpactOne };
