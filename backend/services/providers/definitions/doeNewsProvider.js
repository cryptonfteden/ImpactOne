const axios = require("axios");
const { createUnifiedProvider } = require("../providerAbstraction");
const { classifyThemes, marketImpactExplanation } = require("../../marketNewsIntelligence");

const DOE_NEWS_URL = "https://www.energy.gov/listings/energy-news?view=rss";

function decodeHtml(value = "") {
  const named = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
      if (entity[0] === "#") {
        const hex = entity[1]?.toLowerCase() === "x";
        const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return named[entity.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function parseDoeNewsHtml(html = "") {
  const events = [];
  const seenUrls = new Set();
  const timePattern = /<time\b[^>]*datetime=["']([^"']+)["'][^>]*>[\s\S]*?<\/time>/gi;
  let match;
  while ((match = timePattern.exec(String(html)))) {
    const publishedAt = new Date(match[1]);
    if (Number.isNaN(publishedAt.getTime())) continue;
    const window = String(html).slice(match.index, match.index + 7000);
    const linkMatch = window.match(/views-field-title[\s\S]{0,800}?<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const sourceUrl = new URL(linkMatch[1], "https://www.energy.gov").toString();
    if (seenUrls.has(sourceUrl)) continue;
    const summary = decodeHtml(linkMatch[2]);
    if (!summary) continue;
    const descriptionMatch = window.match(/views-field-field-summary[\s\S]{0,1200}?<div class=["']field-content["']>([\s\S]*?)<\/div>/i);
    const description = decodeHtml(descriptionMatch?.[1] || "").replace(/\s*Read more\s*$/i, "");
    const base = {
      eventType: "doe-official-news",
      sourceType: "government",
      sourceName: "U.S. Department of Energy",
      sourceUrl,
      publishedAt: publishedAt.toISOString(),
      symbols: [],
      sectors: ["Energy", "Utilities", "Industrials"],
      summary,
      description,
    };
    const classification = classifyThemes(base);
    events.push({
      ...base,
      sectors: classification.sectors,
      themes: classification.themeIds,
      rawReference: {
        officialSource: "energy.gov",
        impactOneInference: marketImpactExplanation(base, classification),
        noSyntheticCompanyMapping: true,
      },
      credibilityScore: 100,
      freshnessScore: 92,
      relevanceScore: classification.themeIds.length ? 92 : 65,
      confidence: 96,
    });
    seenUrls.add(sourceUrl);
  }
  return events.slice(0, 30);
}

async function fetchDoeNewsEvents() {
  const response = await axios.get(DOE_NEWS_URL, {
    timeout: 18000,
    headers: { "User-Agent": "ImpactOne market intelligence/1.0 (official-source reader)" },
  });
  return parseDoeNewsHtml(response.data);
}

module.exports = createUnifiedProvider({
  providerId: "doeNews",
  label: "U.S. Department of Energy News",
  sourceType: "government",
  category: "energy",
  defaultThemes: ["ENERGY", "US_POLICY"],
  rateLimit: { maxPerMinute: 4 },
}, fetchDoeNewsEvents, { timeoutMs: 20000, cacheTtlMs: 30 * 60 * 1000 });

module.exports.parseDoeNewsHtml = parseDoeNewsHtml;
module.exports.fetchDoeNewsEvents = fetchDoeNewsEvents;

