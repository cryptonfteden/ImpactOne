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

/**
 * Sprint 20, Part 3 — the Home screen, originally six standalone "what
 * changed" cards.
 *
 * Sprint 28 — "Morning Intelligence": Home becomes the single unified
 * Morning Brief. Rather than adding new cards on top of the old six (which
 * would fight this sprint's own "reduce scrolling, reduce repeated cards"
 * goal), overlapping cards were merged: What happened + Why should I care
 * + What changed since yesterday collapse into one Morning Brief card;
 * What changed for my portfolio merges with the new Portfolio Morning
 * Summary (biggest opportunity/risk, what matters today vs. can wait);
 * What should I pay attention to today merges with the new ranked
 * topRecommendations list. Two genuinely new sections are added: Today
 * For You (personalized agenda — facts stay global, priority is personal)
 * and the Intelligence Timeline (Overnight/Opening Bell/Today/This
 * Week/Long Term). Net result: still 6 cards, unchanged from Sprint 27,
 * despite three brand-new sections — merging kept card count flat while
 * roughly doubling the real information Home surfaces.
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
    whatChangedForMyPortfolio,
    whatChangedInBeliefs = [],
    shouldIDoAnythingToday,
    topRecommendations = [],
    intelligenceTimeline = {},
    todayForYou = [],
    portfolioMorningSummary,
    personalBrief = [],
  } = summary;

  const glancePills = [
    { label: "Action needed", value: shouldIDoAnythingToday.hasAction ? `Yes — ${shouldIDoAnythingToday.symbol}` : "No", tone: shouldIDoAnythingToday.hasAction ? "opportunity" : "" },
    { label: "Portfolio", value: whatChangedForMyPortfolio?.changes?.length ? `${whatChangedForMyPortfolio.changes.length} change(s)` : "Unchanged", tone: whatChangedForMyPortfolio?.changes?.length ? "monitor" : "" },
    { label: "Beliefs", value: whatChangedInBeliefs.length ? `${whatChangedInBeliefs.length} updated` : "Unchanged", tone: whatChangedInBeliefs.length ? "monitor" : "" },
  ];

  const activeSectionItems = intelligenceTimeline[activeTimelineSection] || [];

  return (
    <div className="screen-page home-screen">
      <section className="screen-hero">
        <p className="eyebrow">Today</p>
        <h1>Your morning brief</h1>
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
      </section>

      <SectionCard title="Morning Brief" icon="◉" className="screen-card home-card">
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
        ) : (
          <p className="company-description subtle">No material change vs. yesterday.</p>
        )}
      </SectionCard>

      <SectionCard title="Today For You" icon="★" subtitle="Prioritized for your profile, portfolio, and watchlist" className="screen-card home-card">
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

      <SectionCard title="Portfolio" icon="◐" className="screen-card home-card">
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

      <SectionCard title="What changed in the platform's beliefs?" icon="◑" className="screen-card home-card">
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

      <SectionCard title="Recommendations" icon="▲" className="screen-card home-card">
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

      <SectionCard title="Intelligence Timeline" icon="⏱" className="screen-card home-card">
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
    </div>
  );
}
