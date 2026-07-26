import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { ErrorState, LoadingSpinner } from "../components/ui";
import { adminDashboardApi, betaMetricsApi, performanceMetricsApi } from "../services/api";
import { logError } from "../utils/errorHandling";

/**
 * Phase X9 — Part 5, Admin Dashboard. Internal operations view, visible
 * only when VITE_DEV_CONSOLE is set — same precedent as Health Dashboard
 * (Phase X6) and Intelligence Console. Every number here is read
 * directly from adminDashboardService.js / betaMetricsService.js /
 * performanceMetricsService.js — nothing recomputed in this component.
 */
export default function AdminDashboardScreen() {
  const [dashboard, setDashboard] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setIsLoading(true);
    Promise.all([adminDashboardApi.get(), betaMetricsApi.get(), performanceMetricsApi.get()])
      .then(([dashboardResult, metricsResult, performanceResult]) => {
        setDashboard(dashboardResult);
        setMetrics(metricsResult);
        setPerformance(performanceResult);
        setError("");
      })
      .catch((loadError) => {
        logError("admin dashboard load failed", loadError);
        setError("Couldn't load the Operations Dashboard right now.");
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (isLoading && !dashboard) {
    return (
      <div className="screen-page">
        <SectionCard title="Operations Dashboard" className="screen-card">
          <LoadingSpinner label="Loading beta operations data" />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Internal — Beta Operations</p>
          <h1>Operations Dashboard</h1>
          <p className="subtext">Real usage, errors, feedback, and performance — read-only, not part of the investor-facing product.</p>
        </div>
      </section>

      {error ? <ErrorState message={error} reason="The backend may be unreachable." onRetry={load} /> : null}

      {dashboard ? (
        <div className="screen-grid">
          <SectionCard title="Active Usage" className="screen-card">
            <div className="widget-list-item"><strong>Daily Active Sessions</strong><span>{dashboard.dailyActiveUsers.distinctSessions}</span></div>
            <div className="widget-list-item"><strong>Daily Active Beta Users</strong><span>{dashboard.dailyActiveUsers.distinctBetaUsers}</span></div>
            <div className="widget-list-item"><strong>Weekly Sessions</strong><span>{dashboard.weeklySessions.distinctSessions}</span></div>
            <div className="widget-list-item">
              <strong>Average Session Length</strong>
              <span>{dashboard.averageSessionLength.avgDurationMs !== null ? `${Math.round(dashboard.averageSessionLength.avgDurationMs / 1000)}s` : "No sessions ended yet"}</span>
            </div>
          </SectionCard>

          <SectionCard title="Most Used Screens" className="screen-card">
            {dashboard.mostUsedScreens.length ? (
              dashboard.mostUsedScreens.map((row) => (
                <div key={row.screen} className="widget-list-item"><strong>{row.screen}</strong><span>{row.count}</span></div>
              ))
            ) : (
              <p className="company-description subtle">No screen views recorded yet.</p>
            )}
          </SectionCard>

          <SectionCard title="Errors & Crashes" className="screen-card">
            <div className="widget-list-item"><strong>Total crash reports</strong><span>{dashboard.crashes}</span></div>
            {dashboard.errors.map((row) => (
              <div key={row.source} className="widget-list-item"><strong>{row.source}</strong><span>{row.count}</span></div>
            ))}
          </SectionCard>

          <SectionCard title="Feedback" subtitle={`${dashboard.feedbackCount} total`} className="screen-card">
            {dashboard.feedbackByType.length ? (
              dashboard.feedbackByType.map((row) => (
                <div key={row.type} className="widget-list-item"><strong>{row.type}</strong><span>{row.count}</span></div>
              ))
            ) : (
              <p className="company-description subtle">No feedback submitted yet.</p>
            )}
          </SectionCard>

          <SectionCard title="Top Recommendations Viewed" className="screen-card">
            {dashboard.topRecommendationsViewed.length ? (
              dashboard.topRecommendationsViewed.map((row) => (
                <div key={row.symbol} className="widget-list-item"><strong>{row.symbol}</strong><span>{row.count}</span></div>
              ))
            ) : (
              <p className="company-description subtle">No recommendations viewed yet.</p>
            )}
          </SectionCard>

          <SectionCard title="Decision Center Usage" className="screen-card">
            <div className="portfolio-metric">{dashboard.decisionCenterUsage}</div>
            <div className="portfolio-metric__label">real views recorded</div>
          </SectionCard>
        </div>
      ) : null}

      {metrics ? (
        <SectionCard title="Beta Metrics" className="screen-card">
          <div className="workspace-health-grid">
            <div className="widget-list-item"><strong>Activation Rate</strong><span>{metrics.activationRate.rate !== null ? `${metrics.activationRate.rate}%` : "n/a"}</span></div>
            <div className="widget-list-item"><strong>Retention</strong><span>{metrics.retention.rate !== null ? `${metrics.retention.rate}%` : "n/a"}</span></div>
            <div className="widget-list-item"><strong>Feedback / User</strong><span>{metrics.feedbackPerUser.feedbackPerUser ?? "n/a"}</span></div>
            <div className="widget-list-item"><strong>Crash-Free Sessions</strong><span>{metrics.crashFreeSessions.rate !== null ? `${metrics.crashFreeSessions.rate}%` : "n/a"}</span></div>
          </div>
        </SectionCard>
      ) : null}

      {performance ? (
        <SectionCard title="Performance" className="screen-card">
          <div className="widget-list-item"><strong>Memory (RSS)</strong><span>{performance.memoryUsage.rssMb} MB</span></div>
          <div className="widget-list-item">
            <strong>Frontend bundle</strong>
            <span>{performance.frontendBundleSize.available ? `${performance.frontendBundleSize.totalKb} KB` : "No production build yet"}</span>
          </div>
          {performance.apiLatency.slice(0, 5).map((row) => (
            <div key={row.route} className="widget-list-item"><strong>{row.route}</strong><span>{row.avgMs}ms avg / {row.p95Ms}ms p95</span></div>
          ))}
        </SectionCard>
      ) : null}
    </div>
  );
}
