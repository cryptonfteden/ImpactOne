import { useCallback, useEffect, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import { Button, EmptyState, ErrorState, Skeleton } from "../components/ui";
import useRecommendations from "../hooks/useRecommendations";
import useWatchlist from "../hooks/useWatchlist";
import useVirtualPortfolio from "../hooks/useVirtualPortfolio";
import RecommendationCard from "../components/recommendations/RecommendationCard";
import { outcomeIntelligenceApi, calibrationReportApi, intelligenceApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { trackEvent } from "../utils/analytics";
import { msSinceBoot } from "../utils/performanceTiming";

function recommendationKey(recommendation) {
  return recommendation.id;
}

const MIN_RECOMMENDATION_QUALITY = 80;

function recommendationPriority(recommendation) {
  const quality = Number(recommendation?.qualityScore);
  const confidence = Number(recommendation?.confidenceScore);
  return (Number.isFinite(quality) ? quality : 0) * 1000 + (Number.isFinite(confidence) ? confidence : 0);
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
  const [portfolioOverview, setPortfolioOverview] = useState(null);
  const { portfolio } = useVirtualPortfolio({ watchlist, overview: portfolioOverview, autoSync: true });
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
  const priorityRecommendations = useMemo(() => recommendations
    .filter((recommendation) => Number(recommendation.qualityScore) >= MIN_RECOMMENDATION_QUALITY)
    .sort((left, right) => recommendationPriority(right) - recommendationPriority(left)), [recommendations]);
  const positions = portfolio?.positions || [];
  const trades = portfolio?.trades || [];
  const latestAgentTrade = trades.length ? trades[trades.length - 1] : null;
  const deployedCapital = Math.max(0, Number(portfolio?.totalPortfolioValue || 0) - Number(portfolio?.cashBalance || 0));

  useEffect(() => {
    let cancelled = false;
    intelligenceApi.overview({
      watchlist: watchlist.length ? watchlist : ["AAPL", "NVDA", "TSLA", "BTC"],
      scenarios: ["Oil spike", "Fed rate hike", "BTC ETF approval", "Israel conflict"],
      sessionType: "morning",
    }).then((data) => {
      if (!cancelled) setPortfolioOverview(data);
    }).catch((loadError) => logError("For You portfolio intelligence load failed", loadError));
    return () => { cancelled = true; };
  }, [watchlist]);

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
      <section className="screen-hero for-you-hero">
        <div>
          <p className="eyebrow">Recommendations — Advisory Only</p>
          <h1>Your agent-managed portfolio</h1>
          <p className="subtext">
            Analyzes market events and real portfolio exposure to suggest what to do, with confidence, expected
            upside/downside, and risk. It never places a trade — every action here is manual.
          </p>
        </div>
        <div className="for-you-hero__signal" aria-label={`${priorityRecommendations.length} priority recommendations`}><strong>{priorityRecommendations.length}</strong><span>priority calls</span></div>
        <Button type="button" className="ghost-button" onClick={() => runNow(watchlist)} disabled={isRunning}>
          {isRunning ? "Running..." : "Run now"}
        </Button>
      </section>

      {error ? (
        <ErrorState message={recommendations.length ? `${error} Showing the last recommendations that loaded successfully.` : error} />
      ) : null}
      {actionError ? <p className="company-description subtle negative">{actionError}</p> : null}

      <SectionCard title="Agent portfolio" subtitle="Paper trading · agents act only after the full risk gate passes" className="screen-card agent-portfolio-card">
        <div className="agent-portfolio-card__metrics">
          <div><span>Active positions</span><strong>{positions.length}</strong><small>{positions.length ? "Being monitored live" : "No qualified trade yet"}</small></div>
          <div><span>Capital deployed</span><strong>${deployedCapital.toLocaleString()}</strong><small>${Number(portfolio?.cashBalance || 0).toLocaleString()} available</small></div>
          <div><span>Latest agent decision</span><strong>{latestAgentTrade ? `${latestAgentTrade.action} · ${latestAgentTrade.ticker}` : "Watching"}</strong><small>{latestAgentTrade ? `Confidence ${latestAgentTrade.confidence}%` : "Waiting for a qualified setup"}</small></div>
        </div>
        <p className="agent-portfolio-card__note">Market, news, technical, valuation and risk signals are checked together. A virtual position opens only when the configured confidence, risk/reward, committee and market-regime gates agree.</p>
      </SectionCard>

      <SectionCard title="Engine status" subtitle="Read-only · never executes trades" className="screen-card for-you-engine-card">
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

      <SectionCard title="Priority calls" subtitle="Quality 8/10+ · highest conviction first" className="screen-card for-you-results-card">
        {priorityRecommendations.length ? (
          <div className="opportunity-grid">
            {priorityRecommendations.map((recommendation) => {
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

      <SectionCard title="Calibration" subtitle="Expected confidence vs. real outcomes, by recommendation family" className="screen-card for-you-optional-card">
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

      <SectionCard title="Lessons Learned" subtitle="From completed recommendations — never rewritten, only added to" className="screen-card for-you-optional-card">
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
