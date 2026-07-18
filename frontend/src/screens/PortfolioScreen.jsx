import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { ConfirmButton } from "../components/ui";
import useWatchlist from "../hooks/useWatchlist";
import useVirtualPortfolio from "../hooks/useVirtualPortfolio";
import { intelligenceApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { startVisibilityAwarePolling } from "../utils/pollWhileVisible";
import PortfolioEngineScreen from "./PortfolioEngineScreen";

const DEFAULT_SCENARIOS = ["Oil spike", "Fed rate hike", "BTC ETF approval", "Israel conflict"];

// Default is the existing localStorage-driven engine, unchanged. Set
// VITE_PORTFOLIO_ENGINE=api to preview the new server-owned Portfolio
// Engine (Sprint 14) instead. Neither hook is called by this outer
// component, so branching here doesn't violate the rules of hooks.
export default function PortfolioScreen() {
  if (import.meta.env.VITE_PORTFOLIO_ENGINE === "api") {
    return <PortfolioEngineScreen />;
  }
  return <LegacyPortfolioScreen />;
}

function LegacyPortfolioScreen() {
  const { watchlist } = useWatchlist();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const { portfolio, reset } = useVirtualPortfolio({ watchlist, overview, autoSync: true });

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const payload = await intelligenceApi.overview({
          watchlist: watchlist.length ? watchlist : ["AAPL", "NVDA", "TSLA", "BTC"],
          scenarios: DEFAULT_SCENARIOS,
          sessionType: "morning",
        });
        if (!cancelled) {
          setOverview(payload);
          setError("");
        }
      } catch (nextError) {
        logError("Portfolio overview load failed", nextError);
        // Sprint 34 — this used to null out overview on every refresh
        // failure (including the visibility-aware 60s poll), actively
        // destroying already-loaded portfolio data instead of just
        // failing to refresh it. Keep the last good overview and only
        // surface the error.
        if (!cancelled) {
          setError(nextError?.message || "We couldn't refresh portfolio intelligence right now.");
        }
      }
    }

    loadOverview();
    const stopPolling = startVisibilityAwarePolling(loadOverview, 60000);
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [watchlist]);

  const positions = portfolio?.positions || [];
  const trades = portfolio?.trades || [];

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h1>Virtual agent portfolio and paper trading</h1>
          <p className="subtext">
            Virtual portfolio - simulated trades only. No broker connectivity. No live order execution.
          </p>
        </div>
        <ConfirmButton label="Reset virtual portfolio" onConfirm={reset} />
      </section>

      {error ? (
        <p className="company-description subtle negative">
          {error}{overview ? " Showing the last portfolio data that loaded successfully." : ""}
        </p>
      ) : null}

      <div className="portfolio-grid">
        <SectionCard title="Cash Balance" subtitle="Available capital" className="screen-card">
          <div className="portfolio-metric">${Number(portfolio?.cashBalance || 0).toLocaleString()}</div>
          <div className="portfolio-metric__label">Starting capital $100,000</div>
        </SectionCard>

        <SectionCard title="Total Portfolio Value" subtitle="Cash + open positions" className="screen-card">
          <div className="portfolio-metric">${Number(portfolio?.totalPortfolioValue || 0).toLocaleString()}</div>
          <div className="portfolio-metric__label">Total return ${Number(portfolio?.totalReturn || 0).toFixed(2)}</div>
        </SectionCard>

        <SectionCard title="Daily Return" subtitle="Open position impact" className="screen-card">
          <div className="portfolio-metric">${Number(portfolio?.dailyReturn || 0).toFixed(2)}</div>
          <div className="portfolio-metric__label">Realized P/L ${Number(portfolio?.realizedPnL || 0).toFixed(2)}</div>
        </SectionCard>

        <SectionCard title="Risk Exposure" subtitle="Open capital at risk" className="screen-card">
          <div className="portfolio-metric">{Number(portfolio?.riskExposure || 0).toFixed(2)}%</div>
          <div className="portfolio-metric__label">{positions.length} open positions</div>
        </SectionCard>
      </div>

      <div className="screen-grid">
        <SectionCard title="Open Positions" subtitle="Simulated holdings" className="screen-card">
          <div className="table-wrapper">
            <table className="watchlist-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Qty</th>
                  <th>Avg Entry</th>
                  <th>Current</th>
                  <th>Unrealized P/L</th>
                  <th>Sector</th>
                  <th>Asset Type</th>
                </tr>
              </thead>
              <tbody>
                {positions.length ? positions.map((position) => (
                  <tr key={position.symbol}>
                    <td>{position.symbol}</td>
                    <td>{position.quantity}</td>
                    <td>${Number(position.averageEntryPrice || 0).toFixed(2)}</td>
                    <td>${Number(position.currentPrice || 0).toFixed(2)}</td>
                    <td className={Number(position.unrealizedPnL || 0) >= 0 ? "positive" : "negative"}>${Number(position.unrealizedPnL || 0).toFixed(2)}</td>
                    <td>{position.sector}</td>
                    <td>{position.assetType}</td>
                  </tr>
                )) : <tr><td colSpan="7">No open positions — no simulated trade has cleared the 75-confidence threshold yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Performance Tracking" subtitle="Portfolio statistics" className="screen-card">
          <div className="widget-list">
            <div className="widget-list-item"><strong>Win Rate</strong><span>{Number(portfolio?.performance?.winRate || 0).toFixed(2)}%</span></div>
            <div className="widget-list-item"><strong>Average Gain</strong><span>${Number(portfolio?.performance?.averageGain || 0).toFixed(2)}</span></div>
            <div className="widget-list-item"><strong>Average Loss</strong><span>${Number(portfolio?.performance?.averageLoss || 0).toFixed(2)}</span></div>
            <div className="widget-list-item"><strong>Max Drawdown</strong><span>${Number(portfolio?.performance?.maxDrawdown || 0).toFixed(2)}</span></div>
            <div className="widget-list-item"><strong>Benchmark vs SPY</strong><span>${Number(portfolio?.performance?.benchmarkVsSpy || 0).toFixed(2)}</span></div>
            <div className="widget-list-item"><strong>SPY Return</strong><span>{Number(portfolio?.benchmark?.returnPct || 0).toFixed(2)}%</span></div>
            <div className="widget-list-item"><strong>Best Trade</strong><span>{portfolio?.performance?.bestTrade?.symbol || "N/A"}</span></div>
            <div className="widget-list-item"><strong>Worst Trade</strong><span>{portfolio?.performance?.worstTrade?.symbol || "N/A"}</span></div>
          </div>
        </SectionCard>
      </div>

      <div className="screen-grid">
        <SectionCard title="Allocation by Sector" subtitle="Current exposure" className="screen-card">
          <div className="widget-list">
            {(portfolio?.allocationBySector || []).length ? portfolio.allocationBySector.map((item) => (
              <div key={item.name} className="widget-list-item">
                <strong>{item.name}</strong>
                <span>{item.pct}%</span>
              </div>
            )) : <p className="company-description subtle">No sector allocation — allocation is computed from open positions, and you have none yet.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Allocation by Asset Type" subtitle="Current exposure" className="screen-card">
          <div className="widget-list">
            {(portfolio?.allocationByAssetType || []).length ? portfolio.allocationByAssetType.map((item) => (
              <div key={item.name} className="widget-list-item">
                <strong>{item.name}</strong>
                <span>{item.pct}%</span>
              </div>
            )) : <p className="company-description subtle">No asset-type allocation — allocation is computed from open positions, and you have none yet.</p>}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Trade History" subtitle="Agent trade log" className="screen-card">
        <div className="table-wrapper">
          <table className="watchlist-table">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Ticker</th>
                <th>Action</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Value</th>
                <th>Confidence</th>
                <th>Thesis</th>
                <th>Status</th>
                <th>Current P/L</th>
              </tr>
            </thead>
            <tbody>
              {trades.length ? trades.slice().reverse().map((trade) => (
                <tr key={trade.id}>
                  <td>{new Date(trade.dateTime).toLocaleString()}</td>
                  <td>{trade.ticker}</td>
                  <td>{trade.action}</td>
                  <td>${Number(trade.entryPrice || 0).toFixed(2)}</td>
                  <td>{trade.quantity}</td>
                  <td>${Number(trade.value || 0).toFixed(2)}</td>
                  <td>{trade.confidence}</td>
                  <td>{trade.thesis}</td>
                  <td>{trade.status}</td>
                  <td className={Number(trade.currentPnL || 0) >= 0 ? "positive" : "negative"}>${Number(trade.currentPnL || 0).toFixed(2)}</td>
                </tr>
              )) : <tr><td colSpan="10">No trades logged — no simulated trade has cleared the 75-confidence threshold yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Portfolio Rules" subtitle="Simulation controls" className="screen-card">
        <ul className="stack-list">
          <li>Virtual capital starts at $100,000.</li>
          <li>Max 10% per position.</li>
          <li>Max 25% per sector.</li>
          <li>No leverage.</li>
          <li>No short selling.</li>
          <li>Only simulate trades above 75 confidence.</li>
          <li>Require risk/reward above 1.5.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
