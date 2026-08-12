const axios = require("axios");
const { createUnifiedProvider } = require("../providerAbstraction");

const TREASURY_YIELD_CURVE_URL = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv";

function parseLatestYieldCurve(csv = "") {
  const lines = String(csv).trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;

  const headers = lines[0].split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
  const values = lines[1].split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || null]));
  if (!row.Date) return null;
  return row;
}

function valueFor(row, label) {
  const value = Number(row?.[label]);
  return Number.isFinite(value) ? value : null;
}

function toIsoDate(value) {
  const [month, day, year] = String(value || "").split("/");
  if (!month || !day || !/^\d{4}$/.test(year || "")) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

async function fetchTreasuryEvents() {
  const year = new Date().getUTCFullYear();
  const response = await axios.get(`${TREASURY_YIELD_CURVE_URL}/${year}/all`, {
    params: { type: "daily_treasury_yield_curve", field_tdr_date_value: String(year), page: "_all", _format: "csv" },
    timeout: 15000,
  });
  const latest = parseLatestYieldCurve(response.data);
  if (!latest) return [];

  const twoYear = valueFor(latest, "2 Yr");
  const tenYear = valueFor(latest, "10 Yr");
  const thirtyYear = valueFor(latest, "30 Yr");
  const curve = [
    twoYear === null ? null : `2Y ${twoYear.toFixed(2)}%`,
    tenYear === null ? null : `10Y ${tenYear.toFixed(2)}%`,
    thirtyYear === null ? null : `30Y ${thirtyYear.toFixed(2)}%`,
  ].filter(Boolean).join(", ");

  const publishedDate = toIsoDate(latest.Date);
  if (!publishedDate) return [];

  return [{
    eventType: "treasury-yield-curve",
    sourceType: "government",
    sourceName: "U.S. Treasury Daily Treasury Par Yield Curve Rates",
    sourceUrl: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates",
    publishedAt: new Date(`${publishedDate}T00:00:00Z`).toISOString(),
    symbols: ["TLT"],
    sectors: ["Financial Services"],
    summary: `U.S. Treasury yield curve for ${latest.Date}: ${curve || "published values available"}.`,
    rawReference: { date: latest.Date, twoYear, tenYear, thirtyYear },
    credibilityScore: 95,
    freshnessScore: 80,
    confidence: 80,
  }];
}

module.exports = createUnifiedProvider(
  {
    providerId: "usTreasury",
    label: "US Treasury",
    sourceType: "government",
    category: "macro",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
  },
  fetchTreasuryEvents
);

module.exports.parseLatestYieldCurve = parseLatestYieldCurve;
module.exports.toIsoDate = toIsoDate;
