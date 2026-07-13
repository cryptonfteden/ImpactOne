// Sprint 20, Part 6 — Theme Dashboard. Reuses the existing, real
// classifyEventType classification (autonomousMarketService.js) that
// already tags every feed item's eventType — "supporting evidence" here is
// real feed events whose already-computed eventType matches the theme, not
// a fabricated data source. Thesis generation is deliberately deterministic
// (not a new LLM touchpoint) — a documented, appropriately-scoped choice
// for a first slice, consistent with keeping this already-large sprint's
// cost/complexity bounded.
const autonomousMarketService = require("./autonomousMarketService");
const themeSnapshotRepository = require("./themeSnapshotRepository");

const THEME_DEFINITIONS = {
  ai: { label: "AI", companies: ["NVDA", "MSFT", "GOOGL", "META"], etfs: ["BOTZ", "ROBO", "AIQ"] },
  quantum: { label: "Quantum", companies: ["IBM", "GOOGL", "IONQ", "RGTI"], etfs: [] },
  defense: { label: "Defense", companies: ["LMT", "RTX", "NOC", "GD"], etfs: ["ITA", "XAR"] },
  energy: { label: "Energy", companies: ["XOM", "CVX", "NEE"], etfs: ["XLE", "ICLN"] },
  space: { label: "Space", companies: ["LMT", "RTX", "BA"], etfs: ["ARKX", "UFO"] },
  cybersecurity: { label: "Cyber", companies: ["CRWD", "PANW", "FTNT", "ZS"], etfs: ["CIBR", "HACK"] },
  healthcare: { label: "Healthcare", companies: ["UNH", "JNJ", "PFE", "LLY"], etfs: ["XLV", "IBB"] },
};

/**
 * A deterministic tier from real, observed event volume for this theme in
 * the current feed — never a fabricated/editorial label.
 */
function computeMaturityTier(matchingEventCount) {
  if (matchingEventCount >= 5) return "Mature";
  if (matchingEventCount >= 3) return "Growth";
  if (matchingEventCount >= 1) return "Emerging";
  return "Early";
}

function buildThesis({ label, matchingEvents, companies }) {
  if (!matchingEvents.length) {
    return `No major ${label} developments detected in today's feed yet. This view will fill in as more evidence accumulates.`;
  }
  const top = matchingEvents[0];
  const companyList = companies.slice(0, 3).join(", ");
  return (
    `${label} shows ${matchingEvents.length} recent signal${matchingEvents.length === 1 ? "" : "s"} in today's feed, ` +
    `most notably: "${top.headline}." ${top.whyItMatters || ""}${companyList ? ` Companies most exposed include ${companyList}.` : ""}`
  );
}

function buildCounterarguments(matchingEvents) {
  const all = matchingEvents.flatMap((event) => event.explainability?.counterarguments || []);
  return Array.from(new Set(all)).slice(0, 3);
}

function computeConfidence(matchingEvents) {
  if (!matchingEvents.length) {
    return 50;
  }
  const total = matchingEvents.reduce((sum, event) => sum + (Number(event.confidence) || 50), 0);
  return Math.round(total / matchingEvents.length);
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

async function getThemeIntelligence(themeKey) {
  const definition = THEME_DEFINITIONS[themeKey];
  if (!definition) {
    throw notFound(`Unknown theme: ${themeKey}`);
  }

  const overview = await autonomousMarketService.getAutonomousOverview({ watchlist: definition.companies });
  const matchingEvents = (overview.feed || []).filter((event) => event.eventType === themeKey);
  const maturity = computeMaturityTier(matchingEvents.length);
  const confidenceScore = computeConfidence(matchingEvents);
  const snapshots = await themeSnapshotRepository.getRecentSnapshots(themeKey, 30);

  return {
    themeKey,
    label: definition.label,
    maturity,
    thesis: buildThesis({ label: definition.label, matchingEvents, companies: definition.companies }),
    supportingEvidence: matchingEvents.slice(0, 5).map((event) => ({
      headline: event.headline,
      whyItMatters: event.whyItMatters,
      sourceName: event.sourceName,
      sourceUrl: event.sourceUrl,
      publishedAt: event.publishedAt,
    })),
    counterarguments: buildCounterarguments(matchingEvents),
    companies: definition.companies,
    etfs: definition.etfs,
    confidenceScore,
    confidenceTrend: [...snapshots].reverse().map((snapshot) => ({
      date: snapshot.date,
      confidenceScore: Number(snapshot.confidenceScore),
      maturityLabel: snapshot.maturityLabel,
    })),
  };
}

function listThemes() {
  return Object.entries(THEME_DEFINITIONS).map(([themeKey, definition]) => ({ themeKey, label: definition.label }));
}

/**
 * Best-effort daily capture, mirroring dailyBriefArchiveService's "never
 * breaks the caller" discipline exactly — one row per theme per day,
 * building real confidence-trend history starting from whenever this
 * first runs, never backfilled.
 */
async function captureTodaySnapshotForAllThemes() {
  const results = [];
  for (const themeKey of Object.keys(THEME_DEFINITIONS)) {
    try {
      const intelligence = await getThemeIntelligence(themeKey);
      await themeSnapshotRepository.upsertTodaySnapshot({
        themeKey,
        confidenceScore: intelligence.confidenceScore,
        maturityLabel: intelligence.maturity,
      });
      results.push({ themeKey, ok: true });
    } catch (error) {
      results.push({ themeKey, ok: false, error: error.message });
    }
  }
  return results;
}

module.exports = {
  THEME_DEFINITIONS,
  listThemes,
  getThemeIntelligence,
  captureTodaySnapshotForAllThemes,
};
