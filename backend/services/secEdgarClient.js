const axios = require("axios");
const env = require("../config/env");

// SEC asks automated clients to stay below 10 requests/second. A single
// process-wide queue prevents the insider, institutional and discovery
// agents from independently bursting against the Archives host.
const MIN_REQUEST_GAP_MS = 140;
const MAX_RETRIES = 3;
let queueTail = Promise.resolve();
let lastStartedAt = 0;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelay(error, attempt) {
  const header = Number(error?.response?.headers?.["retry-after"]);
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, 15000);
  return Math.min(1000 * (2 ** attempt), 8000);
}

async function runQueued(task) {
  const previous = queueTail.catch(() => undefined);
  let release;
  queueTail = new Promise((resolve) => { release = resolve; });
  await previous;
  try {
    const gap = Math.max(0, MIN_REQUEST_GAP_MS - (Date.now() - lastStartedAt));
    if (gap) await wait(gap);
    lastStartedAt = Date.now();
    return await task();
  } finally {
    release();
  }
}

async function getSec(url, { accept = "application/json", timeout = 15000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      return await runQueued(() => axios.get(url, {
        timeout,
        headers: {
          "User-Agent": env.SEC_EDGAR_USER_AGENT,
          Accept: accept,
          "Accept-Encoding": "gzip, deflate",
        },
      }));
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (![429, 503].includes(status) || attempt === MAX_RETRIES - 1) throw error;
      await wait(retryDelay(error, attempt));
    }
  }
  throw lastError;
}

module.exports = { getSec, MIN_REQUEST_GAP_MS, MAX_RETRIES };
