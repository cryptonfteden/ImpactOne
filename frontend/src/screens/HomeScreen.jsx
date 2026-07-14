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

/**
 * Sprint 20, Part 3 — the Home screen. Originally answered four questions;
 * Sprint 24 extended it to six, each still answerable within seconds: What
 * happened? Why should I care? What changed since yesterday? What changed
 * for my portfolio? What changed in the platform's beliefs? What should I
 * pay attention to today? Still nothing beyond these six — the existing,
 * richer Dashboard remains reachable from the sidebar for anyone who wants
 * more. Every "what changed" card is honest about absence: no fabricated
 * change is ever shown when the underlying data source has nothing to say.
 */
export default function HomeScreen({ onNavigate }) {
  const { watchlist } = useWatchlist();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
  } = summary;

  return (
    <div className="screen-page home-screen">
      <section className="screen-hero">
        <p className="eyebrow">Today</p>
        <h1>Your daily summary</h1>
      </section>

      <SectionCard title="What happened?" icon="◉" className="screen-card home-card">
        <p className="company-description">{whatHappened.headline}</p>
        {whatHappened.sourceUrl ? (
          <a href={whatHappened.sourceUrl} target="_blank" rel="noopener noreferrer" className="matched-event__source">
            {whatHappened.sourceName || "Source"}
          </a>
        ) : null}
      </SectionCard>

      <SectionCard title="Why should I care?" icon="◍" className="screen-card home-card">
        <p className="company-description">{whyShouldICare}</p>
        <p className="company-description subtle">{howDoesItAffectMe}</p>
      </SectionCard>

      <SectionCard title="What changed since yesterday?" icon="↻" className="screen-card home-card">
        {whatChangedSinceYesterday.length ? (
          <ul className="stack-list">
            {whatChangedSinceYesterday.map((line, index) => (
              <li key={index} className="company-description subtle">
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="company-description subtle">No material change vs. yesterday.</p>
        )}
      </SectionCard>

      <SectionCard title="What changed for my portfolio?" icon="◐" className="screen-card home-card">
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

      <SectionCard title="What should I pay attention to today?" icon="▲" className="screen-card home-card">
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
      </SectionCard>
    </div>
  );
}
