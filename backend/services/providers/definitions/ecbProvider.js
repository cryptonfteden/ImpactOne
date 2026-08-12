const axios = require("axios");
const { createUnifiedProvider } = require("../providerAbstraction");

const ECB_PRESS_RSS_URL = "https://www.ecb.europa.eu/rss/press.html";

function tagValue(item, tag) {
  const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : null;
}

function parseEcbDecisionFeed(xml = "") {
  return [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .map((match) => ({ title: tagValue(match[1], "title"), sourceUrl: tagValue(match[1], "link"), publishedAt: tagValue(match[1], "pubDate") }))
    .filter((item) => /monetary policy decisions/i.test(item.title || ""));
}

function toEcbEvent(decision) {
  const publishedAt = new Date(decision?.publishedAt || "");
  if (!decision?.sourceUrl || Number.isNaN(publishedAt.getTime())) return null;
  return {
    eventType: "ecb-monetary-policy-decision",
    sourceType: "central-bank",
    sourceName: "European Central Bank",
    sourceUrl: decision.sourceUrl,
    publishedAt: publishedAt.toISOString(),
    symbols: ["EZU", "EURUSD"],
    sectors: ["Financial Services"],
    summary: decision.title || "European Central Bank monetary policy decision.",
    rawReference: { title: decision.title || null, sourceUrl: decision.sourceUrl },
    credibilityScore: 100,
    freshnessScore: 90,
    confidence: 90,
  };
}

async function fetchEcbEvents() {
  const response = await axios.get(ECB_PRESS_RSS_URL, { timeout: 15000 });
  return parseEcbDecisionFeed(response.data).map(toEcbEvent).filter(Boolean).slice(0, 20);
}

module.exports = createUnifiedProvider(
  {
    providerId: "ecb",
    label: "European Central Bank",
    sourceType: "central-bank",
    category: "centralBanks",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
  },
  fetchEcbEvents,
  { cacheTtlMs: 15 * 60 * 1000 }
);

module.exports.parseEcbDecisionFeed = parseEcbDecisionFeed;
module.exports.toEcbEvent = toEcbEvent;
