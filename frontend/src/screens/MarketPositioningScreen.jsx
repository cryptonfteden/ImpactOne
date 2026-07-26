import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { Button, EmptyState, ErrorState, LoadingSpinner } from "../components/ui";
import { marketPositioningApi } from "../services/api";
import { openSymbolPanel } from "../utils/symbolPanel";
import { logError } from "../utils/errorHandling";

// Phase X2 — a representative, configurable default universe. Real
// production usage would source this from watchlists/holdings; kept as a
// simple static list here since the ranking engine itself (not universe
// sourcing) is this phase's actual deliverable.
const DEFAULT_UNIVERSE = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AMD", "NFLX", "AVGO", "JPM", "XOM"];

function PressureRow({ entry }) {
  return (
    <div className="alert-row">
      <span className={entry.direction === "LONG_PRESSURE" ? "pill opportunity" : "pill risk"}>
        {entry.direction === "LONG_PRESSURE" ? "Long" : "Short"}
      </span>
      <button type="button" className="ghost-button" onClick={() => openSymbolPanel(entry.symbol)}>
        <strong>{entry.symbol}</strong>
      </button>
      <span className="company-description subtle">
        momentum {entry.momentumPct !== null ? `${entry.momentumPct.toFixed(1)}%` : "—"}
      </span>
      <span className="alert-row__price">${entry.price !== null ? entry.price.toFixed(2) : "—"}</span>
    </div>
  );
}

/**
 * Phase X2 — Market Positioning. Real LONG PRESSURE / SHORT PRESSURE
 * rankings from marketPositioningService.js — never fabricated. Short
 * interest, long interest, and float are honestly disclosed as
 * unavailable rather than invented (see MARKET_POSITIONING_SPEC.md).
 */
export default function MarketPositioningScreen() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    marketPositioningApi
      .getPositioning(DEFAULT_UNIVERSE)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((loadError) => {
        logError("market positioning load failed", loadError);
        if (!cancelled) setError("Couldn't load Market Positioning right now.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="screen-page">
        <SectionCard title="Market Positioning" className="screen-card">
          <LoadingSpinner label="Ranking the universe" />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Command Center — Market Positioning</p>
          <h1>Long Pressure &amp; Short Pressure</h1>
          <p className="subtext">
            A real, computed ranking — momentum, relative volume, and liquidity, weighted honestly. Not simply
            "highest short interest": short interest and long interest have no real data source in this environment
            and are excluded, never fabricated.
          </p>
        </div>
      </section>

      {error ? <ErrorState message={error} /> : null}

      {data?.unavailableFactors?.length ? (
        <p className="company-description subtle negative">
          Unavailable this session: {data.unavailableFactors.map((factor) => factor.factor).join(", ")} — see each
          entry below for why.
        </p>
      ) : null}

      <div className="screen-grid">
        <SectionCard title="Long Pressure" subtitle="Ranked by real momentum, volume, and liquidity" className="screen-card">
          {data?.longPressure?.length ? (
            <div className="folder-card__symbols">
              {data.longPressure.map((entry) => <PressureRow key={entry.symbol} entry={entry} />)}
            </div>
          ) : (
            <EmptyState message="No symbols currently show real long pressure in this universe." />
          )}
        </SectionCard>

        <SectionCard title="Short Pressure" subtitle="Ranked by real momentum, volume, and liquidity" className="screen-card">
          {data?.shortPressure?.length ? (
            <div className="folder-card__symbols">
              {data.shortPressure.map((entry) => <PressureRow key={entry.symbol} entry={entry} />)}
            </div>
          ) : (
            <EmptyState message="No symbols currently show real short pressure in this universe." />
          )}
        </SectionCard>
      </div>

      {data?.excludedFromUniverse?.length ? (
        <SectionCard title="Excluded From Universe" subtitle="Filtered honestly, never fabricated" className="screen-card">
          <div className="folder-card__symbols">
            {data.excludedFromUniverse.map((entry) => (
              <div key={entry.symbol} className="folder-symbol-row">
                <strong>{entry.symbol}</strong>
                <span className="company-description subtle">{entry.reason}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
