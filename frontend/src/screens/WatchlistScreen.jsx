import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import useWatchlist from "../hooks/useWatchlist";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function MiniSparkline({ change = 0, score = 50 }) {
  const direction = Number(change || 0) >= 0 ? 1 : -1;
  const volatility = Math.max(2, Math.round(Math.abs(Number(change || 0)) * 2));
  const base = 24;
  const points = [
    base - direction * 2,
    base + direction * 1,
    base - direction * volatility,
    base + direction * 2,
    base - direction * Math.round((Number(score || 50) - 50) / 12),
    base - direction * (volatility + 3),
  ];

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${index * 18} ${point}`).join(" ");

  return (
    <svg viewBox="0 0 90 48" className="mini-sparkline" aria-hidden="true">
      <path d={path} className={direction > 0 ? "mini-sparkline__line up" : "mini-sparkline__line down"} />
    </svg>
  );
}

export default function WatchlistScreen() {
  const { watchlist, addTicker, removeTicker } = useWatchlist();
  const [rows, setRows] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [tickerInput, setTickerInput] = useState("");

  useEffect(() => {
    async function loadWatchlistIntelligence() {
      if (!watchlist.length) {
        setRows([]);
        setErrorMessage("");
        return;
      }

      try {
        const symbols = watchlist.join(",");
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
  }, [watchlist]);

  const handleAddTicker = () => {
    const normalized = tickerInput.trim().toUpperCase();
    if (!normalized) {
      return;
    }
    addTicker(normalized);
    setTickerInput("");
  };

  const openTicker = (ticker) => {
    window.dispatchEvent(new CustomEvent("impactone:select-ticker", { detail: ticker }));
  };

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Watchlist</p>
          <h1>Professional watchlist intelligence</h1>
          <p className="subtext">
            Review conviction, movement, and alerts in one premium card view.
          </p>
        </div>
      </section>

      <SectionCard title="Watchlist" subtitle="AI-ranked symbols" icon="◈" className="screen-card">
        <div className="analysis-search">
          <input
            value={tickerInput}
            onChange={(event) => setTickerInput(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleAddTicker();
              }
            }}
            placeholder="Add ticker (e.g. AAPL)"
          />
          <button type="button" onClick={handleAddTicker}>Add</button>
        </div>
        <div className="company-description subtle">Tracked tickers: {watchlist.length}</div>

        {rows.length ? (
          <div className="watchlist-premium-grid">
            {rows.map((item) => (
              <article key={item.symbol} className="watch-card-premium">
                <div className="watch-card-premium__top">
                  <button type="button" className="favorite-item favorite-item--inline" onClick={() => openTicker(item.symbol)}>
                    {item.symbol}
                  </button>
                  <span className="score-badge">AI {Number(item.aiScore || 0)}/100</span>
                </div>

                <div className="watch-card-premium__company">{item.company}</div>

                <div className="watch-card-premium__metrics">
                  <div>
                    <span>Price</span>
                    <strong>${Number(item.price || 0).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>Move</span>
                    <strong className={Number(item.change || 0) >= 0 ? "positive" : "negative"}>
                      {Number(item.change || 0) >= 0 ? "+" : ""}{Number(item.change || 0).toFixed(2)}%
                    </strong>
                  </div>
                  <div>
                    <span>AI Rating</span>
                    <strong>{item.aiRating || "Hold"}</strong>
                  </div>
                </div>

                <MiniSparkline change={Number(item.change || 0)} score={Number(item.aiScore || 0)} />

                <div className="watch-card-premium__footer">
                  <span className={`alert-badge ${item.alertBadge?.type || "monitor"}`}>{item.alertBadge?.label || "Monitor"}</span>
                  <div className="watch-card-premium__actions">
                    <button type="button" className="ghost-button" onClick={() => openTicker(item.symbol)}>Analyze</button>
                    <button type="button" className="ghost-button" onClick={() => removeTicker(item.symbol)}>Remove</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="company-description">{errorMessage || "No watchlist symbols yet. Add tickers to generate premium watch intelligence."}</p>
        )}
      </SectionCard>
    </div>
  );
}
