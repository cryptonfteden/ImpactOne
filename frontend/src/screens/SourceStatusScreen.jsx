import { useEffect, useState } from "react";
import { Button, ErrorState, Skeleton } from "../components/ui";
import { systemHealthApi } from "../services/api";

const SOURCE_META = {
  marketData: { label: "Market prices", source: "Finnhub + verified chart fallback" },
  chart: { label: "Chart candles", source: "ImpactOne chart providers" },
  news: { label: "Market news", source: "NewsAPI + verified public feeds" },
  ai: { label: "AI summaries", source: "OpenAI or transparent structured fallback" },
  notifications: { label: "Alerts", source: "ImpactOne database" },
  decisionCenter: { label: "Agent decisions", source: "ImpactOne agent committee" },
  impactGraph: { label: "Impact graph", source: "ImpactOne world memory" },
  identity: { label: "User profile", source: "ImpactOne identity store" },
};

function stateClass(status) {
  return status === "HEALTHY" ? "is-live" : status === "WARNING" ? "is-delayed" : "is-offline";
}

export default function SourceStatusScreen() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    systemHealthApi.get().then((payload) => {
      setHealth(payload);
      setError("");
    }).catch(() => setError("The live source check could not be reached.")).finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <main className="screen-page source-status-screen">
      <section className="screen-hero source-status-hero">
        <div><p className="eyebrow">DATA TRANSPARENCY</p><h1>Source Status</h1><p className="subtext">See where each number comes from, whether it is available, and when the check was refreshed.</p></div>
        <Button type="button" onClick={load} disabled={loading}>↻ Refresh sources</Button>
      </section>
      {error ? <ErrorState message={error} reason="The rest of the app remains available; missing sources are never replaced with invented values." onRetry={load} /> : null}
      {loading && !health ? <section className="source-status-grid" aria-busy="true"><Skeleton variant="card" count={6} /></section> : null}
      {health ? (
        <>
          <section className="source-status-summary" aria-live="polite">
            <span className={`source-status-dot ${stateClass(health.overall)}`} />
            <div><small>OVERALL DATA STATE</small><strong>{health.overall}</strong></div>
            <time dateTime={health.generatedAt}>Checked {new Date(health.generatedAt).toLocaleString()}</time>
          </section>
          <section className="source-status-grid">
            {Object.entries(SOURCE_META).map(([key, meta]) => {
              const module = health.modules?.[key];
              if (!module) return null;
              return <article key={key} className={`source-status-card ${stateClass(module.status)}`}><header><span className="source-status-dot"/><strong>{meta.label}</strong><b>{module.status}</b></header><p>{meta.source}</p><small>{module.detail}</small><footer><span>Health check</span><b>{module.latencyMs} ms</b></footer></article>;
            })}
          </section>
          <p className="source-status-note">Missing sources are never replaced with invented values. Every stock card should still show its own symbol, timeframe, source and freshness.</p>
        </>
      ) : null}
    </main>
  );
}
