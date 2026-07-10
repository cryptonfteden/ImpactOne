import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import useWatchlist from "../hooks/useWatchlist";
import { intelligenceApi } from "../services/api";
import { logError } from "../utils/errorHandling";

export default function AlertsScreen() {
  const { watchlist } = useWatchlist();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      try {
        const payload = await intelligenceApi.liveFeed({
          watchlist: watchlist.length ? watchlist : ["AAPL", "NVDA", "TSLA"],
        });
        if (!cancelled) {
          setAlerts(payload.alerts || []);
        }
      } catch (error) {
        logError("Alerts screen load failed", error);
        if (!cancelled) {
          setAlerts([]);
        }
      }
    }

    loadAlerts();
    return () => {
      cancelled = true;
    };
  }, [watchlist]);

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Alerts</p>
          <h1>Signals that need your attention</h1>
          <p className="subtext">
            Keep your workflow focused on the moves that matter most.
          </p>
        </div>
      </section>

      <SectionCard title="Active alerts" subtitle="Thresholded intelligence feed" className="screen-card">
        <div className="alert-list">
          {alerts.length ? alerts.map((alert) => (
            <article key={alert.id} className="alert-item">
              <h4>{alert.headline}</h4>
              <p>{alert.whyItMatters}</p>
              <p className="company-description subtle">Confidence {alert.confidence}/100 • {alert.actionability} • {alert.riskLevel} risk</p>
            </article>
          )) : <p className="company-description subtle">No alert crossed confidence, impact, and exposure thresholds.</p>}
        </div>
      </SectionCard>
    </div>
  );
}
