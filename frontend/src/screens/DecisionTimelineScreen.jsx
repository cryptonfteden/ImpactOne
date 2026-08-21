import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { EmptyState, ErrorState, LoadingSpinner } from "../components/ui";
import { decisionTimelineApi } from "../services/api";
import { openSymbolPanel } from "../utils/symbolPanel";
import { logError } from "../utils/errorHandling";
import { hasStoredBetaIdentity } from "../hooks/useBetaIdentity";

const TYPE_LABELS = {
  NEWS: "News",
  AI_DECISION: "AI Decision",
  PORTFOLIO_ACTION: "Portfolio Action",
  ALERT: "Alert",
  WORKSPACE_ACTIVITY: "Workspace Activity",
  IMPACT_GRAPH_UPDATE: "Impact Graph Update",
};

const TYPE_PILL = {
  NEWS: "pill",
  AI_DECISION: "pill opportunity",
  PORTFOLIO_ACTION: "pill monitor",
  ALERT: "pill risk",
  WORKSPACE_ACTIVITY: "pill",
  IMPACT_GRAPH_UPDATE: "pill monitor",
};

/**
 * Phase X7 — Part 3, Decision Timeline. One real, chronological story
 * merged from six real sources (News, AI Decisions, Portfolio Actions,
 * Alerts, Workspace Activity, Impact Graph updates) — every entry links
 * back to its real symbol via the shared chart panel. Two mission-named
 * sources (Market Positioning changes, Opportunity Score changes) have no
 * real historical data to report yet and are honestly disclosed, never
 * fabricated — see DECISION_TIMELINE_SPEC.md.
 */
export default function DecisionTimelineScreen() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const identityAvailable = hasStoredBetaIdentity();

  function load() {
    if (!identityAvailable) {
      setData({ unavailableSources: [], events: [], counts: {} });
      setError("");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    decisionTimelineApi
      .get()
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((loadError) => {
        logError("decision timeline load failed", loadError);
        setError("Couldn't load the Decision Timeline right now.");
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, [identityAvailable]);

  if (isLoading && !data) {
    return (
      <div className="screen-page">
        <SectionCard title="Decision Timeline" className="screen-card">
          <LoadingSpinner label="Building your timeline" />
        </SectionCard>
      </div>
    );
  }

  const visibleEvents = data?.events?.filter((event) => !typeFilter || event.type === typeFilter) || [];

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Command Center — Decision Timeline</p>
          <h1>Everything that happened, in one story</h1>
          <p className="subtext">News, AI decisions, portfolio actions, alerts, workspace activity, and Impact Graph updates — merged, real, chronological.</p>
        </div>
      </section>

      {error ? <ErrorState message={error} reason="This is usually temporary." onRetry={load} /> : null}

      <div className="decision-filters" role="group" aria-label="Filter timeline">
        <button type="button" className={`ghost-button${!typeFilter ? " active" : ""}`} onClick={() => setTypeFilter("")}>
          All
        </button>
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button key={key} type="button" className={`ghost-button${typeFilter === key ? " active" : ""}`} onClick={() => setTypeFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      {data?.unavailableSources?.length ? (
        <p className="company-description subtle negative">
          Not yet trackable: {data.unavailableSources.map((entry) => entry.source).join(", ")} — see each for why.
        </p>
      ) : null}

      <SectionCard title="Timeline" subtitle={`${visibleEvents.length} event(s)`} className="screen-card">
        {visibleEvents.length ? (
          <div className="folder-card__symbols">
            {visibleEvents.map((event, index) => (
              <div key={index} className="timeline-item">
                <span className={TYPE_PILL[event.type] || "pill"}>{TYPE_LABELS[event.type] || event.type}</span>
                {event.symbol ? (
                  <button type="button" className="ghost-button" onClick={() => openSymbolPanel(event.symbol)}>
                    <strong>{event.symbol}</strong>
                  </button>
                ) : null}
                <span>{event.text}</span>
                <span className="company-description subtle">{new Date(event.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No events yet — as you track symbols, place trades, and set alerts, they'll appear here in one story." />
        )}
      </SectionCard>
    </div>
  );
}
