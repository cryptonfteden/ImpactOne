const axios = require("axios");

const ENDPOINT = "https://query1.finance.yahoo.com/v7/finance/spark";
// Yahoo's public Spark endpoint rejects requests above 20 symbols.
const REQUEST_BATCH_SIZE = 20;

function toYahooSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase().replaceAll(".", "-");
}

function normalizeSparkResult(result, requestedByYahooSymbol) {
  const response = result?.response?.[0];
  const timestamps = response?.timestamp || [];
  const closes = response?.indicators?.quote?.[0]?.close || [];
  const yahooSymbol = String(result?.symbol || "").toUpperCase();
  const originalSymbol = requestedByYahooSymbol.get(yahooSymbol) || yahooSymbol;
  const series = timestamps.flatMap((timestamp, index) => {
    const close = Number(closes[index]);
    return Number.isFinite(close) && close > 0 ? [{ date: new Date(Number(timestamp) * 1000).toISOString().slice(0, 10), close }] : [];
  });
  return [originalSymbol, series];
}

async function getBulkWeeklyCloses(symbols) {
  const normalized = [...new Set((symbols || []).map((symbol) => String(symbol || "").trim().toUpperCase()).filter(Boolean))];
  const output = new Map();
  for (let offset = 0; offset < normalized.length; offset += REQUEST_BATCH_SIZE) {
    const requested = normalized.slice(offset, offset + REQUEST_BATCH_SIZE);
    const requestedByYahooSymbol = new Map(requested.map((symbol) => [toYahooSymbol(symbol), symbol]));
    try {
      const response = await axios.get(ENDPOINT, {
        params: { symbols: [...requestedByYahooSymbol.keys()].join(","), range: "2y", interval: "1wk" },
        timeout: 30000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ImpactOne/1.0)" },
      });
      for (const result of response.data?.spark?.result || []) {
        const [symbol, series] = normalizeSparkResult(result, requestedByYahooSymbol);
        if (series.length) output.set(symbol, series);
      }
    } catch {
      // Missing symbols remain absent from the map and are counted explicitly
      // by the scanner. One failed batch never invalidates verified peers.
    }
  }
  return output;
}

// Conservative close-only prefilter. It is intentionally wider than the
// final 0-5% OHLC zone so wick-based lows/highs cannot be accidentally
// excluded. Passing this filter is never shown to the user as a setup; it only
// earns the symbol a full verified OHLC analysis.
function isPotentialWeeklyApproach(series) {
  const window = (series || []).slice(-52);
  if (window.length < 20) return false;
  const current = Number(window.at(-1)?.close);
  const previous = Number(window.at(-2)?.close);
  if (!(current > 0) || !(previous > current)) return false;
  let best = null;
  for (let lowIndex = 0; lowIndex < window.length - 2; lowIndex += 1) {
    const low = Number(window[lowIndex]?.close);
    for (let highIndex = lowIndex + 1; highIndex < window.length - 1; highIndex += 1) {
      const high = Number(window[highIndex]?.close);
      if (!(high > low)) continue;
      const strengthPct = (high - low) / low * 100;
      if (!best || strengthPct > best.strengthPct) best = { low, high, highIndex, strengthPct };
    }
  }
  if (!best || best.strengthPct < 8 || window.length - 1 - best.highIndex > 30) return false;
  const closeProxy886 = best.high - (best.high - best.low) * 0.886;
  const proxyDistancePct = (current - closeProxy886) / closeProxy886 * 100;
  return proxyDistancePct >= -12 && proxyDistancePct <= 30;
}

module.exports = { ENDPOINT, REQUEST_BATCH_SIZE, toYahooSymbol, normalizeSparkResult, getBulkWeeklyCloses, isPotentialWeeklyApproach };
