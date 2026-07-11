import { useState } from "react";
import SectionCard from "../components/SectionCard";
import { Button, EmptyState, ErrorState, Skeleton } from "../components/ui";
import useRecommendations from "../hooks/useRecommendations";

const ACTION_PILL_CLASS = {
  BUY: "pill opportunity",
  REDUCE: "pill monitor",
  EXIT: "pill risk",
};

const ACTION_LABEL = {
  BUY: "Buy",
  REDUCE: "Reduce",
  EXIT: "Exit",
};

function recommendationKey(recommendation) {
  return recommendation.id;
}

/**
 * Sprint 16 Phase A — Autonomous Recommendation Engine. Advisory only: this
 * screen surfaces what the engine analyzed and why, it never places a
 * trade. "Run now" triggers one on-demand evaluation pass; the same logic
 * also runs on a schedule server-side (see /api/v2/recommendations/status).
 */
export default function RecommendationsScreen() {
  const { recommendations, status, isLoading, isRunning, error, actionError, runNow } = useRecommendations();
  const [expandedId, setExpandedId] = useState(null);

  if (isLoading && !recommendations.length) {
    return (
      <div className="screen-page">
        <SectionCard title="Recommendations" subtitle="AI-generated, advisory only" className="screen-card">
          <Skeleton variant="card" count={3} />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Recommendations — Advisory Only</p>
          <h1>Autonomous Recommendation Engine</h1>
          <p className="subtext">
            Analyzes market events and real portfolio exposure to suggest what to do, with confidence, expected
            upside/downside, and risk. It never places a trade — every action here is manual.
          </p>
        </div>
        <Button type="button" className="ghost-button" onClick={runNow} disabled={isRunning}>
          {isRunning ? "Running..." : "Run now"}
        </Button>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {actionError ? <p className="company-description subtle negative">{actionError}</p> : null}

      <SectionCard title="Engine Status" subtitle="Read-only, never executes trades" className="screen-card">
        <div className="widget-list">
          <div className="widget-list-item"><strong>Enabled</strong><span>{status?.enabled ? "Yes" : "No"}</span></div>
          <div className="widget-list-item"><strong>Interval</strong><span>{status?.intervalMinutes ? `${status.intervalMinutes} min` : "—"}</span></div>
          <div className="widget-list-item">
            <strong>Last run</strong>
            <span>{status?.latestRunLog?.startedAt ? new Date(status.latestRunLog.startedAt).toLocaleString() : "Never"}</span>
          </div>
          <div className="widget-list-item"><strong>Symbols evaluated (last run)</strong><span>{status?.latestRunLog?.symbolsEvaluated ?? "—"}</span></div>
        </div>
      </SectionCard>

      <SectionCard title="Active Recommendations" subtitle="Ranked by most recent" className="screen-card">
        {recommendations.length ? (
          <div className="opportunity-grid">
            {recommendations.map((recommendation) => {
              const key = recommendationKey(recommendation);
              const isExpanded = expandedId === key;

              return (
                <article key={key} className="opportunity-item">
                  <div className="opportunity-item__top">
                    <strong>{recommendation.symbol}</strong>
                    <span className={ACTION_PILL_CLASS[recommendation.action] || "pill"}>
                      {ACTION_LABEL[recommendation.action] || recommendation.action}
                    </span>
                  </div>
                  <p className="company-description subtle">Confidence {Number(recommendation.confidenceScore)}/100 · Risk {recommendation.riskLabel}</p>
                  <p className="company-description subtle">
                    Upside {recommendation.expectedUpside} · Downside {recommendation.expectedDownside}
                  </p>
                  <p className="company-description subtle">Suggested size: {recommendation.positionSizeSuggestion}</p>
                  {isExpanded ? <p className="company-description">{recommendation.reasoning}</p> : null}
                  <div className="opportunity-item__actions">
                    <Button type="button" className="ghost-button" onClick={() => setExpandedId(isExpanded ? null : key)}>
                      {isExpanded ? "Hide reasoning" : "Show reasoning"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState message="No active recommendations. Run the engine or wait for the next scheduled pass." />
        )}
      </SectionCard>
    </div>
  );
}
