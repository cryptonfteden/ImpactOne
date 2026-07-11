import SectionCard from "../SectionCard";
import { Button, Skeleton } from "../ui";

const STARTER_SYMBOLS = ["AAPL", "NVDA", "TSLA"];

/**
 * Spec §4.6 Watchlist Priority Panel — tracked names ranked by urgency,
 * with an explainable reason (acceptance criteria).
 */
export default function WatchlistPriorityPanel({ isLoading, error, rows = [], onOpenTicker, onAddStarter }) {
  if (isLoading) {
    return (
      <SectionCard title="Watchlist Priority" subtitle="Ranked by urgency" className="screen-card">
        <Skeleton variant="line" count={3} />
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Watchlist Priority" subtitle="Ranked by urgency" className="screen-card">
        <p className="company-description negative">Watchlist ranking unavailable — {error}.</p>
      </SectionCard>
    );
  }

  if (!rows.length) {
    return (
      <SectionCard title="Watchlist Priority" subtitle="Ranked by urgency" className="screen-card">
        <p className="company-description subtle">No watchlist symbols yet. Start with a few well-known names:</p>
        <div className="taglist-row">
          {STARTER_SYMBOLS.map((symbol) => (
            <Button key={symbol} type="button" className="ghost-button" onClick={() => onAddStarter?.(symbol)}>+ {symbol}</Button>
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Watchlist Priority" subtitle="Ranked by urgency" className="screen-card">
      <div className="watchlist-priority-list">
        {rows.map((row) => (
          <button type="button" key={row.symbol} className="watchlist-priority-row" onClick={() => onOpenTicker?.(row.symbol)}>
            <div className="watchlist-priority-row__top">
              <strong>{row.symbol}</strong>
              <span className={Number(row.change || 0) >= 0 ? "positive" : "negative"}>
                {Number(row.change || 0) >= 0 ? "+" : ""}{Number(row.change || 0).toFixed(2)}%
              </span>
              <span className="score-badge">{row.overallAiScore}/100</span>
            </div>
            <p className="company-description subtle">{row.explanation || row.primaryDriver}</p>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
