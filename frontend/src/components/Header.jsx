import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input } from "./ui";
import usePortfolioEngine from "../hooks/usePortfolioEngine";
import { intelligenceApi, chatApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { startVisibilityAwarePolling } from "../utils/pollWhileVisible";
import { useI18n } from "../i18n/I18nProvider";
import { trackEvent } from "../utils/analytics";
import { msSinceBoot } from "../utils/performanceTiming";

// Sprint 40 — Search must become conversational: "Should I buy Nvidia?",
// "What changed overnight?" etc., not just ticker lookup. A query is
// treated as a question (routed to chatApi.ask) rather than a ticker
// symbol if it contains whitespace or ends in "?" — real tickers are
// always a single unspaced token.
function looksConversational(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  return trimmed.includes(" ") || trimmed.endsWith("?");
}

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
  const { t, formatCurrency } = useI18n();
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [conversationalAnswer, setConversationalAnswer] = useState(null);
  const [isAnswerLoading, setIsAnswerLoading] = useState(false);
  const [answerError, setAnswerError] = useState("");

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
    setIsSearchFocused(false);
    onQuickSearch?.(normalized);
  }, [onQuickSearch]);

  const askConversationally = useCallback(async (value) => {
    const question = String(value || "").trim();
    if (!question) return;
    setIsSearchFocused(false);
    setConversationalAnswer(null);
    setAnswerError("");
    setIsAnswerLoading(true);
    // Sprint 40 — a real interaction-latency measurement (question submit
    // to answer received), not just that the feature was used.
    const startedAt = msSinceBoot();
    try {
      const result = await chatApi.ask({ question });
      setConversationalAnswer({ question, answer: result.answer || result.response || "No answer was returned." });
    } catch (error) {
      logError("conversational search failed", error);
      setAnswerError("Couldn't get an answer right now — try a plain ticker symbol instead.");
    } finally {
      // Fires once per real attempt regardless of outcome, so usage rate
      // and latency both reflect every real question asked, not just
      // successful ones.
      trackEvent("search_conversational_used", { durationMs: msSinceBoot() - startedAt });
      setIsAnswerLoading(false);
    }
  }, []);

  const submitSearch = useCallback((value) => {
    if (looksConversational(value)) {
      askConversationally(value);
    } else {
      submitTicker(value);
    }
  }, [askConversationally, submitTicker]);

  const dailyPnl = Number(portfolioSummary?.dailyPnl || 0);

  return (
    <header className="header-bar">
      <div className="header-title-group">
        <h2>{t("header.title")}</h2>
        <p>{t("header.subtitle")}</p>
      </div>

      <div className="header-portfolio-glance">
        <span className="header-portfolio-glance__value">{formatCurrency(portfolioSummary?.totalValue || 0)}</span>
        <span className={dailyPnl >= 0 ? "positive" : "negative"}>
          {dailyPnl >= 0 ? "+" : ""}{formatCurrency(dailyPnl)}
        </span>
      </div>

      <div className="header-controls">
        <label className="search-box" htmlFor="company-search">
          <span aria-hidden="true">🔎</span>
          <Input
            id="company-search"
            type="text"
            placeholder={t("header.searchPlaceholder")}
            value={query}
            onChange={(event) => {
              const raw = event.target.value;
              setQuery(looksConversational(raw) ? raw : raw.toUpperCase());
            }}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitSearch(query);
              }
            }}
          />
          <Button type="button" className="search-submit" onClick={() => submitSearch(query)}>{t("header.searchGo")}</Button>
        </label>
        {isSearchFocused && !looksConversational(query) && suggestions.length ? (
          <div className="header-autocomplete">
            {suggestions.map((symbol) => (
              <Button key={symbol} type="button" className="header-suggestion" onClick={() => submitTicker(symbol)}>
                {symbol}
              </Button>
            ))}
          </div>
        ) : null}
        {isAnswerLoading || conversationalAnswer || answerError ? (
          <div className="header-autocomplete header-conversational-answer">
            {isAnswerLoading ? (
              <p className="company-description subtle">Thinking…</p>
            ) : answerError ? (
              <p className="company-description negative">{answerError}</p>
            ) : (
              <>
                <p className="company-description subtle">"{conversationalAnswer.question}"</p>
                <p className="company-description">{conversationalAnswer.answer}</p>
                <Button type="button" className="ghost-button" onClick={() => { setConversationalAnswer(null); setQuery(""); }}>Dismiss</Button>
              </>
            )}
          </div>
        ) : null}
        <div className="market-pill">{t("header.marketOpen")} 🟢</div>

        <Button
          type="button"
          className="header-icon-button"
          onClick={() => navigateTo("Alerts")}
          aria-label={alertCount ? t("header.openAlertsUnread", { count: alertCount }) : t("header.openAlertsLabel")}
        >
          🔔
          {alertCount > 0 ? <span className="header-icon-button__badge">{alertCount}</span> : null}
        </Button>

        <div className="header-menu">
          <Button
            type="button"
            className="header-icon-button"
            onClick={() => setIsQuickActionsOpen((value) => !value)}
            aria-label={t("header.quickActions")}
          >
            ⚡
          </Button>
          {isQuickActionsOpen ? (
            <div className="header-menu__dropdown">
              <Button type="button" className="header-menu__item" onClick={() => navigateTo("Home")}>{t("header.openDashboard")}</Button>
              <Button type="button" className="header-menu__item" onClick={() => navigateTo("Portfolio")}>{t("header.openPortfolio")}</Button>
              <Button type="button" className="header-menu__item" onClick={() => navigateTo("Alerts")}>{t("header.openAlerts")}</Button>
            </div>
          ) : null}
        </div>

        <div className="header-menu">
          <Button
            type="button"
            className="header-icon-button header-avatar"
            onClick={() => setIsAccountMenuOpen((value) => !value)}
            aria-label={t("header.accountMenu")}
            title={t("header.guestWorkspace")}
          >
            G
          </Button>
          {isAccountMenuOpen ? (
            <div className="header-menu__dropdown">
              <div className="header-menu__label">{t("header.guestWorkspace")}</div>
              <Button type="button" className="header-menu__item" onClick={() => navigateTo("Settings")}>{t("nav.settings")}</Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default memo(Header);
