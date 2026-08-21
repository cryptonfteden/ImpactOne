const axios = require("axios");
const { createUnifiedProvider } = require("../providerAbstraction");
const { classifyThemes } = require("../../marketNewsIntelligence");

const PUBLIC_CHANNEL = "interactiveil";
const PUBLIC_PREVIEW_URL = `https://t.me/s/${PUBLIC_CHANNEL}`;

function decodeTelegramHtml(value = "") {
  const named = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return String(value)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
      if (entity[0] === "#") {
        const hex = entity[1]?.toLowerCase() === "x";
        const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return named[entity.toLowerCase()] ?? match;
    })
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function explicitSymbols(text = "") {
  const symbols = new Set();
  for (const match of String(text).matchAll(/\(([A-Z]{1,5}(?:\.[A-Z])?)\)/g)) symbols.add(match[1]);
  return [...symbols].slice(0, 12);
}

function headlineFromText(text = "") {
  const lines = String(text).split(/\n+/).map((line) => line.trim()).filter((line) => line && line !== "_");
  if (!lines.length) return "Interactive Israel market update";
  const generic = /^(?:🚨\s*)?ברייקינג(?:\s*🚨)?$|^(?:בוקר|צהריים|ערב) טובים[,!]?$|^אז מה קורה היום בשוק\??$|^כל מה שצריך לדעת/i;
  const useful = lines.find((line) => !generic.test(line)) || lines[0];
  return useful.slice(0, 220);
}

function parseInteractiveIsraelHtml(html = "") {
  return String(html).split(/<div class="tgme_widget_message_wrap js-widget_message_wrap">/i).slice(1).map((block) => {
    const postId = block.match(/data-post="([^"]+)"/i)?.[1];
    const publishedAt = block.match(/<time[^>]*datetime="([^"]+)"/i)?.[1];
    const rawText = block.match(/<div class="tgme_widget_message_text js-message_text"[^>]*>([\s\S]*?)<\/div>/i)?.[1];
    if (!postId || !publishedAt || !rawText) return null;
    const text = decodeTelegramHtml(rawText);
    if (!text) return null;
    const sourceUrl = `https://t.me/${postId}`;
    const externalLinks = [...rawText.matchAll(/href="(https?:\/\/[^"#]+)"/gi)]
      .map((match) => decodeTelegramHtml(match[1]))
      .filter((url) => !/^https?:\/\/(?:t\.me|telegram\.me)\//i.test(url));
    const base = {
      eventType: "telegram-market-news",
      sourceType: "news",
      sourceName: "Interactive Israel Telegram",
      sourceUrl,
      publishedAt: new Date(publishedAt).toISOString(),
      symbols: explicitSymbols(text),
      sectors: [],
      summary: headlineFromText(text),
      description: text,
    };
    const classification = classifyThemes(base);
    return {
      ...base,
      sectors: classification.sectors,
      themes: classification.themeIds,
      language: "he",
      region: "IL",
      rawReference: {
        channel: `@${PUBLIC_CHANNEL}`,
        messageText: text,
        externalLinks: [...new Set(externalLinks)],
        verificationStatus: "SECONDARY_SOURCE_REQUIRES_CORROBORATION",
        symbolMethod: "EXPLICIT_TICKERS_ONLY",
      },
      credibilityScore: 72,
      freshnessScore: 95,
      relevanceScore: classification.themeIds.length || base.symbols.length ? 88 : 62,
      confidence: 70,
      provenance: { sourceName: "Interactive Israel Telegram", sourceUrl },
    };
  }).filter(Boolean).slice(-30);
}

async function fetchInteractiveIsraelEvents() {
  const response = await axios.get(PUBLIC_PREVIEW_URL, {
    timeout: 15000,
    headers: { "User-Agent": "ImpactOne market-intelligence reader/1.0" },
  });
  return parseInteractiveIsraelHtml(response.data);
}

module.exports = createUnifiedProvider({
  providerId: "telegram",
  label: "Interactive Israel Telegram",
  sourceType: "news",
  category: "geopolitics",
  defaultThemes: [],
  rateLimit: { maxPerMinute: 4 },
}, fetchInteractiveIsraelEvents, { timeoutMs: 17000, cacheTtlMs: 10 * 60 * 1000 });

module.exports.parseInteractiveIsraelHtml = parseInteractiveIsraelHtml;
module.exports.explicitSymbols = explicitSymbols;
module.exports.headlineFromText = headlineFromText;
