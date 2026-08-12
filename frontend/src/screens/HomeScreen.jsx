import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { LoadingSpinner, EmptyState } from "../components/ui";
import { homeApi, priceAlertsApi } from "../services/api";
import { withRequestCache } from "../services/requestCache";
import useWatchlist from "../hooks/useWatchlist";
import { logError } from "../utils/errorHandling";
import { useI18n } from "../i18n/I18nProvider";
import { trackEvent } from "../utils/analytics";
import { msSinceBoot } from "../utils/performanceTiming";

const ACTION_PILL_CLASS = {
  BUY: "pill opportunity",
  REDUCE: "pill monitor",
  EXIT: "pill risk",
};

// Sprint 32 Priority 2 — fallback order if the backend ever omits
// cardOrder (e.g. an older cached response) — identical to the fixed
// order this screen always used before Adaptive Home existed.
const DEFAULT_CARD_ORDER = ["portfolio", "recommendations", "intelligenceTimeline"];
// Today is a decision surface, not an index of every module. Deeper context
// stays available from Feed and Advanced tools.
const PRIMARY_CARD_KEYS = new Set(["portfolio", "recommendations", "intelligenceTimeline"]);

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
  const { t, formatRelativeTime, formatDateTime, formatDate } = useI18n();
  const { watchlist } = useWatchlist();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTimelineSection, setActiveTimelineSection] = useState("today");
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  // Phase H3 — Command Center: real active/recently-triggered price alerts,
  // isolated per beta user (X-Beta-User-Id, same as every H2/H3 request).
  // Best-effort: this card degrades to empty rather than blocking the rest
  // of Home if a beta user isn't resolved or the request fails.
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    priceAlertsApi
      .list()
      .then((result) => {
        if (!cancelled) setAlerts(result.alerts || []);
      })
      .catch(() => {
        // Silent — Active Alerts is additive, never a blocking error on Home.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        // Phase REAL-WORLD-USAGE-001 — real, measured friction: Home is
        // this app's landing screen, so a founder bouncing back to it
        // after a quick look at Recommendations/Portfolio/etc. (this
        // codebase's own state-driven screen swap fully remounts each
        // screen — there is no route-level keep-alive) re-triggered a
        // full network fetch and a full skeleton flash every single
        // time, even seconds after the same real data had just loaded.
        // Mission Control, Portfolio Workspace, and News Intelligence
        // already share this exact real fix (withRequestCache,
        // Phase PLATFORM-INTEGRATION-001) for the identical problem;
        // Home — the single highest-traffic screen — was the one
        // screen still missing it.
        const data = await withRequestCache(`home:summary:${watchlist.join(",")}`, () => homeApi.getSummary(watchlist));
        if (!cancelled) {
          setSummary(data);
          setError("");
          // Sprint 35 Priority 5 — "morning brief read" telemetry. Fires
          // once per successful load of this screen, the same load every
          // user already triggers just by opening Home — no extra
          // interaction required to capture the signal.
          trackEvent("morning_brief_read");
          // Sprint 36 Priority 1 — "first_useful_information": Home is
          // the app's first screen, so the same successful load that
          // proves the Morning Brief rendered is genuinely also the
          // first moment this browser saw real, personalized content.
          // Both fire from the same real event rather than inventing an
          // artificial distinction between them.
          // Sprint 40 — attaches the real elapsed time (ms since this page
          // began loading) to the same milestone, so this event now
          // measures actual "first useful content" latency, not just that
          // it eventually happened.
          trackEvent("first_useful_information", { durationMs: msSinceBoot() });
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
  const todayLabel = formatDate(new Date());
  const shouldShowAction = shouldIDoAnythingToday.hasAction && Number(shouldIDoAnythingToday.qualityScore) >= 80;
  const qualifiedTopRecommendations = topRecommendations.filter((recommendation) => Number(recommendation.qualityScore) >= 80);

  // Sprint 35 Priority 4 — Morning Brief polish. The hero's own
  // personalBrief (always visible, no scrolling) already leads with
  // "Market: {headline}" whenever it has real content — repeating the
  // identical headline as the Morning Brief card's own first line, a
  // few inches below, was pure duplicated information adding to
  // cognitive load without adding a new fact. Only show it here when
  // the hero brief didn't already say it (e.g. personalBrief is empty).
  const heroAlreadyStatedHeadline = personalBrief.includes(`Market: ${whatHappened.headline}`);

  const glancePills = [
    { label: t("home.actionNeeded"), value: shouldShowAction ? t("home.actionYes", { symbol: shouldIDoAnythingToday.symbol }) : t("home.actionNo"), tone: shouldShowAction ? "opportunity" : "" },
    { label: t("home.portfolioLabel"), value: whatChangedForMyPortfolio?.changes?.length ? t("home.portfolioChanges", { count: whatChangedForMyPortfolio.changes.length }) : t("home.portfolioUnchanged"), tone: whatChangedForMyPortfolio?.changes?.length ? "monitor" : "" },
    { label: t("home.beliefsLabel"), value: whatChangedInBeliefs.length ? t("home.beliefsUpdated", { count: whatChangedInBeliefs.length }) : t("home.portfolioUnchanged"), tone: whatChangedInBeliefs.length ? "monitor" : "" },
  ];

  const activeSectionItems = intelligenceTimeline[activeTimelineSection] || [];
  const visibleTimelineItems = timelineExpanded ? activeSectionItems : activeSectionItems.slice(0, 3);

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
      <SectionCard key="portfolio" title={t("home.cards.portfolio")} subtitle="Your position, simplified" icon="◐" className="screen-card home-card home-card--portfolio">
        <p className="home-card__lead">{whatChangedForMyPortfolio?.summary}</p>
        {whatChangedForMyPortfolio?.changes?.length ? (
          <ul className="stack-list">
            {whatChangedForMyPortfolio.changes.map((change) => (
              <li key={change.dimension}>
                {change.label}: {change.beforeValue} → {change.afterValue}
                {change.changePct !== null ? ` (${change.changePct >= 0 ? "+" : ""}${change.changePct}%)` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="home-card__stat-row">
          <span className="home-card__stat home-card__stat--attention"><b>{portfolioMorningSummary?.mattersToday?.length || 0}</b>Matters today</span>
          <span className="home-card__stat"><b>{portfolioMorningSummary?.canWaitCount || 0}</b>Can wait</span>
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
        {shouldShowAction ? (
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
        {qualifiedTopRecommendations.length ? (
          <ul className="home-card__change-list">
            {qualifiedTopRecommendations.map((rec) => (
              <li key={rec.symbol} className="company-description subtle">
                {rec.symbol}: <span className={ACTION_PILL_CLASS[rec.action] || "pill"}>{rec.action}</span> quality {rec.qualityScore}/100
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>
    ),
    intelligenceTimeline: (
      <SectionCard key="intelligenceTimeline" title={t("home.cards.intelligenceTimeline")} subtitle="Signals worth your attention" icon="⏱" className="screen-card home-card home-card--timeline">
        <div className="home-timeline__tabs">
          {TIMELINE_SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              className={activeTimelineSection === section.key ? "is-active" : ""}
              onClick={() => { setActiveTimelineSection(section.key); setTimelineExpanded(false); }}
            >
              <span>{section.label}</span><b>{(intelligenceTimeline[section.key] || []).length}</b>
            </button>
          ))}
        </div>
        {activeSectionItems.length ? (
          <ul className="home-timeline__items">
            {visibleTimelineItems.map((item, index) => (
              <li key={index}><span className={`home-timeline__signal home-timeline__signal--${index % 3}`} aria-hidden="true" /><p>{item.headline}</p></li>
            ))}
          </ul>
        ) : (
          <p className="home-timeline__empty">{t("home.empty.timelineWindow")}</p>
        )}
        {activeSectionItems.length > 3 ? <button type="button" className="home-timeline__more" onClick={() => setTimelineExpanded((value) => !value)}>{timelineExpanded ? "Show less" : `Show ${activeSectionItems.length - 3} more signals`}</button> : null}
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
      <section className="screen-hero screen-hero--orbital home-hero">
        <div>
          <div className="home-hero__eyebrow-row">
            <p className="eyebrow">{t("home.eyebrow")}</p>
            <span className="home-hero__date" aria-label="Today's date">{todayLabel}</span>
          </div>
          <h1>{t("home.title")}</h1>
          {freshnessLabel ? <p className="company-description subtle">{freshnessLabel}</p> : null}
          {personalBrief.length ? (
            <ul className="stack-list morning-brief-list" aria-label={t("home.morningBriefLabel")}>
              {personalBrief.map((line, index) => (
                <li key={index} className="company-description">
                  <span className="morning-brief-list__orbit" aria-hidden="true" />
                  {line}
                </li>
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
          {/* Phase X5 — Part 1 (Single Product Entry). Today is the
              landing page; this is the one obvious next step from it
              into the two screens that act on what Today reports —
              never a dead end. */}
          <div className="opportunity-item__actions">
            <button type="button" className="ghost-button" onClick={() => onNavigate?.("Decision Center")}>
              {t("core.reviewDecisions")}
            </button>
            <button type="button" className="ghost-button" onClick={() => onNavigate?.("Portfolio")}>
              {t("core.openPortfolio")}
            </button>
            <button type="button" className="ghost-button" onClick={() => onNavigate?.("Market Chart")}>
              {t("core.openChart")}
            </button>
          </div>
        </div>
      </section>

      {cardOrder.filter((key) => PRIMARY_CARD_KEYS.has(key)).map((key) => cardsByKey[key]).filter(Boolean)}

      {/* Phase H3 — Command Center priority: what happened / why it
          matters / what to watch / portfolio impact are all already
          covered by the adaptive cards above; Active Alerts closes out
          the mission's explicit priority list. */}
      <SectionCard title="Active Alerts" icon="◉" subtitle="Live price alerts on your watchlist folders" className="screen-card home-card">
        {alerts.filter((alert) => alert.status !== "INACTIVE").length ? (
          <div className="folder-card__symbols">
            {alerts
              .filter((alert) => alert.status !== "INACTIVE")
              .slice(0, 5)
              .map((alert) => (
                <div key={alert.id} className={`alert-row${alert.status === "TRIGGERED" ? " alert-row--triggered" : ""}`}>
                  <span className={alert.status === "TRIGGERED" ? "pill opportunity" : "pill monitor"}>{alert.status}</span>
                  <span>
                    <strong>{alert.symbol}</strong> {alert.direction === "ABOVE" ? "rises above" : "falls below"}{" "}
                    <span className="alert-row__price">${Number(alert.targetPrice).toFixed(2)}</span>
                  </span>
                  <span className="company-description subtle">
                    {alert.currentPrice !== null ? <span className="alert-row__price">${alert.currentPrice.toFixed(2)}</span> : "—"}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState message="No active price alerts yet. Set one from Watchlist Folders." />
        )}
      </SectionCard>
    </div>
  );
}
