import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function WatchlistScreen() {
  const [rows, setRows] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadWatchlistIntelligence() {
      try {
        const saved = JSON.parse(localStorage.getItem("impactone-favorites") || "[]");
        const symbols = saved.length ? saved.join(",") : "NVDA,PLTR,AAPL";
        const response = await fetch(`${API_BASE}/watchlist?symbols=${symbols}`);
        const data = await response.json();

        if (!response.ok) {
          setRows([]);
          setErrorMessage(data.error || "Unable to load watchlist intelligence.");
          return;
        }

        setRows(data.watchlist || []);
        setErrorMessage("");
      } catch (error) {
        setRows([]);
        setErrorMessage(error?.message || "Unable to load watchlist intelligence.");
      }
    }

    loadWatchlistIntelligence();
  }, []);

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Watchlist</p>
          <h1>High-conviction ideas at a glance</h1>
          <p className="subtext">
            Follow your rotating basket of growth and quality leaders with a clean view.
          </p>
        </div>
      </section>

      <SectionCard title="Watchlist intelligence" subtitle="Saved favorites with AI signal and alerts" className="screen-card">
        {rows.length ? (
          <div className="table-wrapper">
            <table className="watchlist-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Company</th>
                  <th>Latest Price</th>
                  <th>Daily Change</th>
                  <th>AI Rating</th>
                  <th>AI Score</th>
                  <th>Alert</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.symbol}>
                    <td>{item.symbol}</td>
                    <td>{item.company}</td>
                    <td>${Number(item.price || 0).toFixed(2)}</td>
                    <td className={item.change >= 0 ? "positive" : "negative"}>{item.change >= 0 ? "+" : ""}{Number(item.change || 0).toFixed(2)}%</td>
                    <td>{item.aiRating || "Hold"}</td>
                    <td>{Number(item.aiScore || 0)}/100</td>
                    <td>
                      <span className={`alert-badge ${item.alertBadge?.type || "monitor"}`}>{item.alertBadge?.label || "Monitor"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="company-description">{errorMessage || "No favorites found yet. Save tickers from AI Analysis to build your watchlist intelligence."}</p>
        )}
        <div className="watchlist-grid">
          {rows.slice(0, 4).map((item) => (
            <article key={`${item.symbol}-card`} className="watch-item">
              <div className="watch-item__top">
                <strong>{item.symbol}</strong>
                <span className={`pill ${item.alertBadge?.type || "monitor"}`}>{item.alertBadge?.label || "Monitor"}</span>
              </div>
              <div className="watch-item__company">{item.company}</div>
              <div className={`watch-item__upside ${item.change >= 0 ? "positive" : "negative"}`}>{item.change >= 0 ? "+" : ""}{Number(item.change || 0).toFixed(2)}% today</div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
