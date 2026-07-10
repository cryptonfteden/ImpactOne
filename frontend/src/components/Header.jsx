import { memo, useCallback, useMemo, useState } from "react";
import { Button, Input } from "./ui";

const CORE_SYMBOLS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "GOOGL",
  "META",
  "TSLA",
  "PLTR",
  "AMD",
  "NFLX",
  "AVGO",
  "JPM",
  "V",
  "MA",
  "COST",
];

function Header({ watchlist = [], onQuickSearch }) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    const merged = Array.from(new Set([...(watchlist || []), ...CORE_SYMBOLS]));
    const normalizedQuery = query.trim().toUpperCase();
    if (!normalizedQuery) {
      return merged.slice(0, 8);
    }

    return merged.filter((symbol) => symbol.startsWith(normalizedQuery)).slice(0, 8);
  }, [query, watchlist]);

  const submitTicker = useCallback((value) => {
    const normalized = String(value || "").trim().toUpperCase();
    if (!normalized) {
      return;
    }

    setQuery(normalized);
    onQuickSearch?.(normalized);
  }, [onQuickSearch]);

  return (
    <header className="header-bar">
      <div className="header-title-group">
        <h2>ImpactOne Terminal</h2>
        <p>Live intelligence workspace</p>
      </div>

      <div className="header-controls">
        <label className="search-box" htmlFor="company-search">
          <span aria-hidden="true">🔎</span>
          <Input
            id="company-search"
            type="text"
            placeholder="Search ticker..."
            value={query}
            onChange={(event) => setQuery(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitTicker(query);
              }
            }}
          />
          <Button type="button" className="search-submit" onClick={() => submitTicker(query)}>Go</Button>
        </label>
        {suggestions.length ? (
          <div className="header-autocomplete">
            {suggestions.map((symbol) => (
              <Button key={symbol} type="button" className="header-suggestion" onClick={() => submitTicker(symbol)}>
                {symbol}
              </Button>
            ))}
          </div>
        ) : null}
        <div className="market-pill">Market: Open 🟢</div>
      </div>
    </header>
  );
}

export default memo(Header);