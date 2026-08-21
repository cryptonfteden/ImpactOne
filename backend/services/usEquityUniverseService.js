const axios = require("axios");
const fs = require("fs");
const path = require("path");

const NASDAQ_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt";
const OTHER_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_FILE = path.resolve(__dirname, "..", "..", ".cache", "us-equity-universe.json");

// The official directory includes ETFs, warrants, rights, units, preferred
// shares and debt. The strategy scanner is deliberately limited to operating
// company equity; those other security types must not be presented as stocks.
const NON_COMMON_SECURITY = /\b(ETF|ETN|Warrants?|Rights?|Units?|Preferred|Preference|Depositary Shares|Notes? due|Bonds?|Debentures?|Funds?|Trusts?|Index|Certificates?)\b/i;

let cachedUniverse = null;

function readDiskCache() {
  try {
    const value = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    if (!Array.isArray(value?.symbols) || value.symbols.length < 3000) return null;
    return { cachedAt: new Date(value.retrievedAt).getTime() || 0, value };
  } catch { return null; }
}

function persistDiskCache(value) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(value));
  } catch {
    // The in-memory directory remains usable when local persistence is read-only.
  }
}

function rowsFromPipeText(text) {
  const lines = String(text || "").trim().split(/\r?\n/).filter(Boolean);
  const headers = (lines.shift() || "").split("|");
  return lines
    .filter((line) => !line.startsWith("File Creation Time"))
    .map((line) => {
      const values = line.split("|");
      return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    });
}

function isCommonOperatingEquity(row) {
  return row?.["Test Issue"] === "N"
    && row?.ETF === "N"
    && !NON_COMMON_SECURITY.test(row?.["Security Name"] || "");
}

function parseOfficialDirectories(nasdaqText, otherText) {
  const nasdaq = rowsFromPipeText(nasdaqText)
    .filter(isCommonOperatingEquity)
    .map((row) => ({ symbol: row.Symbol, name: row["Security Name"], exchange: "NASDAQ" }));
  const other = rowsFromPipeText(otherText)
    .filter(isCommonOperatingEquity)
    .map((row) => ({
      symbol: row["ACT Symbol"],
      name: row["Security Name"],
      exchange: ({ A: "NYSE AMERICAN", N: "NYSE", P: "NYSE ARCA", Z: "CBOE", V: "IEX" })[row.Exchange] || row.Exchange,
    }));
  const bySymbol = new Map();
  for (const security of [...nasdaq, ...other]) {
    const symbol = String(security.symbol || "").trim().toUpperCase();
    if (/^[A-Z][A-Z.\-]{0,9}$/.test(symbol) && !bySymbol.has(symbol)) bySymbol.set(symbol, { ...security, symbol });
  }
  return [...bySymbol.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

async function getUsEquityUniverse({ force = false } = {}) {
  if (!cachedUniverse) cachedUniverse = readDiskCache();
  if (!force && cachedUniverse && Date.now() - cachedUniverse.cachedAt < CACHE_TTL_MS) return cachedUniverse.value;
  try {
    const [nasdaqResponse, otherResponse] = await Promise.all([
      axios.get(NASDAQ_LISTED_URL, { responseType: "text", timeout: 30000 }),
      axios.get(OTHER_LISTED_URL, { responseType: "text", timeout: 30000 }),
    ]);
    const securities = parseOfficialDirectories(nasdaqResponse.data, otherResponse.data);
    if (securities.length < 3000) throw new Error(`Official directory returned only ${securities.length} common equities.`);
    const value = {
      securities,
      symbols: securities.map((item) => item.symbol),
      total: securities.length,
      source: "Nasdaq Trader Symbol Directory",
      sourceUrls: [NASDAQ_LISTED_URL, OTHER_LISTED_URL],
      retrievedAt: new Date().toISOString(),
      stale: false,
    };
    cachedUniverse = { cachedAt: Date.now(), value };
    persistDiskCache(value);
    return value;
  } catch (error) {
    const fallbackCache = cachedUniverse || readDiskCache();
    if (fallbackCache) return { ...fallbackCache.value, stale: true, warning: error.message };
    throw error;
  }
}

function clearUniverseCache() {
  cachedUniverse = null;
}

module.exports = {
  NASDAQ_LISTED_URL,
  OTHER_LISTED_URL,
  CACHE_FILE,
  NON_COMMON_SECURITY,
  rowsFromPipeText,
  parseOfficialDirectories,
  getUsEquityUniverse,
  clearUniverseCache,
};
