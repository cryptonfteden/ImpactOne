const axios = require("axios");
const { createUnifiedProvider } = require("../providerAbstraction");

const FED_PRESS_RSS_URL = "https://www.federalreserve.gov/feeds/press_all.xml";

function decodeXml(value = "") {
  return String(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
}

function tagValue(item, tag) {
  const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : null;
}

function parseFedPressFeed(xml = "") {
  return [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .map((match) => ({ title: tagValue(match[1], "title"), sourceUrl: tagValue(match[1], "link"), publishedAt: tagValue(match[1], "pubDate") }))
    .filter((item) => item.title && !/\bFOMC\b|Federal Open Market Committee/i.test(item.title));
}

function toFedEvent(item) {
  const publishedAt = new Date(item?.publishedAt || "");
  if (!item?.title || !item?.sourceUrl || Number.isNaN(publishedAt.getTime())) return null;
  return {
    eventType: "federal-reserve-press-release",
    sourceType: "central-bank",
    sourceName: "Federal Reserve Board",
    sourceUrl: item.sourceUrl,
    publishedAt: publishedAt.toISOString(),
    symbols: ["XLF"],
    sectors: ["Financial Services"],
    summary: item.title,
    rawReference: { title: item.title, sourceUrl: item.sourceUrl },
    credibilityScore: 100,
    freshnessScore: 85,
    confidence: 85,
  };
}

async function fetchFedEvents() {
  const response = await axios.get(FED_PRESS_RSS_URL, { timeout: 15000 });
  return parseFedPressFeed(response.data).map(toFedEvent).filter(Boolean).slice(0, 20);
}

module.exports = createUnifiedProvider(
  {
    providerId: "fed",
    label: "Federal Reserve",
    sourceType: "central-bank",
    category: "centralBanks",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
  },
  fetchFedEvents,
  { cacheTtlMs: 15 * 60 * 1000 }
);

module.exports.parseFedPressFeed = parseFedPressFeed;
module.exports.toFedEvent = toFedEvent;
