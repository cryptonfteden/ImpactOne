const MARKET_THEMES = Object.freeze([
  { id: "SPACE", label: "Space", pattern: /(?:\b(?:space|satellite|rocket|launch|lunar|moon|orbit|nasa|aerospace)\b|חלל|לוויין|לווינים|רקטה|שיגור)/i, sectors: ["Aerospace & Defense", "Communications"] },
  { id: "QUANTUM", label: "Quantum", pattern: /(?:\b(?:quantum|qubit|quantum computing)\b|קוונט)/i, sectors: ["Technology"] },
  { id: "AI", label: "AI", pattern: /(?:\b(?:ai|artificial intelligence|machine learning|data cent(?:er|re)|gpu|semiconductor)\b|בינה מלאכותית|שבבים|מרכזי נתונים|מחשוב)/i, sectors: ["Technology", "Semiconductors"] },
  { id: "ENERGY", label: "Energy infrastructure", pattern: /(?:\b(?:power grid|electricity|energy infrastructure|transmission|utility|reactor|nuclear|uranium|fusion|natural gas|oil reserve)\b|אנרגיה|נפט|גרעין|חשמל|רשת החשמל|גז טבעי)/i, sectors: ["Energy", "Utilities", "Industrials"] },
  { id: "DEFENSE", label: "Defense", pattern: /(?:\b(?:defen[cs]e|weapon|missile|drone|military|pentagon|department of defense|hypersonic)\b|נשק|טילים?|צבאי|מערכת הביטחון|פנטגון)/i, sectors: ["Aerospace & Defense", "Industrials"] },
  { id: "US_POLICY", label: "US government", pattern: /(?:\b(?:white house|congress|senate|federal reserve|treasury|federal|government contract|executive order|department of energy|grant|subsidy|procurement|tariff|sanction|regulation)\b|ממשל ארה[״\"]ב|משרד האוצר|הפד|מכסים|סנקציות|קונגרס|רגולציה)/i, sectors: ["Policy-sensitive sectors"] },
]);

const HIGH_IMPACT_PATTERN = /(?:\b(?:emergency|unexpected|surprise|ban|halt|war|attack|sanction|tariff|rate (?:cut|hike)|contract|award|grant|funding|loan|selected|selection|criticality|commercial operation|demonstration|deployment|procurement|acquisition|merger|approval|rejection|recall|guidance|earnings|bankruptcy|investigation|executive order|export control|shortage|shutdown)\b|עסקה|חוזה|מימון|מענק|מכרז|אישור|ניסוי|מכסים|סנקציות|ריבית|חקיקה|רכישה עצמית|בייבאק|פשיטת רגל)/i;
const MEDIUM_IMPACT_PATTERN = /(?:\b(?:policy|regulation|investment|partnership|launch|expand(?:s|ed|ing)?|expansion|capacity|forecast|inflation|employment|yield|production|demand|supply)\b|תחזית|השקעה|שותפות|השקה|ייצור|ביקוש|היצע|אינפלציה|תשואות)/i;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function eventText(event = {}) {
  return `${event.summary || ""} ${event.description || ""} ${event.sourceName || ""}`.trim();
}

function sourceHostname(event = {}) {
  try { return new URL(event.url || event.sourceUrl || "").hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

function sourceAuthority(event = {}) {
  const host = sourceHostname(event);
  const name = String(event.sourceName || "").toLowerCase();
  if (host.endsWith(".gov") || /federal reserve|u\.s\. treasury|sec edgar|federal register|nasa|department of/i.test(name)) return 100;
  if (/reuters|associated press|bloomberg|financial times|wall street journal/i.test(name)) return 92;
  if (/cnbc|marketwatch|barron|fortune|business insider/i.test(name)) return 82;
  return clamp(event.credibilityScore ?? 66);
}

function freshnessScore(event = {}, now = Date.now()) {
  const timestamp = new Date(event.publishedAt || event.ingestedAt || 0).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  const ageHours = Math.max(0, (now - timestamp) / 3600000);
  if (ageHours <= 1) return 100;
  if (ageHours <= 6) return 92;
  if (ageHours <= 24) return 80;
  if (ageHours <= 72) return 62;
  return Math.max(15, 55 - ageHours / 24 * 4);
}

function impactScore(event = {}) {
  const text = eventText(event);
  const direct = HIGH_IMPACT_PATTERN.test(text) ? 92 : MEDIUM_IMPACT_PATTERN.test(text) ? 72 : 48;
  const scopeBoost = /federal reserve|treasury|white house|congress|tariff|sanction|war|oil|nuclear/i.test(text) ? 6 : 0;
  return clamp(direct + scopeBoost);
}

function classifyThemes(event = {}) {
  const text = eventText(event);
  const matched = MARKET_THEMES.filter((theme) => theme.pattern.test(text));
  return {
    themes: matched.map((theme) => theme.label),
    themeIds: matched.map((theme) => theme.id),
    sectors: [...new Set([...(event.sectors || []), ...matched.flatMap((theme) => theme.sectors)])],
  };
}

function marketImpactExplanation(event, classification = classifyThemes(event)) {
  const text = eventText(event);
  if (/federal reserve|rate cut|rate hike|monetary policy|הפד|ריבית/i.test(text)) return "May change borrowing costs, bond yields and valuations across rate-sensitive stocks.";
  if (/grid|electricity|nuclear|energy infrastructure|רשת החשמל|גרעין|אנרגיה|נפט/i.test(text)) return "May affect utilities, power equipment, nuclear supply chains, transport costs and data-center capacity.";
  if (/contract|award|grant|funding|procurement|חוזה|עסקה|מימון|מענק|מכרז/i.test(text)) return "Funding, procurement or a material commercial agreement may change revenue visibility for verified recipients and exposed industries.";
  if (/tariff|sanction|export control|מכסים|סנקציות/i.test(text)) return "May alter input costs, supply chains and access to international markets.";
  if (/defen[cs]e|missile|military|pentagon/i.test(text)) return "May affect defense budgets, contractors and critical-component suppliers.";
  if (/space|satellite|nasa|launch/i.test(text)) return "May affect launch, satellite, communications and aerospace suppliers.";
  if (classification.sectors.length) return `Potential sector impact: ${classification.sectors.slice(0, 3).join(", ")}.`;
  return "Verified event with possible market impact; no company-specific effect is asserted yet.";
}

function scoreEvent(event, { corroborationCount = 1, directPortfolioMatch = false, now = Date.now() } = {}) {
  const authority = sourceAuthority(event);
  const freshness = freshnessScore(event, now);
  const impact = impactScore(event);
  const relevance = clamp(event.relevanceScore ?? event.confidence ?? 60);
  const corroboration = clamp(45 + Math.max(0, corroborationCount - 1) * 18);
  const score = Math.round(authority * .29 + freshness * .22 + impact * .27 + relevance * .14 + corroboration * .08 + (directPortfolioMatch ? 8 : 0));
  return { score: clamp(score), authority, freshness, impact, relevance, corroboration };
}

function normalizeHeadline(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").slice(0, 10).join(" ");
}

function enrichAndRankEvents(events = [], { minScore = 70, limit = 12, now = Date.now() } = {}) {
  const groups = new Map();
  events.forEach((event) => {
    const headline = event.summary || event.description;
    if (!headline) return;
    const key = normalizeHeadline(headline);
    if (!key) return;
    const current = groups.get(key) || [];
    current.push(event);
    groups.set(key, current);
  });

  return [...groups.values()].map((reports) => {
    const event = [...reports].sort((a, b) => sourceAuthority(b) - sourceAuthority(a))[0];
    const classification = classifyThemes(event);
    const scoring = scoreEvent(event, { corroborationCount: new Set(reports.map((row) => row.sourceName || row.providerId)).size, now });
    return {
      ...event,
      intelligenceScore: scoring.score,
      scoreBreakdown: scoring,
      themes: classification.themes,
      sectors: classification.sectors,
      whyItMatters: marketImpactExplanation(event, classification),
      evidenceClass: sourceAuthority(event) === 100 ? "PRIMARY_OFFICIAL" : "VERIFIED_REPORTING",
      sourceUrl: event.sourceUrl || event.url || null,
      sourceCount: new Set(reports.map((row) => row.sourceName || row.providerId)).size,
    };
  }).filter((event) => event.intelligenceScore >= minScore)
    .sort((a, b) => b.intelligenceScore - a.intelligenceScore || new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, limit);
}

module.exports = { MARKET_THEMES, sourceAuthority, freshnessScore, impactScore, classifyThemes, marketImpactExplanation, scoreEvent, enrichAndRankEvents };
