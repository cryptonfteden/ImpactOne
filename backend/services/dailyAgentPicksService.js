const axios = require("axios");
const env = require("../config/env");
const canonicalEventRepository = require("./canonicalEventRepository");
const insiderOpportunityService = require("./insiderOpportunityService");
const weeklyFibonacciOpportunityService = require("./weeklyFibonacciOpportunityService");
const optionsAgentService = require("./optionsAgent/optionsAgentService");
const { getUsEquityUniverse } = require("./usEquityUniverseService");
const { POLICY_VERSION, DECISION_GATES } = require("./agentOrchestrator/strategyPolicy");
const { reconcileGoldLifecycle } = require("./goldOpportunityLifecycleService");
const providerRegistry = require("./providers/providerRegistry");
const marketNewsIntelligence = require("./marketNewsIntelligence");

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_FINRA_VOLUME = 100000;
let cache = null;
let inFlight = null;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function yyyymmdd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function recentWeekdays(max = 8) {
  const dates = [];
  for (let offset = 1; dates.length < max && offset < 18; offset += 1) {
    const date = new Date(Date.now() - offset * 86400000);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) dates.push(yyyymmdd(date));
  }
  return dates;
}

function parseFinraMarketFile(raw, date) {
  return String(raw || "").split(/\r?\n/).slice(1).map((line) => {
    const [rowDate, symbol, shortRaw, exemptRaw, totalRaw] = line.trim().split("|");
    const shortVolume = Number(shortRaw);
    const totalVolume = Number(totalRaw);
    if (rowDate !== date || !/^[A-Z][A-Z.\-]{0,9}$/.test(symbol || "") || !Number.isInteger(shortVolume) || !Number.isInteger(totalVolume) || shortVolume < 0 || shortVolume > totalVolume || totalVolume < MIN_FINRA_VOLUME) return null;
    const shortPct = shortVolume / totalVolume * 100;
    return { symbol, shortVolume, shortExemptVolume: finite(exemptRaw), totalVolume, shortPct, otherPct: 100 - shortPct };
  }).filter(Boolean);
}

async function loadLatestFinraMarket() {
  let eligibleSymbols = null;
  try {
    const universe = await getUsEquityUniverse({ force: false });
    eligibleSymbols = new Set(universe.symbols || []);
  } catch {
    return null;
  }
  for (const date of recentWeekdays()) {
    try {
      const response = await axios.get(`https://cdn.finra.org/equity/regsho/daily/CNMSshvol${date}.txt`, { timeout: 15000, responseType: "text" });
      const rows = parseFinraMarketFile(response.data, date).filter((row) => eligibleSymbols.has(row.symbol));
      if (rows.length) return { date, rows, sourceUrl: `https://cdn.finra.org/equity/regsho/daily/CNMSshvol${date}.txt` };
    } catch {}
  }
  return null;
}

function category(id, title, source, picks = [], unavailableReason = null, note = null, candidates = [], stories = []) {
  return {
    id,
    title,
    source,
    picks: picks.slice(0, 3),
    candidates: candidates.slice(0, 3),
    count: Math.min(3, picks.length + stories.length),
    candidateCount: Math.min(3, candidates.length),
    stories: stories.slice(0, 3),
    unavailableReason,
    note,
  };
}

const CONFIRMATION_FAMILY = Object.freeze({
  insider: "ownership",
  "short-flow": "positioning",
  options: "derivatives",
  news: "catalyst",
  government: "catalyst",
  "official-impact": "catalyst",
});

const CONFIRMATION_WEIGHT = Object.freeze({
  ownership: 10,
  positioning: 6,
  derivatives: 6,
  catalyst: 7,
});

function confirmationFamily(categoryId) {
  return CONFIRMATION_FAMILY[categoryId] || categoryId;
}

function isSupportiveConfirmation(pick) {
  const direction = String(pick?.direction || "").toUpperCase();
  return !direction.includes("BEAR") && !direction.includes("REVIEW") && !direction.includes("SELL");
}

function collectIndependentConfirmations(categories) {
  const bySymbol = new Map();
  categories.filter((group) => group.id !== "fibonacci").forEach((group) => {
    const family = confirmationFamily(group.id);
    (group.picks || []).filter(isSupportiveConfirmation).forEach((pick) => {
      const symbolFamilies = bySymbol.get(pick.symbol) || new Map();
      const existing = symbolFamilies.get(family);
      const candidate = {
        agent: group.id,
        family,
        score: finite(pick.score),
        signal: pick.signal,
        verified: true,
        source: group.source || null,
        asOf: pick.asOf || null,
        sourceUrl: pick.sourceUrl || null,
      };
      // Several news boards are one evidence family, not several independent
      // votes. Keep only the strongest source-linked observation per family.
      if (!existing || candidate.score > existing.score) symbolFamilies.set(family, candidate);
      bySymbol.set(pick.symbol, symbolFamilies);
    });
  });
  return bySymbol;
}

function weightedConfirmationScore(fibonacciScore, confirmations) {
  const fibWeight = 10;
  const numerator = finite(fibonacciScore) * fibWeight + confirmations.reduce((sum, item) => sum + finite(item.score) * (CONFIRMATION_WEIGHT[item.family] || 5), 0);
  const denominator = fibWeight + confirmations.reduce((sum, item) => sum + (CONFIRMATION_WEIGHT[item.family] || 5), 0);
  return Math.round(numerator / Math.max(1, denominator));
}

function buildShortFlowCategory(finra) {
  if (!finra?.rows?.length) return category("short-flow", "Short vs. Market Flow", "FINRA daily reported volume", [], "No recent FINRA market-wide file was available.", "Short volume is not open short interest, and other reported volume is not a count of long investors.");
  const byShort = [...finra.rows].filter((row) => row.shortPct >= 60).sort((a, b) => b.shortPct - a.shortPct || b.totalVolume - a.totalVolume).slice(0, 2);
  const lowestShort = [...finra.rows].sort((a, b) => a.shortPct - b.shortPct || b.totalVolume - a.totalVolume)[0];
  const picks = [...byShort.map((row) => ({
    symbol: row.symbol, score: Math.round(row.shortPct), signal: "Unusually high short-selling volume", direction: "BEARISH_FLOW",
    metrics: { shortVolumePct: Number(row.shortPct.toFixed(1)), otherReportedVolumePct: Number(row.otherPct.toFixed(1)), totalVolume: row.totalVolume },
    asOf: finra.date, sourceUrl: finra.sourceUrl,
  }))];
  if (lowestShort && !picks.some((pick) => pick.symbol === lowestShort.symbol)) picks.push({
    symbol: lowestShort.symbol, score: Math.round(lowestShort.otherPct), signal: "Highest other reported volume share", direction: "LOW_SHORT_FLOW",
    metrics: { shortVolumePct: Number(lowestShort.shortPct.toFixed(1)), otherReportedVolumePct: Number(lowestShort.otherPct.toFixed(1)), totalVolume: lowestShort.totalVolume },
    asOf: finra.date, sourceUrl: finra.sourceUrl,
  });
  return category("short-flow", "Short vs. Market Flow", "FINRA daily reported volume", picks, null, "Up to two symbols above 60% short-volume share plus the lowest short-volume share among liquid common stocks. This is trade volume, not open short interest or trader positioning.");
}

function buildOptionsCategory(report, eligibleSymbols = null) {
  if (!report?.signals?.length) return category("options", "Unusual call options", "Licensed real-time flow provider", [], report?.unavailableReason || "No verified real-time unusual CALL activity. Official OCC end-of-day Call/Put volume remains available in each symbol report.");
  const grouped = new Map();
  report.signals.filter((signal) => String(signal.optionType).toUpperCase() === "CALL" && (!eligibleSymbols || eligibleSymbols.has(signal.symbol))).forEach((signal) => {
    const current = grouped.get(signal.symbol);
    if (!current || finite(signal.anomalyScore) > finite(current.anomalyScore)) grouped.set(signal.symbol, signal);
  });
  const picks = [...grouped.values()].sort((a, b) => finite(b.anomalyScore) - finite(a.anomalyScore)).map((signal) => ({
    symbol: signal.symbol, score: Math.round(finite(signal.anomalyScore)), signal: signal.explanation || "Verified unusual CALL activity", direction: "BULLISH_OPTIONS",
    metrics: { anomalyScore: finite(signal.anomalyScore), notionalValue: finite(signal.notionalValue), volumeMultiple: Number.isFinite(Number(signal.volumeMultiple)) ? Number(signal.volumeMultiple) : null, expiry: signal.expiry || null },
    asOf: signal.detectedAt || report.generatedAt, sourceUrl: null,
  }));
  return category("options", "Unusual call options", "Licensed real-time flow provider", picks, picks.length ? null : "The licensed feed had no verified unusual CALL activity in the last 24 hours. OCC end-of-day Call/Put volume remains available in each symbol report.");
}

const FUTURE_MARKET_THEME_RULES = Object.freeze([
  { id: "SPACE", label: "Space", pattern: /\b(space|satellite|rocket|launch|lunar|moon|orbit|nasa|aerospace)\b/i },
  { id: "QUANTUM", label: "Quantum", pattern: /\b(quantum|qubit|quantum computing)\b/i },
  { id: "AI", label: "AI", pattern: /\b(ai|artificial intelligence|machine learning|data cent(?:er|re)|gpu|semiconductor)\b/i },
  { id: "ENERGY", label: "Energy infrastructure", pattern: /\b(power grid|electricity|energy infrastructure|transmission|utility|reactor|nuclear|uranium|fusion)\b/i },
  { id: "DEFENSE", label: "Defense", pattern: /\b(defen[cs]e|weapon|missile|drone|military|pentagon|department of defense|hypersonic)\b/i },
  { id: "US_POLICY", label: "US government", pattern: /\b(white house|congress|senate|federal|government contract|executive order|department of energy|grant|subsidy|procurement)\b/i },
]);

function futureMarketThemes(event) {
  const text = `${event?.summary || ""} ${event?.description || ""} ${event?.sourceName || ""}`;
  return FUTURE_MARKET_THEME_RULES.filter((rule) => rule.pattern.test(text));
}

function buildNewsCategory(events, eligibleSymbols = null) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const grouped = new Map();
  (events || []).forEach((event) => {
    const timestamp = new Date(event.publishedAt || event.ingestedAt || 0).getTime();
    if (!Number.isFinite(timestamp) || timestamp < cutoff || timestamp > Date.now() + 5 * 60 * 1000) return;
    const themes = futureMarketThemes(event);
    if (!themes.length) return;
    [...new Set(event.symbols || [])].forEach((symbol) => {
      if (!/^[A-Z][A-Z.\-]{0,9}$/.test(symbol) || (eligibleSymbols && !eligibleSymbols.has(symbol))) return;
      const current = grouped.get(symbol) || { symbol, articles: 0, sources: new Set(), themes: new Set(), latestAt: null, headlines: [], sourceUrl: null, events: [] };
      current.articles += 1;
      current.events.push(event);
      current.sources.add(event.sourceName || event.providerId || "Unknown source");
      themes.forEach((theme) => current.themes.add(theme.label));
      if (!current.latestAt || timestamp > new Date(current.latestAt).getTime()) current.latestAt = new Date(timestamp).toISOString();
      if (event.summary && current.headlines.length < 2) current.headlines.push(event.summary);
      if (!current.sourceUrl && /^https?:\/\//i.test(event.url || event.sourceUrl || "")) current.sourceUrl = event.url || event.sourceUrl;
      grouped.set(symbol, current);
    });
  });
  const evaluated = [...grouped.values()].map((item) => {
    const ranked = marketNewsIntelligence.enrichAndRankEvents(item.events, { minScore: 0, limit: 1 });
    const lead = ranked[0];
    const score = Math.min(100, Math.round(finite(lead?.intelligenceScore, 0) + Math.min(8, (item.sources.size - 1) * 3) + (lead?.themes?.length ? 3 : 0)));
    return {
      symbol: item.symbol,
      score,
      signal: lead?.summary || `${[...item.themes].slice(0, 2).join(" + ")} market catalyst`,
      direction: "ATTENTION",
      metrics: {
        articleCount: item.articles,
        sourceCount: item.sources.size,
        themes: lead?.themes || [...item.themes],
        sectors: lead?.sectors || [],
        headlines: item.headlines,
        whyItMatters: lead?.whyItMatters || null,
        evidenceClass: lead?.evidenceClass || "VERIFIED_REPORTING",
        scoreBreakdown: lead?.scoreBreakdown || null,
      },
      asOf: lead?.publishedAt || item.latestAt,
      sourceUrl: lead?.sourceUrl || item.sourceUrl,
      sourceName: lead?.sourceName || null,
    };
  }).sort((a, b) => b.score - a.score || b.metrics.sourceCount - a.metrics.sourceCount);
  const picks = evaluated.filter((pick) => pick.score >= 80 && (finite(pick.metrics.scoreBreakdown?.authority) >= 75 || pick.metrics.sourceCount >= 2));
  const candidates = evaluated
    .filter((pick) => !picks.includes(pick) && pick.score >= 72 && finite(pick.metrics.scoreBreakdown?.authority) >= 65)
    .map((pick) => ({
      ...pick,
      status: "CORROBORATE",
      signal: `Needs confirmation · ${pick.signal}`,
      metrics: { ...pick.metrics, evidenceClass: "SECONDARY_DISCOVERY" },
    }));
  const unavailableReason = picks.length || candidates.length
    ? null
    : "No source-linked market catalyst cleared the 7/10 evidence threshold in the last 24 hours.";
  return category("news", "Market-moving themes", "Space · Quantum · AI · Energy · Defense · discovery under review", picks, unavailableReason, "Secondary-source discoveries stay under review until another reliable source confirms the claim.", candidates);
}

function buildOfficialImpactCategory(events) {
  const cutoff = Date.now() - 72 * 60 * 60 * 1000;
  const official = (events || []).filter((event) => {
    const timestamp = new Date(event.publishedAt || event.ingestedAt || 0).getTime();
    const classification = marketNewsIntelligence.classifyThemes(event);
    const priorityTheme = classification.themeIds.some((id) => ["SPACE", "QUANTUM", "AI", "ENERGY", "DEFENSE"].includes(id));
    const text = `${event.summary || ""} ${event.description || ""} ${event.sourceName || ""}`;
    const systemicMacro = /federal reserve|monetary policy|interest rate|rate (?:cut|hike)|inflation|treasury yield|tariff|sanction|export control/i.test(text);
    const linkedIssuer = (event.symbols || []).some((symbol) => /^[A-Z][A-Z.\-]{0,9}$/.test(symbol));
    const routineNotice = /\b(information collection|data collection|request for comments?|ecomments?|extension of (?:a )?previously approved collection)\b/i.test(text);
    return timestamp >= cutoff
      && marketNewsIntelligence.sourceAuthority(event) === 100
      && marketNewsIntelligence.impactScore(event) >= 72
      && !routineNotice
      && (priorityTheme || systemicMacro || linkedIssuer);
  });
  const seenSources = new Set();
  const rankedOfficial = marketNewsIntelligence.enrichAndRankEvents(official, { minScore: 72, limit: 12 })
    .filter((event) => {
      const sourceKey = String(event.providerId || event.sourceName || "official").replace(/\d{4}-\d{2}-\d{2}.*/, "");
      if (seenSources.has(sourceKey)) return false;
      seenSources.add(sourceKey);
      return true;
    })
    .slice(0, 3);
  const stories = rankedOfficial.map((event, index) => ({
    id: event.id || `official-${index}-${event.publishedAt || "event"}`,
    headline: event.summary,
    score: event.intelligenceScore,
    sourceName: event.sourceName,
    sourceUrl: event.sourceUrl,
    publishedAt: event.publishedAt,
    themes: event.themes,
    sectors: event.sectors,
    symbols: event.symbols || [],
    whyItMatters: event.whyItMatters,
    evidenceClass: "PRIMARY_OFFICIAL",
  }));
  return category("official-impact", "Official market radar", "Fed · Treasury · Federal Register · DOE · NASA", [], stories.length ? null : "No official event cleared the market-impact threshold in the last 72 hours.", "Official fact and ImpactOne market interpretation are displayed separately.", [], stories);
}

async function loadOfficialMarketEvents() {
  const providerIds = ["fed", "fomc", "usTreasury", "federalRegister", "doeNews", "nasa"];
  const settled = await Promise.allSettled(providerIds.map(async (providerId) => {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) return [];
    const rows = await provider.fetch();
    return (rows || []).map((row) => ({ ...row, providerId }));
  }));
  const events = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const failures = settled.map((result, index) => result.status === "rejected" ? `${providerIds[index]}: ${result.reason?.message || "failed"}` : null).filter(Boolean);
  const sources = settled.map((result, index) => ({
    providerId: providerIds[index],
    label: providerRegistry.getProvider(providerIds[index])?.label || providerIds[index],
    status: result.status === "rejected" ? "ERROR" : result.value.length ? "LIVE" : "EMPTY",
    count: result.status === "fulfilled" ? result.value.length : 0,
    error: result.status === "rejected" ? result.reason?.message || "failed" : null,
  }));
  return { events, failures, sources };
}

const GOVERNMENT_CATALYST_PATTERN = /\b(white house|congress|senate|federal reserve|treasury|department of (energy|defense|commerce|transportation)|government|federal|grant|contract|subsidy|infrastructure|chips act|inflation reduction act|executive order|regulation|tariff)\b/i;

const POLICY_THEME_RULES = Object.freeze([
  { id: "PUBLIC_FUNDING", pattern: /\b(government contract|federal contract|grant|subsidy|procurement|public funding)\b/i, sectors: ["Industrials", "Government contractors"] },
  { id: "ENERGY_INFRASTRUCTURE", pattern: /\b(energy|grid|power|electricity|nuclear|renewable|solar|battery|transmission|pipeline)\b/i, sectors: ["Energy", "Utilities", "Industrials"] },
  { id: "SEMICONDUCTOR_POLICY", pattern: /\b(chips? act|semiconductor|chip fabrication|foundry)\b/i, sectors: ["Technology", "Semiconductors"] },
  { id: "DEFENSE_PROCUREMENT", pattern: /\b(defen[cs]e|pentagon|military|weapon|aerospace contract)\b/i, sectors: ["Industrials", "Aerospace & Defense"] },
  { id: "HEALTH_POLICY", pattern: /\b(health|medicare|medicaid|drug pricing|biotech|pharma)\b/i, sectors: ["Healthcare"] },
  { id: "TRANSPORT_INFRASTRUCTURE", pattern: /\b(transportation|rail|airport|bridge|highway|transit)\b/i, sectors: ["Industrials", "Transportation"] },
  { id: "TRADE_POLICY", pattern: /\b(tariff|trade restriction|export control|sanction)\b/i, sectors: ["Policy-sensitive sectors"] },
  { id: "MONETARY_POLICY", pattern: /\b(federal reserve|fed funds|interest rate|monetary policy|treasury yield)\b/i, sectors: ["Financials", "Rate-sensitive growth"] },
]);

function classifyPolicyThemes(event) {
  const text = `${event?.summary || ""} ${event?.description || ""}`;
  const matches = POLICY_THEME_RULES.filter((rule) => rule.pattern.test(text));
  return {
    themes: matches.map((rule) => rule.id),
    sectors: [...new Set(matches.flatMap((rule) => rule.sectors))],
  };
}

function governmentEvidence(event) {
  const rawUrl = event?.url || event?.sourceUrl || "";
  let official = false;
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    official = host.endsWith(".gov") || host === "whitehouse.gov" || host === "federalreserve.gov";
  } catch {}
  const text = `${event?.sourceName || ""} ${event?.summary || ""} ${event?.description || ""}`;
  if (!GOVERNMENT_CATALYST_PATTERN.test(text) && !official) return null;
  return { official, evidenceClass: official ? "OFFICIAL_US_GOVERNMENT" : "VERIFIED_REPORT_ABOUT_US_POLICY" };
}

function buildGovernmentCatalystCategory(events, eligibleSymbols = null) {
  const cutoff = Date.now() - 72 * 60 * 60 * 1000;
  const grouped = new Map();
  (events || []).forEach((event) => {
    const evidence = governmentEvidence(event);
    const timestamp = new Date(event.publishedAt || event.ingestedAt || 0).getTime();
    if (!evidence || !Number.isFinite(timestamp) || timestamp < cutoff || timestamp > Date.now() + 300000) return;
    [...new Set(event.symbols || [])].forEach((symbol) => {
      if (!/^[A-Z][A-Z.\-]{0,9}$/.test(symbol) || (eligibleSymbols && !eligibleSymbols.has(symbol))) return;
      const policy = classifyPolicyThemes(event);
      if (!policy.themes.length) return;
      const current = grouped.get(symbol) || { symbol, official: 0, reported: 0, sources: new Set(), themes: new Set(), sectors: new Set(), latestAt: null, headline: null, sourceUrl: null };
      current[evidence.official ? "official" : "reported"] += 1;
      current.sources.add(event.sourceName || event.providerId || "Verified source");
      policy.themes.forEach((theme) => current.themes.add(theme));
      policy.sectors.forEach((sector) => current.sectors.add(sector));
      if (!current.latestAt || timestamp > new Date(current.latestAt).getTime()) {
        current.latestAt = new Date(timestamp).toISOString();
        current.headline = event.summary || event.description || "US policy catalyst";
        current.sourceUrl = event.url || event.sourceUrl || null;
      }
      grouped.set(symbol, current);
    });
  });
  const picks = [...grouped.values()].map((item) => ({
    symbol: item.symbol,
    score: Math.min(100, 58 + item.official * 18 + item.reported * 7 + item.sources.size * 4),
    signal: item.official ? "Official US government catalyst" : "Verified reporting on US policy catalyst",
    direction: "POLICY_CATALYST",
    metrics: { officialSourceCount: item.official, reportedSourceCount: item.reported, sourceCount: item.sources.size, headline: item.headline, evidenceClass: item.official ? "OFFICIAL_US_GOVERNMENT" : "VERIFIED_REPORT_ABOUT_US_POLICY", themes: [...item.themes], sectors: [...item.sectors], committeeTrigger: true },
    asOf: item.latestAt,
    sourceUrl: item.sourceUrl,
  })).sort((a, b) => b.score - a.score || new Date(b.asOf) - new Date(a.asOf));
  return category("government-catalysts", "US Government Watch", "Official policy · contracts · funding · 72h", picks, picks.length ? null : "No symbol-linked US government catalyst was verified in the last 72 hours.", "Official releases and reporting about policy are labelled separately; a policy mention is not treated as a buy signal.");
}

function normalizeFinnhubGeneralNews(rows, eligibleSymbols = null, now = Date.now()) {
  const cutoff = now - 24 * 60 * 60 * 1000;
  return (Array.isArray(rows) ? rows : []).flatMap((row) => {
    const publishedAtMs = Number(row?.datetime) * 1000;
    if (!Number.isFinite(publishedAtMs) || publishedAtMs < cutoff || publishedAtMs > now + 5 * 60 * 1000) return [];
    const symbols = [...new Set(String(row?.related || "").toUpperCase().split(",").map((value) => value.trim()).filter((symbol) => /^[A-Z][A-Z.\-]{0,9}$/.test(symbol) && (!eligibleSymbols || eligibleSymbols.has(symbol))))];
    if (!symbols.length || !row?.headline || !/^https?:\/\//i.test(row?.url || "")) return [];
    return [{
      symbols,
      publishedAt: new Date(publishedAtMs).toISOString(),
      sourceName: row.source || "Finnhub",
      providerId: "finnhub-general-news",
      relevanceScore: 70,
      summary: String(row.headline).trim(),
      description: String(row.summary || "").trim(),
      url: row.url,
    }];
  });
}

function normalizeFinnhubCompanyNews(rows, symbol, now = Date.now()) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const cutoff = now - 24 * 60 * 60 * 1000;
  if (!/^[A-Z][A-Z.\-]{0,9}$/.test(normalizedSymbol)) return [];
  return (Array.isArray(rows) ? rows : []).flatMap((row) => {
    const publishedAtMs = Number(row?.datetime) * 1000;
    if (!Number.isFinite(publishedAtMs) || publishedAtMs < cutoff || publishedAtMs > now + 5 * 60 * 1000 || !row?.headline || !/^https?:\/\//i.test(row?.url || "")) return [];
    return [{
      symbols: [normalizedSymbol],
      publishedAt: new Date(publishedAtMs).toISOString(),
      sourceName: row.source || "Finnhub company news",
      providerId: "finnhub-company-news",
      relevanceScore: 76,
      summary: String(row.headline).trim(),
      description: String(row.summary || "").trim(),
      url: row.url,
    }];
  });
}

function companyAlias(name) {
  return String(name || "")
    .replace(/\b(Common Stock|Ordinary Shares?|Class [A-Z]|American Depositary Shares?|Depositary Shares?)\b/gi, " ")
    .replace(/\b(Incorporated|Corporation|Company|Limited|Holdings?|Group|Inc|Corp|Ltd|PLC|LP|LLC|N\.V\.|S\.A\.)\b/gi, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNewsApiMarketNews(rows, securities = [], now = Date.now()) {
  const cutoff = now - 24 * 60 * 60 * 1000;
  const identities = (securities || []).map((security) => ({
    symbol: String(security.symbol || "").toUpperCase(),
    alias: companyAlias(security.name).toLowerCase(),
  })).filter((identity) => /^[A-Z][A-Z.\-]{0,9}$/.test(identity.symbol) && identity.alias.length >= 5);

  return (Array.isArray(rows) ? rows : []).flatMap((row) => {
    const publishedAtMs = new Date(row?.publishedAt || 0).getTime();
    const headline = String(row?.title || "").trim();
    const url = String(row?.url || "").trim();
    if (!headline || headline === "[Removed]" || !/^https?:\/\//i.test(url) || !Number.isFinite(publishedAtMs) || publishedAtMs < cutoff || publishedAtMs > now + 5 * 60 * 1000) return [];
    const originalText = `${headline} ${row?.description || ""}`;
    const normalizedText = ` ${originalText.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
    const symbols = identities.filter(({ symbol, alias }) => {
      const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const explicitTicker = new RegExp(`(?:\\$${escaped}\\b|\\b(?:NASDAQ|NYSE)\\s*[:\\-]?\\s*${escaped}\\b|\\(${escaped}\\))`, "i").test(originalText);
      return explicitTicker || normalizedText.includes(` ${alias} `);
    }).map(({ symbol }) => symbol).slice(0, 8);
    if (!symbols.length) return [];
    return [{
      symbols: [...new Set(symbols)],
      publishedAt: new Date(publishedAtMs).toISOString(),
      sourceName: row.source?.name || "NewsAPI indexed source",
      providerId: "newsapi-market-news",
      relevanceScore: 72,
      summary: headline,
      description: String(row.description || "").trim(),
      url,
    }];
  });
}

async function loadLiveMarketNewsEvents(universe = null, focusSymbols = []) {
  const events = [];
  const failures = [];
  const eligibleSymbols = universe ? new Set(universe.symbols || []) : null;
  if (env.FINNHUB_API_KEY) {
    try {
      const response = await axios.get("https://finnhub.io/api/v1/news", {
        params: { category: "general", minId: 0, token: env.FINNHUB_API_KEY },
        timeout: 15000,
      });
      events.push(...normalizeFinnhubGeneralNews(response.data, eligibleSymbols));
    } catch (error) {
      failures.push(`Finnhub: ${error.response?.status || error.code || error.message}`);
    }
  } else failures.push("FINNHUB_API_KEY is not configured");

  if (env.FINNHUB_API_KEY && focusSymbols.length) {
    const now = new Date();
    const from = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);
    const requests = [...new Set(focusSymbols)].filter((symbol) => !eligibleSymbols || eligibleSymbols.has(symbol)).slice(0, 24).map(async (symbol) => {
      const response = await axios.get("https://finnhub.io/api/v1/company-news", {
        params: { symbol, from, to, token: env.FINNHUB_API_KEY },
        timeout: 15000,
      });
      return normalizeFinnhubCompanyNews(response.data, symbol);
    });
    const results = await Promise.allSettled(requests);
    results.forEach((result) => {
      if (result.status === "fulfilled") events.push(...result.value);
    });
    if (results.length && results.every((result) => result.status === "rejected")) failures.push("Finnhub company news was unavailable for every verified focus symbol");
  }

  if (env.NEWS_API_KEY) {
    try {
      const now = new Date();
      const response = await axios.get("https://newsapi.org/v2/everything", {
        params: {
          q: "(stock OR shares OR earnings) AND (Nasdaq OR NYSE OR Wall Street)",
          language: "en",
          sortBy: "publishedAt",
          from: new Date(now.getTime() - 86400000).toISOString(),
          to: now.toISOString(),
          pageSize: 100,
          apiKey: env.NEWS_API_KEY,
        },
        timeout: 15000,
      });
      events.push(...normalizeNewsApiMarketNews(response.data?.articles, universe?.securities || []));
    } catch (error) {
      failures.push(`NewsAPI: ${error.response?.status || error.code || error.message}`);
    }
  } else failures.push("NEWS_API_KEY is not configured");

  return { events, unavailableReason: events.length ? null : failures.join(" · ") || "No live news provider is configured." };
}

function buildInsiderCategory(report) {
  const verified = (report?.opportunities || []).filter((item) => item.verificationStatus !== "PENDING_SEC_VERIFICATION");
  const picks = verified.filter((item) => item.committee?.approved).sort((a, b) => finite(b.committee?.score) - finite(a.committee?.score)).map((item) => ({
    symbol: item.symbol, score: Math.round(finite(item.committee?.score)), signal: "Verified SEC Form 4 open-market purchase", direction: "INSIDER_BUY",
    metrics: { purchaseValue: finite(item.insider?.totalValue), averagePrice: item.insider?.averagePrice ?? null, buyers: finite(item.insider?.distinctBuyers), date: item.insider?.latestPurchaseDate || null, reversal: item.reversalSignal || null },
    asOf: item.generatedAt || report.generatedAt, sourceUrl: item.filingUrl || null,
  }));
  // Discovery candidates are real, source-linked observations, but they are
  // deliberately kept separate from recommendations until the SEC filing
  // parser and the full committee both clear them. Hiding them made an honest
  // pending state look like the scanner had found nothing at all.
  const reviewPool = [
    ...verified.filter((item) => !item.committee?.approved),
    ...(report?.discoveredPurchases || []).filter((item) => item.verificationStatus === "PENDING_SEC_VERIFICATION"),
  ];
  const candidates = [...new Map(reviewPool.map((item) => [item.symbol, item])).values()]
    .sort((a, b) => finite(b.unusualActivity?.score, finite(b.committee?.score)) - finite(a.unusualActivity?.score, finite(a.committee?.score)) || finite(b.insider?.totalValue) - finite(a.insider?.totalValue))
    .map((item) => ({
      symbol: item.symbol,
      score: Math.round(finite(item.unusualActivity?.score, finite(item.committee?.score))),
      signal: item.verificationStatus === "PENDING_SEC_VERIFICATION" ? "SEC verification in progress" : "Verified filing · committee review",
      status: item.verificationStatus === "PENDING_SEC_VERIFICATION" ? "SEC REVIEW" : "COMMITTEE REVIEW",
      direction: "INSIDER_REVIEW",
      metrics: { purchaseValue: finite(item.insider?.totalValue), averagePrice: item.insider?.averagePrice ?? null, buyers: finite(item.insider?.distinctBuyers), date: item.insider?.latestPurchaseDate || null },
      asOf: item.generatedAt || report.generatedAt,
      sourceUrl: item.filingUrl || null,
    }));
  return category(
    "insider",
    "Insider purchases",
    "SEC EDGAR Form 4 · transaction code P",
    picks,
    picks.length ? null : candidates.length ? "No approved insider pick yet; source-linked candidates are still being verified." : "No SEC-verified open-market purchase cleared the evidence gate today.",
    "Candidates under review are evidence, not recommendations.",
    candidates,
  );
}

function buildFibonacciCategory(report) {
  const rows = report?.approvedOpportunities || [];
  const picks = rows.sort((a, b) => finite(b.committee?.score) - finite(a.committee?.score)).map((item) => ({
    symbol: item.symbol, score: Math.round(finite(item.committee?.score)), signal: "Inside the weekly Golden Zone · 0.886", direction: "STRATEGY_SETUP",
    metrics: { currentPrice: item.weekly?.currentPrice, targetPrice: item.weekly?.targetPrice, distancePct: item.weekly?.distancePct, weeklyBars: item.weekly?.weeklyBarCount },
    asOf: item.generatedAt || report.generatedAt, sourceUrl: null,
  }));
  const candidates = (report?.researchCandidates || []).sort((a, b) => finite(b.committee?.score) - finite(a.committee?.score)).map((item) => ({
    symbol: item.symbol, score: Math.round(finite(item.committee?.score)), signal: "Weekly Golden Zone · committee review", status: "GOLD RADAR", direction: "STRATEGY_REVIEW",
    metrics: { currentPrice: item.weekly?.currentPrice, targetPrice: item.weekly?.targetPrice, distancePct: item.weekly?.distancePct, weeklyBars: item.weekly?.weeklyBarCount, blockers: item.committee?.blockers || [] },
    asOf: item.generatedAt || report.generatedAt, sourceUrl: null,
  }));
  return category("fibonacci", "Golden Zone Radar", "Weekly 0.886 · verified US stocks", picks, picks.length ? null : candidates.length ? "Golden Zone candidates exist, but the committee has not cleared them yet." : "No stock is currently within 5% of the weekly Golden Zone.", "Weekly low → later high · candidates within 5% stay visible until committee confirmation.", candidates);
}

function buildGoldPicks(categories) {
  const fibonacci = categories.find((group) => group.id === "fibonacci") || { picks: [] };
  const independent = collectIndependentConfirmations(categories);
  return (fibonacci.picks || [])
    .map((pick) => {
      const confirmations = [...(independent.get(pick.symbol)?.values() || [])];
      return {
        symbol: pick.symbol,
        score: weightedConfirmationScore(pick.score, confirmations),
        coverage: confirmations.length + 1,
        independentConfirmationCount: confirmations.length,
        confirmationFamilies: confirmations.map((item) => item.family),
        agents: ["fibonacci", ...confirmations.map((item) => item.agent)],
        evidence: [{ agent: "fibonacci", signal: pick.signal, score: pick.score }, ...confirmations],
        label: "GOLD · WEEKLY 0.886 + INDEPENDENT EVIDENCE",
      };
    })
    .filter((item) => item.independentConfirmationCount >= DECISION_GATES.goldMinimumIndependentConfirmations && item.score >= DECISION_GATES.committeeApprovalScore)
    .sort((a, b) => b.score - a.score).slice(0, 3);
}

function buildGoldOpportunities(categories) {
  const fibonacci = categories.find((group) => group.id === "fibonacci") || { picks: [], candidates: [] };
  const independent = collectIndependentConfirmations(categories);
  const rows = [
    ...(fibonacci.picks || []).map((pick) => ({ pick, fibonacciApproved: true })),
    ...(fibonacci.candidates || []).map((pick) => ({ pick, fibonacciApproved: false })),
  ];
  return rows.map(({ pick, fibonacciApproved }) => {
    const confirmations = [...(independent.get(pick.symbol)?.values() || [])];
    const verifiedConfirmations = confirmations.filter((item) => item.verified);
    const score = weightedConfirmationScore(pick.score, verifiedConfirmations);
    const clearsScore = score >= DECISION_GATES.committeeApprovalScore;
    const state = fibonacciApproved && verifiedConfirmations.length >= DECISION_GATES.goldMinimumIndependentConfirmations && clearsScore
      ? "CONFIRMED"
      : fibonacciApproved && verifiedConfirmations.length >= 1 ? "WATCH" : "RADAR";
    return {
      symbol: pick.symbol,
      state,
      approved: state === "CONFIRMED",
      score,
      fibonacci: pick.metrics,
      confirmations,
      independentConfirmationCount: verifiedConfirmations.length,
      confirmationFamilies: verifiedConfirmations.map((item) => item.family),
      blockers: [
        ...(!fibonacciApproved ? ["The full Fibonacci committee gate is not cleared."] : []),
        ...(verifiedConfirmations.length < DECISION_GATES.goldMinimumIndependentConfirmations ? [`Needs ${DECISION_GATES.goldMinimumIndependentConfirmations - verifiedConfirmations.length} more independent verified confirmation(s).`] : []),
        ...(!clearsScore ? [`The weighted evidence score is below ${DECISION_GATES.committeeApprovalScore}/100.`] : []),
      ],
    };
  }).sort((a, b) => ({ CONFIRMED: 3, WATCH: 2, RADAR: 1 }[b.state] - ({ CONFIRMED: 3, WATCH: 2, RADAR: 1 }[a.state]) || b.score - a.score)).slice(0, 12);
}

async function loadReport() {
  const since = new Date(Date.now() - 86400000).toISOString();
  const [insider, fib, options, storedEvents, finra, universe, officialNews] = await Promise.all([
    insiderOpportunityService.runDailyScan({ force: false }).catch((error) => ({ opportunities: [], unavailableReason: error.message })),
    Promise.resolve(weeklyFibonacciOpportunityService.getScanSnapshot()).then((value) => value || weeklyFibonacciOpportunityService.runScan({ force: false })).catch((error) => ({ approvedOpportunities: [], unavailableReason: error.message })),
    optionsAgentService.listSignals({ since, minAnomalyScore: 60, limit: 200 }).catch((error) => ({ signals: [], unavailableReason: error.message })),
    canonicalEventRepository.listRecent({ limit: 500 }).catch(() => []),
    loadLatestFinraMarket(),
    getUsEquityUniverse({ force: false }).catch(() => null),
    loadOfficialMarketEvents().catch((error) => ({ events: [], failures: [error.message] })),
  ]);
  const eligibleSymbols = universe ? new Set(universe.symbols || []) : null;
  const baseCategories = [buildFibonacciCategory(fib), buildInsiderCategory(insider), buildShortFlowCategory(finra), buildOptionsCategory(options, eligibleSymbols)];
  const agentSymbols = baseCategories.flatMap((group) => [...(group.picks || []), ...(group.candidates || [])].map((item) => item.symbol));
  const liquidSymbols = [...(finra?.rows || [])].sort((left, right) => right.totalVolume - left.totalVolume).slice(0, 8).map((row) => row.symbol);
  // A small stable liquidity panel prevents the news specialist from becoming
  // empty on days when the other strategy agents surface only obscure names.
  // These are discovery queries, not recommendations; ranking still depends
  // solely on real articles returned in the current 24-hour window.
  const liquidNewsBenchmarks = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "AMD"];
  const liveNews = await loadLiveMarketNewsEvents(universe, [...agentSymbols, ...liquidSymbols, ...liquidNewsBenchmarks]);
  const allNewsEvents = [...(storedEvents || []), ...(liveNews.events || []), ...(officialNews.events || [])];
  const newsCategory = buildNewsCategory(allNewsEvents, eligibleSymbols);
  if (!newsCategory.picks.length && !newsCategory.candidates.length && liveNews.unavailableReason) newsCategory.unavailableReason = liveNews.unavailableReason;
  const governmentCategory = buildGovernmentCatalystCategory(allNewsEvents, eligibleSymbols);
  const officialImpactCategory = buildOfficialImpactCategory(allNewsEvents);
  const categories = [...baseCategories, officialImpactCategory, newsCategory, governmentCategory];
  const goldPicks = buildGoldPicks(categories);
  const goldOpportunities = await reconcileGoldLifecycle(buildGoldOpportunities(categories), {
    fullScanComplete: Boolean(fib?.universe?.cycleComplete || fib?.universe?.remaining === 0),
  }).catch(() => buildGoldOpportunities(categories));
  const telegramEvents = allNewsEvents.filter((event) => event.providerId === "telegram" || event.sourceName === "Interactive Israel Telegram");
  const newsSourceStatus = [
    ...(officialNews.sources || []),
    {
      providerId: "telegram",
      label: "Interactive Israel Telegram",
      status: telegramEvents.length ? "LIVE" : "EMPTY",
      count: telegramEvents.length,
      role: "SECONDARY_DISCOVERY",
      verification: "REQUIRES_CORROBORATION",
    },
  ];
  return {
    generatedAt: new Date().toISOString(), nextRefreshAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(), methodologyVersion: "daily-agent-picks-v3-impact-ranked-news", strategyPolicyVersion: POLICY_VERSION,
    categories, goldPicks, goldOpportunities,
    goldRule: "Approved weekly 0.886 setup plus at least two independent evidence families, source-linked inputs, and a weighted score of 65/100 or higher.",
    unavailableAgentCount: categories.filter((group) => group.unavailableReason).length,
    newsPipeline: {
      officialSources: ["Federal Reserve", "U.S. Treasury", "Federal Register", "U.S. Department of Energy", "NASA"],
      failures: officialNews.failures || [],
      sourceStatus: newsSourceStatus,
      thresholds: { officialImpact: 72, symbolNews: 80 },
      inputs: { storedEvents: storedEvents.length, liveMarketEvents: liveNews.events?.length || 0, officialEvents: officialNews.events?.length || 0 },
      noSyntheticCompanyMapping: true,
    },
  };
}

async function getDailyAgentPicks({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.cachedAt < CACHE_TTL_MS) return cache.payload;
  if (!force && inFlight) return inFlight;
  inFlight = loadReport();
  try {
    const payload = await inFlight;
    cache = { cachedAt: Date.now(), payload };
    return payload;
  } finally { inFlight = null; }
}

function clearCache() { cache = null; inFlight = null; }

module.exports = { parseFinraMarketFile, buildShortFlowCategory, buildOptionsCategory, buildNewsCategory, buildOfficialImpactCategory, loadOfficialMarketEvents, classifyPolicyThemes, buildGovernmentCatalystCategory, normalizeFinnhubGeneralNews, normalizeFinnhubCompanyNews, normalizeNewsApiMarketNews, loadLiveMarketNewsEvents, buildInsiderCategory, buildFibonacciCategory, collectIndependentConfirmations, buildGoldPicks, buildGoldOpportunities, getDailyAgentPicks, clearCache };
