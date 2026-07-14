import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input } from "./ui";
import usePortfolioEngine from "../hooks/usePortfolioEngine";
import { intelligenceApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { startVisibilityAwarePolling } from "../utils/pollWhileVisible";

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

function Header({ watchlist = [], onQuickSearch, onNavigate }) {
  const [query, setQuery] = useState("");
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  // Sprint 15 Top App Bar (spec §4.1): portfolio value + daily P/L, reusing
  // the Sprint 14 server-owned engine already fetched elsewhere.
  const { summary: portfolioSummary } = usePortfolioEngine();

  useEffect(() => {
    let cancelled = false;

    async function loadAlertCount() {
      try {
        const payload = await intelligenceApi.liveFeed({ watchlist: watchlist.length ? watchlist : ["AAPL", "NVDA", "TSLA"] });
        if (!cancelled) {
          setAlertCount((payload.alerts || []).length);
        }
      } catch (error) {
        logError("Header alert count load failed", error);
      }
    }

    loadAlertCount();
    const stopPolling = startVisibilityAwarePolling(loadAlertCount, 60000);
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [watchlist]);

  const navigateTo = useCallback((screen) => {
    onNavigate?.(screen);
    setIsQuickActionsOpen(false);
    setIsAccountMenuOpen(false);
  }, [onNavigate]);

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

      <div className="header-portfolio-glance">
        <span className="header-portfolio-glance__value">${Number(portfolioSummary?.totalValue || 0).toLocaleString()}</span>
        <span className={Number(portfolioSummary?.dailyPnl || 0) >= 0 ? "positive" : "negative"}>
          {Number(portfolioSummary?.dailyPnl || 0) >= 0 ? "+" : ""}${Number(portfolioSummary?.dailyPnl || 0).toFixed(2)}
        </span>
      </div>

      <div className="header-controls">
        <label className="search-box" htmlFor="company-search">
          <span aria-hidden="true">🔎</span>
          <Input
            id="company-search"
            type="text"
            placeholder="Ask about a ticker, portfolio, or market event"
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

        <Button
          type="button"
          className="header-icon-button"
          onClick={() => navigateTo("Alerts")}
          aria-label={`Open alerts${alertCount ? ` (${alertCount} unread)` : ""}`}
        >
          🔔
          {alertCount > 0 ? <span className="header-icon-button__badge">{alertCount}</span> : null}
        </Button>

        <div className="header-menu">
          <Button
            type="button"
            className="header-icon-button"
            onClick={() => setIsQuickActionsOpen((value) => !value)}
            aria-label="Quick actions"
          >
            ⚡
          </Button>
          {isQuickActionsOpen ? (
            <div className="header-menu__dropdown">
              <Button type="button" className="header-menu__item" onClick={() => navigateTo("Dashboard")}>Open Dashboard</Button>
              <Button type="button" className="header-menu__item" onClick={() => navigateTo("Portfolio")}>Open Portfolio</Button>
              <Button type="button" className="header-menu__item" onClick={() => navigateTo("Alerts")}>Open Alerts</Button>
            </div>
          ) : null}
        </div>

        <div className="header-menu">
          <Button
            type="button"
            className="header-icon-button header-avatar"
            onClick={() => setIsAccountMenuOpen((value) => !value)}
            aria-label="Account menu — Guest workspace"
            title="Guest workspace"
          >
            G
          </Button>
          {isAccountMenuOpen ? (
            <div className="header-menu__dropdown">
              <div className="header-menu__label">Guest workspace</div>
              <Button type="button" className="header-menu__item" onClick={() => navigateTo("Settings")}>Settings</Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default memo(Header);