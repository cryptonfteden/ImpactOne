import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { ErrorState, LoadingSpinner } from "../components/ui";
import { aiPerformanceDashboardApi } from "../services/api";
import { logError } from "../utils/errorHandling";

/**
 * Phase X10 — Part 7, AI Performance Dashboard. Internal only, visible
 * only when VITE_DEV_CONSOLE is set — same precedent as Admin/Health
 * Dashboard and Intelligence Console. Every number here is read directly
 * from aiPerformanceDashboardService.js — nothing recomputed here.
 */
export default function AiPerformanceDashboardScreen() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setIsLoading(true);
    aiPerformanceDashboardApi
      .get()
      .then((result) => {
        setDashboard(result);
        setError("");
      })
      .catch((loadError) => {
        logError("AI performance dashboard load failed", loadError);
        setError("Couldn't load the AI Performance Dashboard right now.");
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (isLoading && !dashboard) {
    return (
      <div className="screen-page">
        <SectionCard title="AI Performance Dashboard" className="screen-card">
          <LoadingSpinner label="Loading AI performance data" />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Internal — Adaptive Intelligence Engine</p>
          <h1>AI Performance Dashboard</h1>
          <p className="subtext">Recommendation accuracy, confidence calibration, source quality, engagement, personalization coverage, and model drift — read-only.</p>
        </div>
      </section>

      {error ? <ErrorState message={error} reason="The backend may be unreachable." onRetry={load} /> : null}

      {dashboard ? (
        <div className="screen-grid">
          <SectionCard title="Recommendation Accuracy" className="screen-card">
            <div className="widget-list-item"><strong>Hit Rate</strong><span>{dashboard.recommendationAccuracy.hitRate !== null ? `${dashboard.recommendationAccuracy.hitRate}%` : "No graded outcomes yet"}</span></div>
            <div className="widget-list-item"><strong>Confidence Calibration</strong><span>{dashboard.confidenceCalibration !== null ? `${dashboard.confidenceCalibration}%` : "n/a"}</span></div>
            <div className="widget-list-item"><strong>Graded Outcomes</strong><span>{dashboard.recommendationAccuracy.sampleSizes.gradedOutcomes}</span></div>
          </SectionCard>

          <SectionCard title="Source Quality" className="screen-card">
            <div className="widget-list-item"><strong>Total Sources</strong><span>{dashboard.sourceQuality.totalSources}</span></div>
            <div className="widget-list-item"><strong>Avg Trust Score</strong><span>{dashboard.sourceQuality.avgTrustScore !== null ? dashboard.sourceQuality.avgTrustScore : "n/a"}</span></div>
            {dashboard.sourceQuality.topSources.map((source) => (
              <div key={source.sourceName} className="widget-list-item"><strong>{source.sourceName}</strong><span>{source.trustScore !== null ? source.trustScore : "n/a"}</span></div>
            ))}
          </SectionCard>

          <SectionCard title="User Engagement" className="screen-card">
            <div className="widget-list-item"><strong>Total Interactions</strong><span>{dashboard.userEngagement.totalInteractions}</span></div>
            <div className="widget-list-item"><strong>Active Users</strong><span>{dashboard.userEngagement.activeUsers}</span></div>
            <div className="widget-list-item"><strong>Recommendations Saved</strong><span>{dashboard.userEngagement.recommendationsSaved}</span></div>
            <div className="widget-list-item"><strong>Recommendations Dismissed</strong><span>{dashboard.userEngagement.recommendationsDismissed}</span></div>
          </SectionCard>

          <SectionCard title="Personalization Quality" className="screen-card">
            <div className="widget-list-item">
              <strong>Profile Coverage</strong>
              <span>{dashboard.personalizationQuality.coverageRate !== null ? `${dashboard.personalizationQuality.coverageRate}%` : dashboard.personalizationQuality.reason}</span>
            </div>
          </SectionCard>

          <SectionCard title="Learning Progress" className="screen-card">
            <div className="widget-list-item"><strong>Total Graded Outcomes</strong><span>{dashboard.learningProgress.totalGradedOutcomes}</span></div>
            <div className="widget-list-item"><strong>Outcome Completion</strong><span>{dashboard.learningProgress.outcomeCompletion !== null ? `${dashboard.learningProgress.outcomeCompletion}%` : "n/a"}</span></div>
          </SectionCard>

          <SectionCard title="Model Drift" className="screen-card">
            {dashboard.modelDrift.reason ? (
              <p className="company-description subtle">{dashboard.modelDrift.reason}</p>
            ) : (
              <>
                <div className="widget-list-item"><strong>Earlier Hit Rate</strong><span>{dashboard.modelDrift.earlierHitRate}%</span></div>
                <div className="widget-list-item"><strong>Later Hit Rate</strong><span>{dashboard.modelDrift.laterHitRate}%</span></div>
                <div className="widget-list-item"><strong>Drift</strong><span>{dashboard.modelDrift.driftPts > 0 ? "+" : ""}{dashboard.modelDrift.driftPts} pts</span></div>
              </>
            )}
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
