import { Skeleton } from "../ui";
import { SafeValue } from "../SafeValue";

/**
 * Spec §4.2 Market Context Strip — a thin frame the user gets before any
 * deeper dashboard content: market status, major index moves, and the
 * macro/key-event context already computed elsewhere in the app.
 */
export default function MarketContextStrip({ isLoading, error, marketStatus, indices = [], macroLine, keyEvent }) {
  if (isLoading) {
    return (
      <div className="market-context-strip">
        <Skeleton variant="line" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="market-context-strip market-context-strip--error">
        <span>Market status unavailable — {error}</span>
      </div>
    );
  }

  return (
    <div className="market-context-strip">
      <span className="market-context-strip__status">
        <span className="market-pill">{marketStatus || "Market status unavailable"}</span>
      </span>
      <span className="market-context-strip__indices">
        {indices.length
          ? indices.map((index) => (
            <span key={index.symbol} className={Number(index.changePercent || 0) >= 0 ? "positive" : "negative"}>
              {index.label} {Number(index.changePercent || 0) >= 0 ? "+" : ""}{Number(index.changePercent || 0).toFixed(2)}%
            </span>
          ))
          : <span className="company-description subtle">Index data unavailable</span>}
      </span>
      <span className="market-context-strip__event">
        <SafeValue value={keyEvent || macroLine || "No dominant macro event."} />
      </span>
    </div>
  );
}
