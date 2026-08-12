const axios = require("axios");
const { createUnifiedProvider } = require("../providerAbstraction");

const FED_MONETARY_RSS_URL = "https://www.federalreserve.gov/feeds/press_monetary.xml";

function decodeXml(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function tagValue(item, tag) {
  const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]).trim() : null;
}

function parseFomcFeed(xml = "") {
  return [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .map((match) => {
      const item = match[1];
      return { title: tagValue(item, "title"), link: tagValue(item, "link"), publishedAt: tagValue(item, "pubDate") };
    })
    .filter((item) => /\bFOMC\b|Federal Open Market Committee/i.test(item.title || ""));
}

function toFomcEvent(item) {
  const publishedAt = new Date(item?.publishedAt || "");
  if (!item?.title || !item?.link || Number.isNaN(publishedAt.getTime())) return null;

  return {
    eventType: "fomc-communication",
    sourceType: "central-bank",
    sourceName: "Federal Reserve — FOMC",
    sourceUrl: item.link,
    publishedAt: publishedAt.toISOString(),
    symbols: ["SPY", "TLT"],
    sectors: ["Financial Services"],
    summary: item.title,
    rawReference: { title: item.title, link: item.link },
    credibilityScore: 100,
    freshnessScore: 90,
    confidence: 90,
  };
}

async function fetchFomcEvents() {
  const response = await axios.get(FED_MONETARY_RSS_URL, { timeout: 15000 });
  return parseFomcFeed(response.data).map(toFomcEvent).filter(Boolean).slice(0, 20);
}

module.exports = createUnifiedProvider(
  {
    providerId: "fomc",
    label: "FOMC",
    sourceType: "central-bank",
    category: "centralBanks",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
  },
  fetchFomcEvents,
  { cacheTtlMs: 15 * 60 * 1000 }
);

module.exports.parseFomcFeed = parseFomcFeed;
module.exports.toFomcEvent = toFomcEvent;
