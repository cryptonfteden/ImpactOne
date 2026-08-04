import { useCallback, useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { ConfirmButton, ErrorState } from "../components/ui";
import useWatchlist from "../hooks/useWatchlist";
import useVirtualPortfolio from "../hooks/useVirtualPortfolio";
import { intelligenceApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { startVisibilityAwarePolling } from "../utils/pollWhileVisible";
import PortfolioEngineScreen from "./PortfolioEngineScreen";

const DEFAULT_SCENARIOS = ["Oil spike", "Fed rate hike", "BTC ETF approval", "Israel conflict"];

const SECTOR_CONCENTRATION_LIMIT_PCT = 25; // matches this screen's own displayed "Portfolio Rules"
const ELEVATED_RISK_EXPOSURE_PCT = 50;

/**
 * Sprint 40 — Portfolio as AI advisor: insights, not just positions.
 * Every line here is derived from data this screen already fetched —
 * nothing new is requested, nothing is invented. Where this codebase
 * genuinely has no data source yet (macro exposure at the portfolio
 * level), this says so honestly instead of fabricating a reading.
 */
function buildAdvisorInsights(portfolio) {
  const positions = portfolio?.positions || [];
  const sectors = portfolio?.allocationBySector || [];
  const riskExposure = Number(portfolio?.riskExposure || 0);

  const topSector = sectors.length ? sectors.slice().sort((a, b) => b.pct - a.pct)[0] : null;
  const largestHiddenRisk = topSector
    ? topSector.pct > SECTOR_CONCENTRATION_LIMIT_PCT
      ? `${topSector.pct}% concentrated in ${topSector.name} — above your own ${SECTOR_CONCENTRATION_LIMIT_PCT}% sector limit.`
      : `Largest sector exposure is ${topSector.name} at ${topSector.pct}% — within your ${SECTOR_CONCENTRATION_LIMIT_PCT}% limit.`
    : "No open positions yet — no sector concentration to report.";

  const bestPosition = positions.length ? positions.slice().sort((a, b) => Number(b.unrealizedPnL || 0) - Number(a.unrealizedPnL || 0))[0] : null;
  const largestOpportunity = bestPosition
    ? `${bestPosition.symbol} is your best-performing open position (${Number(bestPosition.unrealizedPnL || 0) >= 0 ? "+" : ""}$${Number(bestPosition.unrealizedPnL || 0).toFixed(2)} unrealized).`
    : "No open positions yet — no opportunity to report.";

  const worstPosition = positions.length ? positions.slice().sort((a, b) => Number(a.unrealizedPnL || 0) - Number(b.unrealizedPnL || 0))[0] : null;
  const whatDeservesAttentionToday = worstPosition && Number(worstPosition.unrealizedPnL || 0) < 0
    ? `${worstPosition.symbol} is your worst-performing open position (-$${Math.abs(Number(worstPosition.unrealizedPnL || 0)).toFixed(2)} unrealized) — worth a look.`
    : "No open position is currently underwater.";

  const aiWarning = riskExposure > ELEVATED_RISK_EXPOSURE_PCT
    ? `Risk exposure is elevated at ${riskExposure.toFixed(2)}% of capital.`
    : positions.length
      ? `Risk exposure is ${riskExposure.toFixed(2)}% of capital — no elevated-risk warning today.`
      : "No open positions — no risk exposure to warn about.";

  return {
    largestHiddenRisk,
    largestOpportunity,
    sectorConcentration: topSector ? `${topSector.name} — ${topSector.pct}%` : "No allocation yet.",
    macroExposure: "Not tracked at the portfolio level yet — see the Investment Intelligence Committee's Macro Economist view per symbol (Intelligence Console).",
    aiWarning,
    whatDeservesAttentionToday,
  };
}

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

  // Phase X6 — Part 3, extracted from the load effect (via useCallback)
  // so the error state below can offer a real, working "Try again"
  // retry action, not just a static message.
  const loadOverview = useCallback(async () => {
    try {
      const payload = await intelligenceApi.overview({
        watchlist: watchlist.length ? watchlist : ["AAPL", "NVDA", "TSLA", "BTC"],
        scenarios: DEFAULT_SCENARIOS,
        sessionType: "morning",
      });
      setOverview(payload);
      setError("");
    } catch (nextError) {
      logError("Portfolio overview load failed", nextError);
      // Sprint 34 — this used to null out overview on every refresh
      // failure (including the visibility-aware 60s poll), actively
      // destroying already-loaded portfolio data instead of just
      // failing to refresh it. Keep the last good overview and only
      // surface the error.
      // Phase X5 — Part 7, Private Beta Polish. Never render a raw
      // caught-error message to an investor — logError above already
      // captured it for diagnostics.
      setError("We couldn't refresh portfolio intelligence right now.");
    }
  }, [watchlist]);

  useEffect(() => {
    loadOverview();
    const stopPolling = startVisibilityAwarePolling(loadOverview, 60000);
    return () => {
      stopPolling();
    };
  }, [loadOverview]);

  const positions = portfolio?.positions || [];
  const trades = portfolio?.trades || [];
  const insights = buildAdvisorInsights(portfolio);

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
        <ErrorState
          message={error}
          reason={overview ? "Showing the last portfolio data that loaded successfully." : "This is usually temporary."}
          onRetry={loadOverview}
        />
      ) : null}

      <SectionCard title="AI Advisor Insights" subtitle="Not positions — what actually deserves your attention today" className="screen-card">
        <div className="widget-list">
          <div className="widget-list-item"><strong>Largest hidden risk</strong><span>{insights.largestHiddenRisk}</span></div>
          <div className="widget-list-item"><strong>Largest opportunity</strong><span>{insights.largestOpportunity}</span></div>
          <div className="widget-list-item"><strong>Sector concentration</strong><span>{insights.sectorConcentration}</span></div>
          <div className="widget-list-item"><strong>Macro exposure</strong><span>{insights.macroExposure}</span></div>
          <div className="widget-list-item"><strong>AI warning</strong><span>{insights.aiWarning}</span></div>
          <div className="widget-list-item"><strong>Deserves attention today</strong><span>{insights.whatDeservesAttentionToday}</span></div>
        </div>
      </SectionCard>

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
