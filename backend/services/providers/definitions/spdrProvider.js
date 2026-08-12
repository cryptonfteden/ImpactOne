const axios = require("axios");
const { createUnifiedProvider } = require("../providerAbstraction");

const SPDR_FUNDS = [
  { ticker: "XLK", sector: "Information Technology", slug: "the-technology-select-sector-spdr-fund-xlk" },
  { ticker: "XLF", sector: "Financial Services", slug: "the-financial-select-sector-spdr-fund-xlf" },
  { ticker: "XLE", sector: "Energy", slug: "the-energy-select-sector-spdr-fund-xle" },
  { ticker: "XLV", sector: "Health Care", slug: "the-health-care-select-sector-spdr-fund-xlv" },
];

function cleanHtml(value = "") {
  return String(value).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function toIsoDate(value) {
  const parsed = new Date(`${value} UTC`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function parseFundTopHoldings(html = "") {
  const text = String(html);
  const start = text.indexOf("<h3>Fund Top Holdings") >= 0 ? text.indexOf("<h3>Fund Top Holdings") : text.indexOf("Fund Top Holdings");
  const end = text.indexOf("<h3>Index Top Holdings", start) >= 0 ? text.indexOf("<h3>Index Top Holdings", start) : text.indexOf("Index Top Holdings", start);
  if (start < 0 || end < 0) return null;
  const section = text.slice(start, end);
  const dateMatch = section.match(/Fund Top Holdings[\s\S]{0,250}?as of\s+([A-Z][a-z]{2}\s+\d{2}\s+\d{4})/i);
  const holdings = [];
  const rowPattern = /<tr[^>]*>[\s\S]*?<td[^>]*data-label="Name:"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*data-label="Shares Held:"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*data-label="Weight:"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;

  for (const match of section.matchAll(rowPattern)) {
    const name = cleanHtml(match[1]);
    const weight = Number(cleanHtml(match[3]).replace("%", ""));
    if (name && Number.isFinite(weight)) holdings.push({ name, sharesHeld: cleanHtml(match[2]), weight });
  }

  return holdings.length ? { asOf: toIsoDate(dateMatch?.[1]), holdings: holdings.slice(0, 10) } : null;
}

function toSpdrEvent(fund, data, sourceUrl) {
  if (!data?.holdings?.length) return null;
  const topThree = data.holdings.slice(0, 3).map((holding) => `${holding.name} ${holding.weight.toFixed(2)}%`).join(", ");
  return {
    eventType: "spdr-etf-holdings",
    sourceType: "institutional",
    sourceName: `State Street SPDR ${fund.ticker} holdings`,
    sourceUrl,
    publishedAt: data.asOf ? new Date(`${data.asOf}T23:00:00Z`).toISOString() : new Date().toISOString(),
    symbols: [fund.ticker],
    sectors: [fund.sector],
    summary: `${fund.ticker} (${fund.sector}) top holdings as of ${data.asOf || "the latest published date"}: ${topThree}. This is fund composition, not creation/redemption flow data.`,
    rawReference: { asOf: data.asOf, holdings: data.holdings },
    credibilityScore: 90,
    freshnessScore: 75,
    confidence: 80,
  };
}

async function fetchSpdrEvents() {
  const results = await Promise.allSettled(SPDR_FUNDS.map(async (fund) => {
    const sourceUrl = `https://www.ssga.com/us/en/individual/etfs/funds/${fund.slug}`;
    const response = await axios.get(sourceUrl, { timeout: 15000 });
    return toSpdrEvent(fund, parseFundTopHoldings(response.data), sourceUrl);
  }));
  return results.filter((result) => result.status === "fulfilled").map((result) => result.value).filter(Boolean);
}

module.exports = createUnifiedProvider(
  {
    providerId: "spdr",
    label: "SPDR ETF Holdings",
    sourceType: "institutional",
    category: "sector-holdings",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 20 },
  },
  fetchSpdrEvents,
  { cacheTtlMs: 60 * 60 * 1000 }
);

module.exports.parseFundTopHoldings = parseFundTopHoldings;
module.exports.toSpdrEvent = toSpdrEvent;
