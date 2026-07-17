import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { LoadingSpinner } from "../components/ui";
import { homeApi } from "../services/api";
import useWatchlist from "../hooks/useWatchlist";
import { logError } from "../utils/errorHandling";

const ACTION_PILL_CLASS = {
  BUY: "pill opportunity",
  REDUCE: "pill monitor",
  EXIT: "pill risk",
};

const TIMELINE_SECTIONS = [
  { key: "overnight", label: "Overnight" },
  { key: "openingBell", label: "Opening Bell" },
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "This Week" },
  { key: "longTerm", label: "Long Term" },
];

// Sprint 32 Priority 2 — fallback order if the backend ever omits
// cardOrder (e.g. an older cached response) — identical to the fixed
// order this screen always used before Adaptive Home existed.
const DEFAULT_CARD_ORDER = ["morningBrief", "todayForYou", "portfolio", "beliefs", "recommendations", "intelligenceTimeline"];

// Sprint 33 Priority 7 — returning users need real data freshness, not a
// guess: generatedAt is the actual server timestamp for this response
// (homeSummaryService sets it right before returning), so this is always
// honest about how old what's on screen actually is.
function formatFreshness(generatedAt) {
  const generated = new Date(generatedAt);
  if (Number.isNaN(generated.getTime())) return null;

  const ageMs = Date.now() - generated.getTime();
  const ageMinutes = Math.floor(ageMs / 60000);

  if (ageMinutes < 1) return "Updated just now";
  if (ageMinutes < 60) return `Updated ${ageMinutes} min ago`;

  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return `Updated ${ageHours}h ago`;

  return `Updated ${generated.toLocaleString()}`;
}

/**
 * Sprint 20, Part 3 — the Home screen, originally six standalone "what
 * changed" cards.
 *
 * Sprint 28 — "Morning Intelligence": Home becomes the single unified
 * Morning Brief. Rather than adding new cards on top of the old six (which
 * would fight this sprint's own "reduce scrolling, reduce repeated cards"
 * goal), overlapping cards were merged. Net result: still 6 cards.
 *
 * Sprint 32 — "Adaptive Home": the six cards' *content* never changes
 * (every fact is exactly what Sprint 28-31 already built), but the
 * *order* they render in is now personal — computeAdaptiveCardOrder
 * (backend) scores each card by real signals (is there an action needed,
 * how many beliefs changed, is this investor a "deep reader") and this
 * screen simply renders whatever order the backend returns.
 */
export default function HomeScreen({ onNavigate }) {
  const { watchlist } = useWatchlist();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTimelineSection, setActiveTimelineSection] = useState("today");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const data = await homeApi.getSummary(watchlist);
        if (!cancelled) {
          setSummary(data);
          setError("");
        }
      } catch (loadError) {
        logError("home summary load failed", loadError);
        if (!cancelled) {
          setError("We couldn't load today's summary right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.join(",")]);

  if (isLoading) {
    return (
      <div className="screen-page home-screen">
        <LoadingSpinner label="Building today's summary" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="screen-page home-screen">
        <p className="company-description negative">{error || "Nothing to show yet."}</p>
      </div>
    );
  }

  const {
    whatHappened,
    whyShouldICare,
    howDoesItAffectMe,
    whatChangedSinceYesterday = [],
    whatChangedSinceYesterdayAvailable = true,
    whatChangedForMyPortfolio,
    whatChangedInBeliefs = [],
    shouldIDoAnythingToday,
    topRecommendations = [],
    intelligenceTimeline = {},
    todayForYou = [],
    portfolioMorningSummary,
    personalBrief = [],
    cardOrder = DEFAULT_CARD_ORDER,
    generatedAt,
  } = summary;

  const freshnessLabel = generatedAt ? formatFreshness(generatedAt) : null;

  const glancePills = [
    { label: "Action needed", value: shouldIDoAnythingToday.hasAction ? `Yes — ${shouldIDoAnythingToday.symbol}` : "No", tone: shouldIDoAnythingToday.hasAction ? "opportunity" : "" },
    { label: "Portfolio", value: whatChangedForMyPortfolio?.changes?.length ? `${whatChangedForMyPortfolio.changes.length} change(s)` : "Unchanged", tone: whatChangedForMyPortfolio?.changes?.length ? "monitor" : "" },
    { label: "Beliefs", value: whatChangedInBeliefs.length ? `${whatChangedInBeliefs.length} updated` : "Unchanged", tone: whatChangedInBeliefs.length ? "monitor" : "" },
  ];

  const activeSectionItems = intelligenceTimeline[activeTimelineSection] || [];

  const cardsByKey = {
    morningBrief: (
      <SectionCard key="morningBrief" title="Morning Brief" icon="◉" className="screen-card home-card">
        <p className="company-description">{whatHappened.headline}</p>
        {whatHappened.sourceUrl ? (
          <a href={whatHappened.sourceUrl} target="_blank" rel="noopener noreferrer" className="matched-event__source">
            {whatHappened.sourceName || "Source"}
          </a>
        ) : null}
        <p className="company-description subtle">{whyShouldICare}</p>
        <p className="company-description subtle">{howDoesItAffectMe}</p>
        {whatChangedSinceYesterday.length ? (
          <ul className="stack-list">
            {whatChangedSinceYesterday.map((line, index) => (
              <li key={index} className="company-description subtle">{line}</li>
            ))}
          </ul>
        ) : whatChangedSinceYesterdayAvailable ? (
          <p className="company-description subtle">No material change vs. yesterday.</p>
        ) : (
          <p className="company-description subtle negative">
            We couldn't check what changed since yesterday right now — this isn't the same as nothing having changed. Try again shortly.
          </p>
        )}
      </SectionCard>
    ),
    todayForYou: (
      <SectionCard key="todayForYou" title="Today For You" icon="★" subtitle="Prioritized for your profile, portfolio, and watchlist" className="screen-card home-card">
        {todayForYou.length ? (
          <ul className="stack-list">
            {todayForYou.map((item, index) => (
              <li key={index} className="company-description subtle">
                <strong>{item.headline}</strong> — {item.priorityReason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="company-description subtle">Nothing prioritized for you right now.</p>
        )}
      </SectionCard>
    ),
    portfolio: (
      <SectionCard key="portfolio" title="Portfolio" icon="◐" className="screen-card home-card">
        <p className="company-description">{whatChangedForMyPortfolio?.summary}</p>
        {whatChangedForMyPortfolio?.changes?.length ? (
          <ul className="stack-list">
            {whatChangedForMyPortfolio.changes.map((change) => (
              <li key={change.dimension} className="company-description subtle">
                {change.label}: {change.beforeValue} → {change.afterValue}
                {change.changePct !== null ? ` (${change.changePct >= 0 ? "+" : ""}${change.changePct}%)` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="opportunity-item__actions">
          <span className="pill">Matters today: {portfolioMorningSummary?.mattersToday?.length || 0}</span>
          <span className="pill">Can wait: {portfolioMorningSummary?.canWaitCount || 0}</span>
        </div>
        {portfolioMorningSummary?.biggestOpportunity ? (
          <p className="company-description subtle positive">
            Biggest opportunity: {portfolioMorningSummary.biggestOpportunity.symbol} (quality {portfolioMorningSummary.biggestOpportunity.qualityScore}/100)
          </p>
        ) : (
          <p className="company-description subtle">No standout opportunity today.</p>
        )}
        {portfolioMorningSummary?.biggestRisk ? (
          <p className="company-description subtle negative">
            Biggest risk: {portfolioMorningSummary.biggestRisk.symbol || "—"} — {portfolioMorningSummary.biggestRisk.reasoning || portfolioMorningSummary.biggestRisk.riskLabel}
          </p>
        ) : (
          <p className="company-description subtle">No standout risk today.</p>
        )}
      </SectionCard>
    ),
    beliefs: (
      <SectionCard key="beliefs" title="What changed in the platform's beliefs?" icon="◑" className="screen-card home-card">
        {whatChangedInBeliefs.length ? (
          <ul className="stack-list">
            {whatChangedInBeliefs.map((belief) => (
              <li key={belief.themeKey} className="company-description subtle">
                <strong>{belief.themeLabel}</strong> thesis updated: {belief.newThesis}
              </li>
            ))}
          </ul>
        ) : (
          <p className="company-description subtle">No theme thesis has changed recently.</p>
        )}
      </SectionCard>
    ),
    recommendations: (
      <SectionCard key="recommendations" title="Recommendations" icon="▲" className="screen-card home-card">
        {shouldIDoAnythingToday.hasAction ? (
          <>
            <div className="opportunity-item__top">
              <strong>{shouldIDoAnythingToday.symbol}</strong>
              <span className={ACTION_PILL_CLASS[shouldIDoAnythingToday.action] || "pill"}>{shouldIDoAnythingToday.action}</span>
            </div>
            <p className="company-description">{shouldIDoAnythingToday.reasoning}</p>
            <button type="button" className="ghost-button" onClick={() => onNavigate?.("Recommendations")}>
              View full reasoning
            </button>
          </>
        ) : (
          <p className="company-description">No action needed today — nothing in your portfolio requires attention.</p>
        )}
        {topRecommendations.length ? (
          <ul className="stack-list">
            {topRecommendations.map((rec) => (
              <li key={rec.symbol} className="company-description subtle">
                {rec.symbol}: <span className={ACTION_PILL_CLASS[rec.action] || "pill"}>{rec.action}</span> quality {rec.qualityScore}/100
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>
    ),
    intelligenceTimeline: (
      <SectionCard key="intelligenceTimeline" title="Intelligence Timeline" icon="⏱" className="screen-card home-card">
        <div className="opportunity-item__actions">
          {TIMELINE_SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              className={activeTimelineSection === section.key ? "pill opportunity" : "pill"}
              onClick={() => setActiveTimelineSection(section.key)}
            >
              {section.label} ({(intelligenceTimeline[section.key] || []).length})
            </button>
          ))}
        </div>
        {activeSectionItems.length ? (
          <ul className="stack-list">
            {activeSectionItems.map((item, index) => (
              <li key={index} className="company-description subtle">{item.headline}</li>
            ))}
          </ul>
        ) : (
          <p className="company-description subtle">Nothing in this window right now.</p>
        )}
      </SectionCard>
    ),
  };

  return (
    <div className="screen-page home-screen">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Today</p>
          <h1>Your morning brief</h1>
          {freshnessLabel ? <p className="company-description subtle">{freshnessLabel}</p> : null}
          {personalBrief.length ? (
            <ul className="stack-list" aria-label="Morning personal brief">
              {personalBrief.map((line, index) => (
                <li key={index} className="company-description">{line}</li>
              ))}
            </ul>
          ) : null}
          <div className="opportunity-item__actions">
            {glancePills.map((pill) => (
              <span key={pill.label} className={pill.tone ? `pill ${pill.tone}` : "pill"}>
                {pill.label}: {pill.value}
              </span>
            ))}
          </div>
        </div>
      </section>

      {cardOrder.map((key) => cardsByKey[key]).filter(Boolean)}
    </div>
  );
}
