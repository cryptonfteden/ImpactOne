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
 * Sprint 20, Part 3 — the redesigned Home screen. Answers exactly four
 * questions and nothing else: What happened? Why should I care? How does
 * it affect me? Should I do anything today? No fifth section is ever
 * added here — the existing, richer Dashboard remains reachable from the
 * sidebar for anyone who wants more.
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

  const { whatHappened, whyShouldICare, howDoesItAffectMe, shouldIDoAnythingToday } = summary;

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
      </SectionCard>

      <SectionCard title="How does it affect me?" icon="◈" className="screen-card home-card">
        <p className="company-description">{howDoesItAffectMe}</p>
      </SectionCard>

      <SectionCard title="Should I do anything today?" icon="▲" className="screen-card home-card">
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
