const axios = require("axios");
const { FINNHUB_API_KEY } = require("../../../config/env");
const { createUnifiedProvider } = require("../providerAbstraction");

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function formatReleaseTime(hour) {
  if (hour === "bmo") return "before market open";
  if (hour === "amc") return "after market close";
  if (hour === "dmh") return "during market hours";
  return "release time not specified";
}

function toEarningsEvent(record) {
  const symbol = String(record?.symbol || "").toUpperCase();
  const date = String(record?.date || "");
  if (!symbol || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  return {
    eventType: "earnings-release",
    sourceType: "corporate-filing",
    sourceName: "Finnhub Earnings Calendar",
    sourceUrl: "https://finnhub.io/docs/api/earnings-calendar",
    publishedAt: new Date(`${date}T12:00:00Z`).toISOString(),
    symbols: [symbol],
    sectors: [],
    summary: `${symbol} is scheduled to report earnings on ${date}, ${formatReleaseTime(record.hour)}${record.quarter ? ` (quarter ${record.quarter})` : ""}.`,
    rawReference: {
      date,
      hour: record.hour || null,
      quarter: record.quarter || null,
      year: record.year || null,
      epsEstimate: record.epsEstimate ?? null,
      revenueEstimate: record.revenueEstimate ?? null,
    },
    credibilityScore: 80,
    freshnessScore: 85,
    confidence: 75,
  };
}

async function fetchEarningsEvents() {
  if (!FINNHUB_API_KEY) return [];

  const now = new Date();
  const through = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const response = await axios.get("https://finnhub.io/api/v1/calendar/earnings", {
    params: { from: dateOnly(now), to: dateOnly(through), token: FINNHUB_API_KEY },
    timeout: 15000,
  });

  return (response.data?.earningsCalendar || [])
    .map(toEarningsEvent)
    .filter(Boolean)
    .slice(0, 100);
}

module.exports = createUnifiedProvider(
  {
    providerId: "majorEarnings",
    label: "Major Earnings",
    sourceType: "corporate-filing",
    category: "earnings",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 20 },
  },
  fetchEarningsEvents,
  { cacheTtlMs: 15 * 60 * 1000 }
);

module.exports.toEarningsEvent = toEarningsEvent;
module.exports.formatReleaseTime = formatReleaseTime;
