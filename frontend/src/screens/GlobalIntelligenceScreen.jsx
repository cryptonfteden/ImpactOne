import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import useWatchlist from "../hooks/useWatchlist";
import { intelligenceApi } from "../services/api";
import { logError } from "../utils/errorHandling";

const DEFAULT_SCENARIOS = ["Oil spike", "Fed rate hike", "BTC ETF approval", "Israel conflict"];

export default function GlobalIntelligenceScreen() {
  const { watchlist } = useWatchlist();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let intervalId;

    async function loadOverview() {
      try {
        const payload = await intelligenceApi.overview({
          watchlist: watchlist.length ? watchlist : ["AAPL", "NVDA", "TSLA"],
          scenarios: DEFAULT_SCENARIOS,
          sessionType: "morning",
        });
        if (!cancelled) {
          setOverview(payload);
          setError("");
        }
      } catch (nextError) {
        logError("Global intelligence overview failed", nextError);
        if (!cancelled) {
          setOverview(null);
          setError(nextError?.message || "Unable to load global intelligence.");
        }
      }
    }

    loadOverview();
    intervalId = setInterval(loadOverview, 60000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [watchlist]);

  const globalMap = overview?.globalMap || null;
  const feed = overview?.feed || [];
  const changeWindows = overview?.changeWindows || {};
  const alphaDiscovery = overview?.alphaDiscovery || null;
  const scanCoverage = overview?.scanCoverage || [];

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Global Intelligence</p>
          <h1>World intelligence map and live event feed</h1>
          <p className="subtext">
            Monitor major global events, cross-border sector propagation, capital flow shifts, and the live intelligence pipeline in one place.
          </p>
        </div>
      </section>

      {error ? <p className="company-description subtle">{error}</p> : null}

      <div className="analysis-grid">
        <SectionCard title="Major Global Events" subtitle="Live feed" className="screen-card">
          <div className="news-list">
            {feed.length ? feed.slice(0, 6).map((item) => (
              <article key={item.id} className="news-item news-item--premium">
                <div className="news-item__icon">◎</div>
                <div>
                  <div className="news-item__meta">{item.eventType} • {item.confidence}/100 confidence • {item.actionability}</div>
                  <h4>{item.headline}</h4>
                  <p>{item.whyItMatters}</p>
                  <p className="company-description subtle">Assets: {(item.affectedAssets || []).slice(0, 5).join(", ") || "N/A"} | Analogue: {item.historicalAnalogue}</p>
                  <p className="company-description subtle">Evidence: {(item.explainability?.evidence || []).slice(0, 2).join(" | ") || "N/A"}</p>
                  <p className="company-description subtle">Sources: {(item.explainability?.dataSources || []).join(", ") || "N/A"}</p>
                  <p className="company-description subtle">Counterarguments: {(item.explainability?.counterarguments || []).slice(0, 1).join(" ") || "N/A"}</p>
                  <p className="company-description subtle">Invalidation: {(item.explainability?.invalidationSignals || []).slice(0, 1).join(" ") || "N/A"}</p>
                </div>
              </article>
            )) : <p className="company-description">Live intelligence feed loading...</p>}
          </div>
        </SectionCard>

        <SectionCard title="Global Market Map" subtitle="Countries and flows" className="screen-card">
          {globalMap ? (
            <>
              <div className="heatmap-grid">
                {(globalMap.countriesAffected || []).slice(0, 8).map((country, index) => (
                  <div key={country} className={`heatmap-tile ${index % 2 === 0 ? "up" : "down"}`}>
                    <strong>{country}</strong>
                    <small>{index % 2 === 0 ? "Elevated attention" : "Flow transition"}</small>
                  </div>
                ))}
              </div>
              <p className="company-description subtle">Macro regime: {globalMap.macroRegime?.riskMode || "N/A"} | Sentiment: {globalMap.currentMarketSentiment?.classification || "N/A"}</p>
            </>
          ) : (
            <p className="company-description">Global map loading...</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Country Intelligence" subtitle="Market map by country" className="screen-card">
        <div className="table-wrapper">
          <table className="watchlist-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>Sentiment</th>
                <th>Political Risk</th>
                <th>Economic Momentum</th>
                <th>Inflation</th>
                <th>Currency</th>
                <th>Trade</th>
                <th>Military</th>
                <th>Attractiveness</th>
              </tr>
            </thead>
            <tbody>
              {(globalMap?.countries || []).map((country) => (
                <tr key={country.country}>
                  <td>{country.country}</td>
                  <td>{country.marketSentiment}</td>
                  <td>{country.politicalRisk}</td>
                  <td>{country.economicMomentum}</td>
                  <td>{country.inflationTrend}</td>
                  <td>{country.currencyTrend}</td>
                  <td>{country.tradeActivity}</td>
                  <td>{country.militaryEscalation}</td>
                  <td>{country.investmentAttractiveness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="screen-grid">
        <SectionCard title="Sector Propagation" subtitle="How events spread" className="screen-card">
          <div className="timeline">
            {(globalMap?.sectorPropagation || []).map((item) => (
              <div key={item.headline} className="timeline-item">
                <div className="timeline-dot" />
                <div>
                  <div className="timeline-time">{item.sectors?.join(", ") || "Cross-asset"}</div>
                  <strong>{item.headline}</strong>
                  <p className="company-description subtle">Assets: {(item.assets || []).join(", ") || "N/A"}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Capital Flows" subtitle="Current transitions" className="screen-card">
          <div className="widget-list">
            {(globalMap?.capitalFlows || []).map((item, index) => (
              <div key={`${item.from}-${item.to}-${index}`} className="widget-list-item">
                <strong>{item.from} → {item.to}</strong>
                <span>{item.rationale}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="analysis-grid">
        <SectionCard title="Alpha Discovery" subtitle="Highest conviction opportunities" className="screen-card">
          <div className="widget-list">
            {(alphaDiscovery?.top10InvestmentIdeas || []).slice(0, 10).map((idea, index) => (
              <div key={`${idea.symbol}-${idea.primaryDriver}-${index}`} className="widget-list-item">
                <strong>{idea.symbol}</strong>
                <span>{idea.portfolioAction?.action || "Wait"} | {idea.convictionScore}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Autonomous Scan Coverage" subtitle="Refresh cycle inputs" className="screen-card">
          <div className="widget-list">
            {scanCoverage.map((scan) => (
              <div key={scan.scanType} className="widget-list-item">
                <strong>{scan.scanType}</strong>
                <span>{scan.sourceCount} sources</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="What Changed" subtitle="Meaningful updates only" className="screen-card">
        <div className="ai-report__grid">
          <div>
            <h4>Last 15 minutes</h4>
            <ul className="stack-list">
              {(changeWindows.last15Minutes || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h4>Last hour</h4>
            <ul className="stack-list">
              {(changeWindows.lastHour || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h4>Since market open</h4>
            <ul className="stack-list">
              {(changeWindows.sinceMarketOpen || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h4>Overnight</h4>
            <ul className="stack-list">
              {(changeWindows.overnight || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
