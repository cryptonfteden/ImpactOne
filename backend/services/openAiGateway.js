const axios = require("axios");
const env = require("../config/env");

const ENDPOINT = "https://api.openai.com/v1/chat/completions";
let blockedUntil = 0;
let lastReason = null;

function gatewayError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(headers = {}, attempt = 0) {
  const retryAfter = Number(headers["retry-after"]);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 30_000);
  return Math.min(1000 * (2 ** attempt), 8000) + Math.floor(Math.random() * 250);
}

async function requestChatCompletion(payload, { httpPost = axios.post, now = Date.now } = {}) {
  if (!env.OPENAI_API_KEY) throw gatewayError("OPENAI_NOT_CONFIGURED", "OPENAI_API_KEY is not configured.");
  if (now() < blockedUntil) throw gatewayError("OPENAI_CIRCUIT_OPEN", lastReason || "OpenAI requests are paused after a quota/rate-limit response.");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await httpPost(ENDPOINT, payload, {
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        timeout: 20_000,
      });
    } catch (error) {
      const status = error.response?.status;
      const apiCode = error.response?.data?.error?.code || error.response?.data?.error?.type;
      const message = error.response?.data?.error?.message || error.message || "OpenAI request failed.";
      if (status !== 429) throw error;
      if (apiCode === "insufficient_quota" || /quota/i.test(message)) {
        blockedUntil = now() + 60 * 60 * 1000;
        lastReason = "OpenAI quota is exhausted; deterministic reports are active for one hour before the next probe.";
        throw gatewayError("OPENAI_QUOTA_EXHAUSTED", lastReason);
      }
      if (attempt === 2) {
        blockedUntil = now() + 60_000;
        lastReason = "OpenAI rate limit persisted after backoff; deterministic reports are temporarily active.";
        throw gatewayError("OPENAI_RATE_LIMITED", lastReason);
      }
      await sleep(retryAfterMs(error.response?.headers, attempt));
    }
  }
  throw gatewayError("OPENAI_UNAVAILABLE", "OpenAI is unavailable.");
}

function getOpenAiGatewayStatus(now = Date.now) {
  return { configured: Boolean(env.OPENAI_API_KEY), circuitOpen: now() < blockedUntil, blockedUntil: blockedUntil ? new Date(blockedUntil).toISOString() : null, reason: lastReason };
}

function resetOpenAiGateway() {
  blockedUntil = 0;
  lastReason = null;
}

module.exports = { requestChatCompletion, getOpenAiGatewayStatus, resetOpenAiGateway, retryAfterMs };
