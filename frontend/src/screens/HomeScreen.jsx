import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { LoadingSpinner } from "../components/ui";
import { homeApi } from "../services/api";
import useWatchlist from "../hooks/useWatchlist";
import { logError } from "../utils/errorHandling";
import { useI18n } from "../i18n/I18nProvider";
import { trackEvent } from "../utils/analytics";

const ACTION_PILL_CLASS = {
  BUY: "pill opportunity",
  REDUCE: "pill monitor",
  EXIT: "pill risk",
};

// Sprint 32 Priority 2 — fallback order if the backend ever omits
// cardOrder (e.g. an older cached response) — identical to the fixed
// order this screen always used before Adaptive Home existed.
const DEFAULT_CARD_ORDER = ["morningBrief", "todayForYou", "portfolio", "beliefs", "recommendations", "intelligenceTimeline"];

// Sprint 33 Priority 7 — returning users need real data freshness, not a
// guess: generatedAt is the actual server timestamp for this response
// (homeSummaryService sets it right before returning), so this is always
// honest about how old what's on screen actually is.
//
// Sprint 35 — locale-aware: uses the active locale's relative-time
// formatting (Intl.RelativeTimeFormat via useI18n().formatRelativeTime)
// instead of a hardcoded English "min ago"/"h ago" string.
function formatFreshness(generatedAt, t, formatRelativeTime, formatDateTime) {
  const generated = new Date(generatedAt);
  if (Number.isNaN(generated.getTime())) return null;

  const ageMs = Date.now() - generated.getTime();
  const ageHours = Math.abs(ageMs) / 3600000;

  if (ageHours < 24) {
    return `${t("common.updated")} ${formatRelativeTime(generated)}`;
  }
  return `${t("common.updated")} ${formatDateTime(generated)}`;
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
  const { t, formatRelativeTime, formatDateTime } = useI18n();
  const { watchlist } = useWatchlist();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTimelineSection, setActiveTimelineSection] = useState("today");

  const TIMELINE_SECTIONS = [
    { key: "overnight", label: t("home.timeline.overnight") },
    { key: "openingBell", label: t("home.timeline.openingBell") },
    { key: "today", label: t("home.timeline.today") },
    { key: "thisWeek", label: t("home.timeline.thisWeek") },
    { key: "longTerm", label: t("home.timeline.longTerm") },
  ];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const data = await homeApi.getSummary(watchlist);
        if (!cancelled) {
          setSummary(data);
          setError("");
          // Sprint 35 Priority 5 — "morning brief read" telemetry. Fires
          // once per successful load of this screen, the same load every
          // user already triggers just by opening Home — no extra
          // interaction required to capture the signal.
          trackEvent("morning_brief_read");
        }
      } catch (loadError) {
        logError("home summary load failed", loadError);
        // Sprint 33 Priority 8 — a refresh failure with an existing
        // summary already on screen must not wipe it: keep showing the
        // last real data (labeled with its real age via freshnessLabel)
        // rather than replacing a working screen with a bare error.
        if (!cancelled) {
          setError(t("home.refreshFailed"));
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

  // Sprint 34 — production polish. isLoading previously blanked the whole
  // screen back to a spinner on every watchlist change, even though a
  // perfectly good summary was already showing — a real "unnecessary
  // loading state" that made the first (and most important) screen feel
  // slower than it is. Only show the full-page spinner when there is
  // truly nothing on screen yet; a refetch with existing data just keeps
  // rendering it (the error banner further down already covers a failed
  // refetch honestly).
  if (isLoading && !summary) {
    return (
      <div className="screen-page home-screen">
        <LoadingSpinner label="Building today's summary" />
      </div>
    );
  }

  if (error && !summary) {
    // Sprint 33 Priority 8 — no prior data exists at all (first load, or
    // an app reopened after clearing storage): explain what's
    // unavailable, that nothing here is usable yet, and what to do next,
    // rather than a bare one-line failure.
    return (
      <div className="screen-page home-screen">
        <p className="company-description negative">{error}</p>
        <p className="company-description subtle">{t("home.noCachedFallback")}</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="screen-page home-screen">
        <p className="company-description subtle">{t("home.nothingToShow")}</p>
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

  const freshnessLabel = generatedAt ? formatFreshness(generatedAt, t, formatRelativeTime, formatDateTime) : null;

  // Sprint 35 Priority 4 — Morning Brief polish. The hero's own
  // personalBrief (always visible, no scrolling) already leads with
  // "Market: {headline}" whenever it has real content — repeating the
  // identical headline as the Morning Brief card's own first line, a
  // few inches below, was pure duplicated information adding to
  // cognitive load without adding a new fact. Only show it here when
  // the hero brief didn't already say it (e.g. personalBrief is empty).
  const heroAlreadyStatedHeadline = personalBrief.includes(`Market: ${whatHappened.headline}`);

  const glancePills = [
    { label: t("home.actionNeeded"), value: shouldIDoAnythingToday.hasAction ? t("home.actionYes", { symbol: shouldIDoAnythingToday.symbol }) : t("home.actionNo"), tone: shouldIDoAnythingToday.hasAction ? "opportunity" : "" },
    { label: t("home.portfolioLabel"), value: whatChangedForMyPortfolio?.changes?.length ? t("home.portfolioChanges", { count: whatChangedForMyPortfolio.changes.length }) : t("home.portfolioUnchanged"), tone: whatChangedForMyPortfolio?.changes?.length ? "monitor" : "" },
    { label: t("home.beliefsLabel"), value: whatChangedInBeliefs.length ? t("home.beliefsUpdated", { count: whatChangedInBeliefs.length }) : t("home.portfolioUnchanged"), tone: whatChangedInBeliefs.length ? "monitor" : "" },
  ];

  const activeSectionItems = intelligenceTimeline[activeTimelineSection] || [];

  const cardsByKey = {
    morningBrief: (
      <SectionCard key="morningBrief" title={t("home.cards.morningBrief")} icon="◉" className="screen-card home-card">
        {heroAlreadyStatedHeadline ? null : <p className="company-description">{whatHappened.headline}</p>}
        {whatHappened.sourceUrl ? (
          <a href={whatHappened.sourceUrl} target="_blank" rel="noopener noreferrer" className="matched-event__source">
            {whatHappened.sourceName || t("home.sourceFallback")}
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
          <p className="company-description subtle">{t("home.noChangeVsYesterday")}</p>
        ) : (
          <p className="company-description subtle negative">{t("home.changeUnavailable")}</p>
        )}
      </SectionCard>
    ),
    todayForYou: (
      <SectionCard key="todayForYou" title={t("home.cards.todayForYou")} icon="★" subtitle={t("home.cards.todayForYouSubtitle")} className="screen-card home-card">
        {todayForYou.length ? (
          <ul className="stack-list">
            {todayForYou.map((item, index) => (
              <li key={index} className="company-description subtle">
                <strong>{item.headline}</strong> — {item.priorityReason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="company-description subtle">{t("home.empty.todayForYou")}</p>
        )}
      </SectionCard>
    ),
    portfolio: (
      <SectionCard key="portfolio" title={t("home.cards.portfolio")} icon="◐" className="screen-card home-card">
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
          <span className="pill">{t("home.mattersToday", { count: portfolioMorningSummary?.mattersToday?.length || 0 })}</span>
          <span className="pill">{t("home.canWait", { count: portfolioMorningSummary?.canWaitCount || 0 })}</span>
        </div>
        {portfolioMorningSummary?.biggestOpportunity ? (
          <p className="company-description subtle positive">
            {t("home.biggestOpportunity", { symbol: portfolioMorningSummary.biggestOpportunity.symbol, score: portfolioMorningSummary.biggestOpportunity.qualityScore })}
          </p>
        ) : (
          <p className="company-description subtle">{t("home.empty.noOpportunity")}</p>
        )}
        {portfolioMorningSummary?.biggestRisk ? (
          <p className="company-description subtle negative">
            {t("home.biggestRisk", { symbol: portfolioMorningSummary.biggestRisk.symbol || "—", reason: portfolioMorningSummary.biggestRisk.reasoning || portfolioMorningSummary.biggestRisk.riskLabel })}
          </p>
        ) : (
          <p className="company-description subtle">{t("home.empty.noRisk")}</p>
        )}
      </SectionCard>
    ),
    beliefs: (
      <SectionCard key="beliefs" title={t("home.cards.beliefs")} icon="◑" className="screen-card home-card">
        {whatChangedInBeliefs.length ? (
          <ul className="stack-list">
            {whatChangedInBeliefs.map((belief) => (
              <li key={belief.themeKey} className="company-description subtle">
                <strong>{belief.themeLabel}</strong> thesis updated: {belief.newThesis}
              </li>
            ))}
          </ul>
        ) : (
          <p className="company-description subtle">{t("home.empty.beliefs")}</p>
        )}
      </SectionCard>
    ),
    recommendations: (
      <SectionCard key="recommendations" title={t("home.cards.recommendations")} icon="▲" className="screen-card home-card">
        {shouldIDoAnythingToday.hasAction ? (
          <>
            <div className="opportunity-item__top">
              <strong>{shouldIDoAnythingToday.symbol}</strong>
              <span className={ACTION_PILL_CLASS[shouldIDoAnythingToday.action] || "pill"}>{shouldIDoAnythingToday.action}</span>
            </div>
            <p className="company-description">{shouldIDoAnythingToday.reasoning}</p>
            <button type="button" className="ghost-button" onClick={() => onNavigate?.("Recommendations")}>
              {t("home.viewFullReasoning")}
            </button>
          </>
        ) : (
          <p className="company-description">{t("home.empty.recommendations")}</p>
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
      <SectionCard key="intelligenceTimeline" title={t("home.cards.intelligenceTimeline")} icon="⏱" className="screen-card home-card">
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
          <p className="company-description subtle">{t("home.empty.timelineWindow")}</p>
        )}
      </SectionCard>
    ),
  };

  return (
    <div className="screen-page home-screen">
      {error ? (
        // Sprint 33 Priority 8 — a refresh failed but a previous summary
        // is still on screen: say so honestly (what's unavailable — a
        // live refresh; what remains usable — everything below, labeled
        // with its real age; what to do next) instead of silently
        // presenting stale data as current or wiping a working screen.
        <p className="company-description subtle negative">
          {t("home.refreshFailedBanner", { error, age: freshnessLabel ? freshnessLabel.replace(`${t("common.updated")} `, "") : "your last successful load" })}
        </p>
      ) : null}
      <section className="screen-hero">
        <div>
          <p className="eyebrow">{t("home.eyebrow")}</p>
          <h1>{t("home.title")}</h1>
          {freshnessLabel ? <p className="company-description subtle">{freshnessLabel}</p> : null}
          {personalBrief.length ? (
            <ul className="stack-list" aria-label={t("home.morningBriefLabel")}>
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
