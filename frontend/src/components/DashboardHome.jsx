import { useEffect, useMemo, useState } from "react";
import WatchlistTable from "./WatchlistTable";
import AIInsightsSidebar from "./AIInsightsSidebar";
import useWatchlist from "../hooks/useWatchlist";
import { watchlistApi } from "../services/api";
import { logError } from "../utils/errorHandling";

export default function DashboardHome() {
  const { watchlist } = useWatchlist();
  const [watchlistRows, setWatchlistRows] = useState([]);
  const [watchlistError, setWatchlistError] = useState("");
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    async function loadWatchlistIntelligence() {
      if (!watchlist.length) {
        setWatchlistRows([]);
        setWatchlistError("");
        return;
      }

      setWatchlistLoading(true);
      try {
        const data = await watchlistApi.getIntelligence(watchlist);
        setWatchlistRows(data.watchlist || []);
        setWatchlistError("");
      } catch (error) {
        logError("Dashboard watchlist load failed", error);
        setWatchlistRows([]);
        setWatchlistError(error?.message || "Unable to load watchlist data.");
      } finally {
        setWatchlistLoading(false);
      }
    }

    loadWatchlistIntelligence();
  }, [watchlist]);

  const fearGreedValue = useMemo(() => {
    if (!watchlistRows.length) {
      return 72;
    }
    const average = watchlistRows.reduce((sum, row) => sum + Number(row.aiScore || 0), 0) / watchlistRows.length;
    return Math.max(0, Math.min(100, Math.round(average)));
  }, [watchlistRows]);

  const strongestOpportunity = useMemo(() => {
    if (!watchlistRows.length) {
      return null;
    }
    return [...watchlistRows].sort((a, b) => Number(b.aiScore || 0) - Number(a.aiScore || 0))[0] || null;
  }, [watchlistRows]);

  const highestRisk = useMemo(() => {
    if (!watchlistRows.length) {
      return null;
    }
    return [...watchlistRows].sort((a, b) => Number(a.aiScore || 0) - Number(b.aiScore || 0))[0] || null;
  }, [watchlistRows]);

  const todayOpportunities = useMemo(() => {
    const opportunities = watchlistRows.filter((item) => item.alertBadge?.type === "opportunity");
    if (opportunities.length) {
      return opportunities.slice(0, 3);
    }
    return [...watchlistRows].sort((a, b) => Number(b.aiScore || 0) - Number(a.aiScore || 0)).slice(0, 3);
  }, [watchlistRows]);

  const topMovers = useMemo(() => {
    return [...watchlistRows]
      .sort((a, b) => Math.abs(Number(b.change || 0)) - Math.abs(Number(a.change || 0)))
      .slice(0, 4);
  }, [watchlistRows]);

  const positiveCount = watchlistRows.filter((row) => Number(row.change || 0) >= 0).length;

  return (
    <main className="dashboard-content premium-dashboard">
      <section className="hero-panel hero-panel--featured">
        <div className="hero-copy">
          <p className="eyebrow">Premium Command Center</p>
          <h1>Institutional-grade market intelligence in one workspace.</h1>
          <p className="subtext">
            Monitor market state, prioritize opportunities, and execute AI-driven research from a single professional dashboard.
          </p>
        </div>
      </section>

      <section className="widget-grid" aria-label="Dashboard widgets">
        <article className="panel-card glass-card widget-card">
          <div className="widget-title">Market Status</div>
          <div className="widget-value">Open</div>
          <p className="company-description subtle">US equities in active session. Volatility moderate, breadth constructive.</p>
        </article>

        <article className="panel-card glass-card widget-card">
          <div className="widget-title">Fear & Greed</div>
          <div className="widget-value">{fearGreedValue}/100</div>
          <div className="meter">
            <div className="meter-fill meter-fill--greed" style={{ width: `${fearGreedValue}%` }} />
          </div>
        </article>

        <article className="panel-card glass-card widget-card">
          <div className="widget-title">Watchlist Summary</div>
          <div className="widget-value">{watchlistRows.length} tracked</div>
          <p className="company-description subtle">{positiveCount} up today, {Math.max(watchlistRows.length - positiveCount, 0)} down today.</p>
        </article>

        <article className="panel-card glass-card widget-card">
          <div className="widget-title">Today&apos;s Opportunities</div>
          <div className="widget-list">
            {todayOpportunities.length ? todayOpportunities.map((item) => (
              <div key={item.symbol} className="widget-list-item">
                <strong>{item.symbol}</strong>
                <span className={Number(item.change || 0) >= 0 ? "positive" : "negative"}>
                  {Number(item.change || 0) >= 0 ? "+" : ""}{Number(item.change || 0).toFixed(2)}%
                </span>
              </div>
            )) : <p className="company-description subtle">Add tickers to view opportunities.</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">AI Insight of the Day</div>
          {strongestOpportunity ? (
            <>
              <div className="widget-value">{strongestOpportunity.symbol} {strongestOpportunity.aiRating || "Hold"}</div>
              <p className="company-description">
                Highest conviction signal currently sits on {strongestOpportunity.symbol} with AI score {Number(strongestOpportunity.aiScore || 0)}/100.
                {highestRisk ? ` Primary risk watch remains ${highestRisk.symbol}.` : ""}
              </p>
            </>
          ) : (
            <p className="company-description subtle">Run AI analysis and build your watchlist to generate daily insights.</p>
          )}
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Top Movers</div>
          <div className="mover-grid">
            {topMovers.length ? topMovers.map((mover) => (
              <div key={mover.symbol} className="mover-card">
                <strong>{mover.symbol}</strong>
                <span className={Number(mover.change || 0) >= 0 ? "positive" : "negative"}>
                  {Number(mover.change || 0) >= 0 ? "+" : ""}{Number(mover.change || 0).toFixed(2)}%
                </span>
                <small>{mover.aiRating || "Hold"}</small>
              </div>
            )) : <p className="company-description subtle">No movers yet.</p>}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <WatchlistTable rows={watchlistRows} errorMessage={watchlistError} isLoading={watchlistLoading} />
        <AIInsightsSidebar />
      </section>
    </main>
  );
}
