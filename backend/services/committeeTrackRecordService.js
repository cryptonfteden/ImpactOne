const fs = require("fs");
const path = require("path");
const { getQuote } = require("./finnhubService");

const STORAGE_DIR = path.resolve(__dirname, "..", "data");
const STORAGE_FILE = path.join(STORAGE_DIR, "committeeTrackRecord.json");

function ensureStorage() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify({ decisions: [] }, null, 2));
  }
}

function readStore() {
  ensureStorage();
  try {
    return JSON.parse(fs.readFileSync(STORAGE_FILE, "utf8"));
  } catch (error) {
    return { decisions: [] };
  }
}

function writeStore(store) {
  ensureStorage();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(store, null, 2));
}

function normalizeVote(vote = "Hold") {
  return String(vote || "Hold").trim();
}

function sameTradingDay(left, right) {
  return String(left || "").slice(0, 10) === String(right || "").slice(0, 10);
}

function scoreDirection(vote = "Hold") {
  const map = {
    "Strong Buy": 3,
    Buy: 2,
    Hold: 0,
    Reduce: -1,
    Sell: -2,
    "Strong Sell": -3,
  };
  return map[normalizeVote(vote)] || 0;
}

function isTrackable(symbol = "") {
  const normalized = String(symbol || "").toUpperCase();
  return !["OIL"].includes(normalized);
}

function summarizeEntries(entries = []) {
  return {
    totalDecisions: entries.length,
    symbolsCovered: Array.from(new Set(entries.map((item) => item.symbol))).length,
    pendingEvaluations: entries.length,
  };
}

function upsertCommitteeDecision(decision) {
  const store = readStore();
  const decisions = Array.isArray(store.decisions) ? store.decisions : [];
  const index = decisions.findIndex((item) => item.symbol === decision.symbol && sameTradingDay(item.generatedAt, decision.generatedAt));

  if (index >= 0) {
    decisions[index] = { ...decisions[index], ...decision };
  } else {
    decisions.push(decision);
  }

  writeStore({ decisions });
  return summarizeEntries(decisions);
}

function evaluateAccuracy(vote, currentReturn) {
  const direction = scoreDirection(vote);
  if (!Number.isFinite(currentReturn)) {
    return null;
  }
  if (direction > 0) {
    return currentReturn > 0 ? 1 : 0;
  }
  if (direction < 0) {
    return currentReturn < 0 ? 1 : 0;
  }
  return Math.abs(currentReturn) <= 3 ? 1 : 0;
}

async function enrichEntries(entries = []) {
  return Promise.all(entries.map(async (item) => {
    if (!isTrackable(item.symbol) || !Number.isFinite(Number(item.entryPrice))) {
      return { ...item, currentPrice: null, currentReturn: null, accuracy: null };
    }

    const quote = await getQuote(item.symbol).catch(() => null);
    const currentPrice = Number(quote?.quote?.price || NaN);
    if (!Number.isFinite(currentPrice)) {
      return { ...item, currentPrice: null, currentReturn: null, accuracy: null };
    }

    const currentReturn = ((currentPrice - Number(item.entryPrice)) / Math.max(Number(item.entryPrice), 0.0001)) * 100;
    return {
      ...item,
      currentPrice,
      currentReturn: Number(currentReturn.toFixed(2)),
      accuracy: evaluateAccuracy(item.finalDecision, currentReturn),
    };
  }));
}

async function getCommitteeTrackRecord({ symbol } = {}) {
  const store = readStore();
  const baseEntries = Array.isArray(store.decisions) ? store.decisions : [];
  const filtered = symbol
    ? baseEntries.filter((item) => String(item.symbol || "").toUpperCase() === String(symbol || "").toUpperCase())
    : baseEntries;
  const entries = (await enrichEntries(filtered)).sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
  const completed = entries.filter((item) => Number.isFinite(item.currentReturn));
  const accurate = completed.filter((item) => item.accuracy === 1);
  const averageReturn = completed.length
    ? completed.reduce((sum, item) => sum + Number(item.currentReturn || 0), 0) / completed.length
    : 0;
  const calibration = completed.length
    ? completed.reduce((sum, item) => {
      const outcomeScore = clamp(Math.abs(Number(item.currentReturn || 0)) * 10, 0, 100);
      return sum + Math.abs(Number(item.confidence || 0) - outcomeScore);
    }, 0) / completed.length
    : null;

  return {
    entries,
    stats: {
      totalDecisions: entries.length,
      evaluatedDecisions: completed.length,
      accuracy: completed.length ? Math.round((accurate.length / completed.length) * 100) : null,
      winRate: completed.length ? Math.round((completed.filter((item) => Number(item.currentReturn) > 0).length / completed.length) * 100) : null,
      confidenceCalibration: calibration === null ? null : Math.max(0, Math.round(100 - calibration)),
      averageReturn: Number(averageReturn.toFixed(2)),
      pendingEvaluations: entries.length - completed.length,
    },
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = {
  upsertCommitteeDecision,
  getCommitteeTrackRecord,
};
