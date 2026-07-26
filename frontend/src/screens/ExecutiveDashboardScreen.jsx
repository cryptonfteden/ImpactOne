import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { EmptyState, ErrorState, LoadingSpinner } from "../components/ui";
import { executiveDashboardApi } from "../services/api";
import { openSymbolPanel } from "../utils/symbolPanel";
import { logError } from "../utils/errorHandling";

/**
 * Phase X7 — Part 4, Market Dashboard. Exactly six real, curated lists —
 * nothing else — per the mission's explicit "no information overload."
 * Every number here is real; "Largest positioning changes" is honestly
 * disclosed as unavailable rather than estimated (no history is
 * persisted for Market Positioning yet — see EXECUTIVE_DASHBOARD_SPEC.md).
 */
export default function ExecutiveDashboardScreen() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setIsLoading(true);
    executiveDashboardApi
      .get()
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((loadError) => {
        logError("executive dashboard load failed", loadError);
        setError("Couldn't load the Market Dashboard right now.");
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (isLoading && !data) {
    return (
      <div className="screen-page">
        <SectionCard title="Market Dashboard" className="screen-card">
          <LoadingSpinner label="Curating today's highest-signal view" />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Executive View</p>
          <h1>Market Dashboard</h1>
          <p className="subtext">Only what deserves your attention today — six real, curated lists, nothing else.</p>
        </div>
      </section>

      {error ? <ErrorState message={error} reason="This is usually temporary." onRetry={load} /> : null}

      <div className="screen-grid">
        <SectionCard title="Highest-Conviction Opportunities" subtitle="Real active BUY recommendations, by quality" className="screen-card">
          {data?.highestConvictionOpportunities?.length ? (
            data.highestConvictionOpportunities.map((item) => (
              <div key={item.symbol} className="widget-list-item">
                <button type="button" className="ghost-button" onClick={() => openSymbolPanel(item.symbol)}><strong>{item.symbol}</strong></button>
                <span className="pill opportunity">Quality {item.qualityScore}/100</span>
              </div>
            ))
          ) : (
            <EmptyState message="No active BUY recommendations right now." />
          )}
        </SectionCard>

        <SectionCard title="Highest Market Risks" subtitle="Real active recommendations, by risk score" className="screen-card">
          {data?.highestMarketRisks?.length ? (
            data.highestMarketRisks.map((item) => (
              <div key={item.symbol} className="widget-list-item">
                <button type="button" className="ghost-button" onClick={() => openSymbolPanel(item.symbol)}><strong>{item.symbol}</strong></button>
                <span className="pill risk">{item.riskLabel} — {item.riskScore}/100</span>
              </div>
            ))
          ) : (
            <EmptyState message="No active recommendations to assess risk from yet." />
          )}
        </SectionCard>

        <SectionCard title="Largest Portfolio Impacts" subtitle="Real open positions, by unrealized P/L magnitude" className="screen-card">
          {data?.largestPortfolioImpacts?.length ? (
            data.largestPortfolioImpacts.map((item) => (
              <div key={item.symbol} className="widget-list-item">
                <button type="button" className="ghost-button" onClick={() => openSymbolPanel(item.symbol)}><strong>{item.symbol}</strong></button>
                <span className={item.unrealizedPnl >= 0 ? "positive" : "negative"}>${item.unrealizedPnl.toFixed(2)}</span>
              </div>
            ))
          ) : (
            <EmptyState message="No open positions yet." />
          )}
        </SectionCard>

        <SectionCard title="Major Market Events" subtitle="Real, highest-credibility recent news" className="screen-card">
          {data?.majorMarketEvents?.length ? (
            data.majorMarketEvents.map((item, index) => (
              <div key={index} className="widget-list-item">
                <span>{item.headline}</span>
                <span className="company-description subtle">{item.sourceName}</span>
              </div>
            ))
          ) : (
            <EmptyState message="No high-credibility news ingested yet." />
          )}
        </SectionCard>

        <SectionCard title="Largest Positioning Changes" subtitle="Not available yet" className="screen-card">
          <EmptyState message="Market Positioning has no persisted history yet, so no real 'largest change' can be shown — never estimated." />
        </SectionCard>

        <SectionCard title="Highest AI Confidence" subtitle="Real active recommendations, by confidence score" className="screen-card">
          {data?.highestAiConfidence?.length ? (
            data.highestAiConfidence.map((item) => (
              <div key={item.symbol} className="widget-list-item">
                <button type="button" className="ghost-button" onClick={() => openSymbolPanel(item.symbol)}><strong>{item.symbol}</strong></button>
                <span className="pill monitor">{item.action} — {item.confidenceScore}/100</span>
              </div>
            ))
          ) : (
            <EmptyState message="No active recommendations yet." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
