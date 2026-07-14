import { useState } from "react";
import SectionCard from "../components/SectionCard";
import { Button, ErrorState, Input } from "../components/ui";
import usePortfolioEngine from "../hooks/usePortfolioEngine";

function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// The server-owned engine only knows about trades that were actually
// executed through it — there is no autonomous trading loop wired up
// yet (that's a later sprint), so these are computed from real closed
// trades rather than the richer decision-log the legacy client-side
// engine kept.
function computeTradeStats(trades) {
  const closed = trades.filter((trade) => trade.realizedPnl !== null);
  const wins = closed.filter((trade) => trade.realizedPnl > 0);
  const losses = closed.filter((trade) => trade.realizedPnl < 0);

  return {
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    averageGain: average(wins.map((trade) => trade.realizedPnl)),
    averageLoss: average(losses.map((trade) => trade.realizedPnl)),
    closedCount: closed.length,
  };
}

/**
 * Server-owned Portfolio Engine screen (Sprint 14). Reachable when
 * VITE_PORTFOLIO_ENGINE=api. Orders are placed manually here for now —
 * wiring the AI committee/intelligence signals into automatic order
 * placement against this engine is a later sprint.
 */
export default function PortfolioEngineScreen() {
  const { summary, trades, transactions, performance, performanceDelta, isLoading, error, actionError, placeOrder, reset, refresh } = usePortfolioEngine();
  const [orderSymbol, setOrderSymbol] = useState("");
  const [orderSide, setOrderSide] = useState("BUY");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const positions = summary?.positions || [];
  const allocationBySector = summary?.allocation?.bySector || [];
  const allocationByAssetType = summary?.allocation?.byAssetType || [];
  const tradeStats = computeTradeStats(trades);

  const handlePlaceOrder = async (event) => {
    event.preventDefault();
    const quantity = Number(orderQuantity);
    if (!orderSymbol.trim() || !Number.isInteger(quantity) || quantity <= 0) {
      return;
    }

    setIsSubmittingOrder(true);
    try {
      await placeOrder({ symbol: orderSymbol.trim().toUpperCase(), side: orderSide, quantity });
      setOrderSymbol("");
      setOrderQuantity("");
    } catch (submitError) {
      // actionError is already surfaced by the hook; nothing further to do.
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="screen-page">
        <p className="company-description">Loading portfolio engine...</p>
      </div>
    );
  }

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Portfolio — Engine Preview</p>
          <h1>Persistent paper-trading engine</h1>
          <p className="subtext">
            Server-owned portfolio backed by Postgres — positions, orders, and P/L survive a restart. Orders are placed manually here; automated execution from AI signals is a later sprint.
          </p>
        </div>
        <Button type="button" className="ghost-button" onClick={reset}>Reset virtual portfolio</Button>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {actionError ? <p className="company-description subtle negative">{actionError}</p> : null}

      {/* Sprint 24 — Portfolio Intelligence: today vs. yesterday, in plain
          language, only when there's something meaningful to say. Reuses
          portfolioEngineService.getPerformanceDelta directly — no second
          comparison computed in the frontend. */}
      <SectionCard title="Portfolio Intelligence" subtitle="Today vs. yesterday" className="screen-card">
        <p className="company-description">{performanceDelta?.summary || "Loading today's comparison…"}</p>
        {performanceDelta?.changes?.length ? (
          <ul className="stack-list">
            {performanceDelta.changes.map((change) => (
              <li key={change.dimension} className="company-description subtle">
                {change.label}: ${Number(change.beforeValue).toLocaleString()} → ${Number(change.afterValue).toLocaleString()}
                {change.changePct !== null ? ` (${change.changePct >= 0 ? "+" : ""}${change.changePct}%)` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>

      <div className="portfolio-grid">
        <SectionCard title="Cash Balance" subtitle="Available capital" className="screen-card">
          <div className="portfolio-metric">${Number(summary?.cashBalance || 0).toLocaleString()}</div>
          <div className="portfolio-metric__label">Starting capital ${Number(summary?.startingCapital || 0).toLocaleString()}</div>
        </SectionCard>

        <SectionCard title="Total Portfolio Value" subtitle="Cash + open positions" className="screen-card">
          <div className="portfolio-metric">${Number(summary?.totalValue || 0).toLocaleString()}</div>
          <div className="portfolio-metric__label">Total return {Number(summary?.totalReturnPct || 0).toFixed(2)}%</div>
        </SectionCard>

        <SectionCard title="Realized P/L" subtitle="From closed trades" className="screen-card">
          <div className={`portfolio-metric ${Number(summary?.realizedPnl || 0) >= 0 ? "positive" : "negative"}`}>${Number(summary?.realizedPnl || 0).toFixed(2)}</div>
          <div className="portfolio-metric__label">{tradeStats.closedCount} closed trades</div>
        </SectionCard>

        <SectionCard title="Unrealized P/L" subtitle="Open position mark-to-market" className="screen-card">
          <div className={`portfolio-metric ${Number(summary?.unrealizedPnl || 0) >= 0 ? "positive" : "negative"}`}>${Number(summary?.unrealizedPnl || 0).toFixed(2)}</div>
          <div className="portfolio-metric__label">{positions.length} open positions</div>
        </SectionCard>
      </div>

      <SectionCard title="Place Order" subtitle="Manual paper trade" className="screen-card">
        <form className="order-form" onSubmit={handlePlaceOrder}>
          <Input
            value={orderSymbol}
            onChange={(event) => setOrderSymbol(event.target.value.toUpperCase())}
            placeholder="Symbol (e.g. AAPL)"
          />
          <Button
            type="button"
            className={orderSide === "BUY" ? "pill opportunity" : "ghost-button"}
            onClick={() => setOrderSide("BUY")}
          >
            Buy
          </Button>
          <Button
            type="button"
            className={orderSide === "SELL" ? "pill risk" : "ghost-button"}
            onClick={() => setOrderSide("SELL")}
          >
            Sell
          </Button>
          <Input
            type="number"
            min="1"
            step="1"
            value={orderQuantity}
            onChange={(event) => setOrderQuantity(event.target.value)}
            placeholder="Quantity"
          />
          <Button type="submit" className="ghost-button" disabled={isSubmittingOrder}>{isSubmittingOrder ? "Placing..." : "Place order"}</Button>
        </form>
      </SectionCard>

      <div className="screen-grid">
        <SectionCard title="Open Positions" subtitle="Live mark-to-market" className="screen-card">
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
                  <tr key={position.id}>
                    <td>{position.symbol}</td>
                    <td>{position.quantity}</td>
                    <td>${Number(position.avgEntryPrice || 0).toFixed(2)}</td>
                    <td>${Number(position.currentPrice || 0).toFixed(2)}</td>
                    <td className={Number(position.unrealizedPnl || 0) >= 0 ? "positive" : "negative"}>${Number(position.unrealizedPnl || 0).toFixed(2)}</td>
                    <td>{position.sector}</td>
                    <td>{position.assetType}</td>
                  </tr>
                )) : <tr><td colSpan="7">No open positions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Trade Statistics" subtitle="From closed trades" className="screen-card">
          <div className="widget-list">
            <div className="widget-list-item"><strong>Win Rate</strong><span>{tradeStats.winRate.toFixed(2)}%</span></div>
            <div className="widget-list-item"><strong>Average Gain</strong><span>${tradeStats.averageGain.toFixed(2)}</span></div>
            <div className="widget-list-item"><strong>Average Loss</strong><span>${tradeStats.averageLoss.toFixed(2)}</span></div>
          </div>
        </SectionCard>
      </div>

      <div className="screen-grid">
        <SectionCard title="Allocation by Sector" subtitle="Current exposure" className="screen-card">
          <div className="widget-list">
            {allocationBySector.length ? allocationBySector.map((item) => (
              <div key={item.name} className="widget-list-item"><strong>{item.name}</strong><span>{item.pct}%</span></div>
            )) : <p className="company-description subtle">No sector allocation yet.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Allocation by Asset Type" subtitle="Current exposure" className="screen-card">
          <div className="widget-list">
            {allocationByAssetType.length ? allocationByAssetType.map((item) => (
              <div key={item.name} className="widget-list-item"><strong>{item.name}</strong><span>{item.pct}%</span></div>
            )) : <p className="company-description subtle">No asset allocation yet.</p>}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Performance Timeline" subtitle="Point-in-time snapshots" className="screen-card">
        <Button type="button" className="ghost-button" onClick={() => refresh()}>Refresh</Button>
        <div className="table-wrapper">
          <table className="watchlist-table">
            <thead>
              <tr>
                <th>Captured</th>
                <th>Total Value</th>
                <th>Cash</th>
                <th>Realized P/L</th>
                <th>Unrealized P/L</th>
                <th>Total Return</th>
              </tr>
            </thead>
            <tbody>
              {performance.length ? performance.slice().reverse().map((snapshot) => (
                <tr key={snapshot.capturedAt}>
                  <td>{new Date(snapshot.capturedAt).toLocaleString()}</td>
                  <td>${Number(snapshot.totalValue || 0).toLocaleString()}</td>
                  <td>${Number(snapshot.cashBalance || 0).toLocaleString()}</td>
                  <td className={Number(snapshot.realizedPnl || 0) >= 0 ? "positive" : "negative"}>${Number(snapshot.realizedPnl || 0).toFixed(2)}</td>
                  <td className={Number(snapshot.unrealizedPnl || 0) >= 0 ? "positive" : "negative"}>${Number(snapshot.unrealizedPnl || 0).toFixed(2)}</td>
                  <td>{Number(snapshot.totalReturnPct || 0).toFixed(2)}%</td>
                </tr>
              )) : <tr><td colSpan="6">No snapshots captured yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Trade History" subtitle="Executed fills" className="screen-card">
        <div className="table-wrapper">
          <table className="watchlist-table">
            <thead>
              <tr>
                <th>Executed</th>
                <th>Ticker</th>
                <th>Side</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Realized P/L</th>
              </tr>
            </thead>
            <tbody>
              {trades.length ? trades.map((trade) => (
                <tr key={trade.id}>
                  <td>{new Date(trade.executedAt).toLocaleString()}</td>
                  <td>{trade.symbol}</td>
                  <td>{trade.side}</td>
                  <td>{trade.quantity}</td>
                  <td>${Number(trade.price || 0).toFixed(2)}</td>
                  <td className={Number(trade.realizedPnl || 0) >= 0 ? "positive" : "negative"}>{trade.realizedPnl === null ? "—" : `$${Number(trade.realizedPnl).toFixed(2)}`}</td>
                </tr>
              )) : <tr><td colSpan="6">No trades yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Transaction Log" subtitle="Cash ledger" className="screen-card">
        <div className="table-wrapper">
          <table className="watchlist-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length ? transactions.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>{entry.type}</td>
                  <td className={Number(entry.amount || 0) >= 0 ? "positive" : "negative"}>${Number(entry.amount || 0).toFixed(2)}</td>
                  <td>${Number(entry.balanceAfter || 0).toFixed(2)}</td>
                  <td>{entry.description}</td>
                </tr>
              )) : <tr><td colSpan="5">No transactions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
