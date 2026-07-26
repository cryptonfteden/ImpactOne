import { useCallback, useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { Button, EmptyState, ErrorState, Skeleton } from "../components/ui";
import useRecommendations from "../hooks/useRecommendations";
import useWatchlist from "../hooks/useWatchlist";
import RecommendationCard from "../components/recommendations/RecommendationCard";
import { outcomeIntelligenceApi, calibrationReportApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { trackEvent } from "../utils/analytics";
import { msSinceBoot } from "../utils/performanceTiming";

function recommendationKey(recommendation) {
  return recommendation.id;
}

// Phase E3.5 — Lessons Learned dedup. buildLessonText (backend, unchanged
// per this phase's "keep the same reasoning engine" constraint) is a
// template — outcomes that share a symbol/action/direction can render as
// near-identical sentences, differing only in the exact return% and
// confidence numbers. Normalizing those two variable numbers out and
// deduping on the resulting signature (presentation-only, real lessons
// kept verbatim) surfaces one representative lesson per genuinely distinct
// pattern instead of a wall of near-duplicates.
function lessonSignature(text) {
  return String(text || "")
    .replace(/predicted confidence \S+\/100/gi, "predicted confidence X/100")
    .replace(/[-+]?\d+(\.\d+)?%/g, "N%")
    .trim();
}

function dedupeLessons(lessons) {
  const seen = new Set();
  const unique = [];
  for (const lesson of lessons) {
    const signature = lessonSignature(lesson.lessonText);
    if (seen.has(signature)) continue;
    seen.add(signature);
    unique.push(lesson);
  }
  return unique;
}

/**
 * Sprint 16 Phase A — Autonomous Recommendation Engine. Advisory only: this
 * screen surfaces what the engine analyzed and why, it never places a
 * trade. "Run now" triggers one on-demand evaluation pass — Phase C sends
 * the user's real watchlist along with it, so the pass is personalized to
 * what they actually hold and watch. The same logic also runs on a
 * schedule server-side (see /api/v2/recommendations/status). Phase D adds
 * a structured explanation, bull/base/bear scenarios, and a transparent
 * quality score to each card (see RecommendationCard).
 */
export default function RecommendationsScreen() {
  const { recommendations, status, isLoading, isRunning, error, actionError, runNow } = useRecommendations();
  const { watchlist } = useWatchlist();
  const [expandedId, setExpandedId] = useState(null);
  // Sprint 36 Priority 5 — a stable function reference (empty deps, pure
  // functional setState) so RecommendationCard's memo() actually prevents
  // re-rendering every sibling card when only one card's expanded state
  // changes; an inline arrow recreated every render would have defeated
  // memo entirely regardless of the prop's own value.
  const toggleExpand = useCallback((id) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);
  const [lessons, setLessons] = useState([]);
  const [calibration, setCalibration] = useState(null);

  // Sprint 31 Priority 4 — Outcome Intelligence. Fetched once; this list
  // only grows as real outcomes get graded, so there's no need to poll.
  useEffect(() => {
    let cancelled = false;
    outcomeIntelligenceApi
      .listLessons(10)
      .then((data) => {
        if (!cancelled) setLessons(dedupeLessons(data.lessons || []));
      })
      .catch((loadError) => logError("lessons load failed", loadError));
    return () => {
      cancelled = true;
    };
  }, []);

  // Sprint 31 Priority 1 — Calibration Reports.
  useEffect(() => {
    let cancelled = false;
    calibrationReportApi
      .get()
      .then((data) => {
        if (!cancelled) setCalibration(data);
      })
      .catch((loadError) => logError("calibration report load failed", loadError));
    return () => {
      cancelled = true;
    };
  }, []);

  // Sprint 40 — Performance: "first recommendation rendered" is a real
  // Time To Value milestone the mission names. Fires exactly once, the
  // first time this screen actually has a non-empty list to show — never
  // on every re-render/poll.
  useEffect(() => {
    if (recommendations.length) trackEvent("first_recommendation_rendered", { durationMs: msSinceBoot() });
  }, [recommendations.length > 0]);

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
        <Button type="button" className="ghost-button" onClick={() => runNow(watchlist)} disabled={isRunning}>
          {isRunning ? "Running..." : "Run now"}
        </Button>
      </section>

      {error ? (
        <ErrorState message={recommendations.length ? `${error} Showing the last recommendations that loaded successfully.` : error} />
      ) : null}
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
              return (
                <RecommendationCard
                  key={key}
                  recommendation={recommendation}
                  isExpanded={expandedId === key}
                  onToggleExpand={toggleExpand}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="◎"
            title="No active recommendations yet"
            message={
              status?.intervalMinutes
                ? `The engine analyzes your watchlist and portfolio every ${status.intervalMinutes} minutes and only recommends something when it finds a real, high-confidence opportunity — an empty list here is expected between passes, not an error.`
                : "The engine only recommends something when it finds a real, high-confidence opportunity — an empty list here is expected between passes, not an error."
            }
            actionLabel={isRunning ? "Running..." : "Run engine now"}
            onAction={() => runNow(watchlist)}
            actionDisabled={isRunning}
          />
        )}
      </SectionCard>

      <SectionCard title="Calibration" subtitle="Expected confidence vs. real outcomes, by recommendation family" className="screen-card">
        {calibration?.families?.length ? (
          <div className="widget-list">
            {calibration.families.map((family) => (
              <div key={family.family} className="widget-list-item">
                <strong>{family.family}</strong>
                {family.isStatisticallyMeaningful ? (
                  <span>
                    Expected {family.expectedConfidence}/100 · Actual {family.actualOutcomeHitRate}% · Trend: {family.calibrationTrend} · n={family.sampleSize}
                  </span>
                ) : (
                  <span className="company-description subtle">{family.insufficientDataMessage}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No graded outcomes yet — calibration reports appear here once recommendations have been graded." />
        )}
      </SectionCard>

      <SectionCard title="Lessons Learned" subtitle="From completed recommendations — never rewritten, only added to" className="screen-card">
        {lessons.length ? (
          <ul className="stack-list">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="company-description subtle">{lesson.lessonText}</li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No completed outcomes yet — lessons appear here once recommendations have been graded." />
        )}
      </SectionCard>
    </div>
  );
}
