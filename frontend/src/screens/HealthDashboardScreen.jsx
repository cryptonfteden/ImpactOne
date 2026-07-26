import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { ErrorState, LoadingSpinner } from "../components/ui";
import { systemHealthApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { STARTUP_VALIDATION_RESULT } from "../layout/screenRegistry";

const MODULE_LABELS = {
  backend: "Backend",
  identity: "Identity",
  marketData: "Market Data",
  news: "News",
  ai: "AI",
  chart: "Chart",
  notifications: "Notifications",
  decisionCenter: "Decision Center",
  impactGraph: "Impact Graph",
};

const STATUS_PILL = {
  HEALTHY: "pill opportunity",
  WARNING: "pill monitor",
  UNAVAILABLE: "pill risk",
  UNKNOWN: "pill",
};

/**
 * Phase X6 — Part 4, Health Dashboard. Internal diagnostics, read-only,
 * visible only when VITE_DEV_CONSOLE is set — the same gate
 * IntelligenceConsoleScreen already uses (see MainLayout.jsx/Sidebar.jsx),
 * since this screen is for the founder/operator checking platform health,
 * not part of the investor-facing product. Every status shown here comes
 * directly from systemHealthService.js (backend) or
 * startupValidation.js's real result (frontend) — nothing is simulated.
 */
export default function HealthDashboardScreen() {
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState(null);

  function load() {
    setIsLoading(true);
    systemHealthApi
      .get()
      .then((result) => {
        setHealth(result);
        setLastSyncAt(new Date());
        setError("");
      })
      .catch((loadError) => {
        logError("system health load failed", loadError);
        setError("Couldn't reach the backend health check right now.");
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Internal — Beta Diagnostics</p>
          <h1>System Health</h1>
          <p className="subtext">Read-only status for every critical module. Not part of the investor-facing product.</p>
        </div>
      </section>

      <SectionCard title="Frontend" subtitle="This client" className="screen-card">
        <div className="widget-list-item">
          <strong>Rendering</strong>
          <span className="pill opportunity">HEALTHY — you're looking at it</span>
        </div>
        <div className="widget-list-item">
          <strong>Startup validation</strong>
          <span className={STARTUP_VALIDATION_RESULT.ok ? "pill opportunity" : "pill risk"}>
            {STARTUP_VALIDATION_RESULT.ok ? "HEALTHY — no issues found" : `${STARTUP_VALIDATION_RESULT.issues.length} issue(s) found`}
          </span>
        </div>
        {!STARTUP_VALIDATION_RESULT.ok
          ? STARTUP_VALIDATION_RESULT.issues.map((issue, index) => (
              <p key={index} className="company-description subtle negative">
                [{issue.area}] {issue.message}
              </p>
            ))
          : null}
      </SectionCard>

      {isLoading && !health ? (
        <SectionCard title="Backend" className="screen-card">
          <LoadingSpinner label="Checking backend module health" />
        </SectionCard>
      ) : error ? (
        <ErrorState message={error} reason="The backend may be starting up or unreachable." onRetry={load} />
      ) : (
        <SectionCard
          title="Backend"
          subtitle={lastSyncAt ? `Last sync: ${lastSyncAt.toLocaleTimeString()} — overall: ${health.overall}` : undefined}
          className="screen-card"
        >
          <div className="workspace-health-grid">
            {Object.entries(MODULE_LABELS).map(([key, label]) => {
              const module = health.modules[key];
              if (!module) return null;
              return (
                <div key={key} className="widget-list-item">
                  <strong>{label}</strong>
                  <span className={STATUS_PILL[module.status] || "pill"}>
                    {module.status} — {module.latencyMs}ms
                  </span>
                </div>
              );
            })}
          </div>
          {Object.entries(MODULE_LABELS).map(([key, label]) => {
            const module = health.modules[key];
            if (!module || module.status === "HEALTHY") return null;
            return (
              <p key={key} className="company-description subtle">
                <strong>{label}:</strong> {module.detail}
              </p>
            );
          })}
        </SectionCard>
      )}
    </div>
  );
}
