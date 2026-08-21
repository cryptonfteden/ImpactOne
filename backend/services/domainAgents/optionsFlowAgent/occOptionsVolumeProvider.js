const axios = require("axios");

const OCC_ENDPOINT = "https://marketdata.theocc.com/volume-query";
const OCC_SOURCE_URL = "https://www.theocc.com/market-data/market-data-reports/volume-and-open-interest/volume-query";

function compactDate(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function previousTradingDates(now, count = 7) {
  const dates = [];
  const cursor = new Date(now);
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (dates.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates;
}

function parseQuantityCsv(csv) {
  const lines = String(csv || "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return 0;
  const headers = lines[0].split(",").map((value) => value.trim().toLowerCase());
  const quantityIndex = headers.indexOf("quantity");
  if (quantityIndex < 0) throw new Error("OCC response did not contain a quantity column.");
  return lines.slice(1).reduce((total, line) => {
    const value = Number(line.split(",")[quantityIndex]);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

async function requestSide(symbol, reportDate, porc, httpGet) {
  const response = await httpGet(OCC_ENDPOINT, {
    timeout: 20_000,
    responseType: "text",
    params: {
      reportDate,
      format: "csv",
      volumeQueryType: "O",
      symbolType: "U",
      symbol,
      reportType: "D",
      accountType: "C",
      productKind: "OSTK",
      porc,
      contractDt: reportDate,
    },
  });
  return parseQuantityCsv(response.data);
}

function summarizeHistory(sessions) {
  const [current, ...baseline] = sessions;
  if (!current) return null;
  const averageTotalVolume = baseline.length
    ? baseline.reduce((sum, session) => sum + session.totalVolume, 0) / baseline.length
    : null;
  const volumeVsAverage = averageTotalVolume > 0 ? current.totalVolume / averageTotalVolume : null;
  const callShare = current.totalVolume > 0 ? current.callVolume / current.totalVolume : null;
  const activityLevel = !Number.isFinite(volumeVsAverage)
    ? "BASELINE_UNAVAILABLE"
    : volumeVsAverage >= 2
      ? "UNUSUALLY_HIGH"
      : volumeVsAverage >= 1.35
        ? "ELEVATED"
        : volumeVsAverage <= 0.65
          ? "LOW"
          : "NORMAL";
  return { baselineSessions: baseline.length, averageTotalVolume, volumeVsAverage, callShare, activityLevel, sessions };
}

async function fetchOccCustomerVolume(symbol, { now = new Date(), httpGet = axios.get, lookbackTradingDays = 10, historySessions = 5 } = {}) {
  const normalized = String(symbol || "").trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(normalized)) {
    return { dataAvailable: false, unavailableReason: "A valid US equity symbol is required." };
  }

  let lastError = null;
  const sessions = [];
  for (const date of previousTradingDates(now, lookbackTradingDays)) {
    const reportDate = compactDate(date);
    try {
      const [callVolume, putVolume] = await Promise.all([
        requestSide(normalized, reportDate, "C", httpGet),
        requestSide(normalized, reportDate, "P", httpGet),
      ]);
      const totalVolume = callVolume + putVolume;
      if (totalVolume <= 0) continue;
      sessions.push({ reportDate: date.toISOString().slice(0, 10), callVolume, putVolume, totalVolume });
      if (sessions.length >= Math.max(1, historySessions)) break;
    } catch (error) {
      lastError = error;
    }
  }

  const history = summarizeHistory(sessions);
  if (history) {
    const current = sessions[0];
    return {
      dataAvailable: true,
      symbol: normalized,
      asOf: `${current.reportDate}T00:00:00.000Z`,
      ...current,
      putCallRatio: current.callVolume > 0 ? current.putVolume / current.callVolume : null,
      historicalContext: history,
      source: "OCC Volume Query",
      sourceUrl: OCC_SOURCE_URL,
      freshness: "end-of-day",
      limitations: [
        "Official OCC customer contract volume compared with prior published sessions; not real-time options flow.",
        "Does not identify sweeps, blocks, trade aggressor, implied volatility, or gamma exposure.",
      ],
    };
  }

  return {
    dataAvailable: false,
    symbol: normalized,
    unavailableReason: lastError
      ? `OCC end-of-day options volume could not be loaded: ${lastError.message}`
      : "No OCC customer options volume was published for this symbol in the checked trading days.",
    source: "OCC Volume Query",
    sourceUrl: OCC_SOURCE_URL,
    freshness: "end-of-day",
  };
}

module.exports = { fetchOccCustomerVolume, parseQuantityCsv, previousTradingDates, summarizeHistory, OCC_ENDPOINT, OCC_SOURCE_URL };
