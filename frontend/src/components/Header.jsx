import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button, Input } from "./ui";
import NotificationCenter from "./NotificationCenter";
import usePortfolioEngine from "../hooks/usePortfolioEngine";
// Phase X6 — fixed a broken import: this key moved to useBetaIdentity.js
// in Phase X4's identity-flow rewrite, but this file's import was never
// updated — caught by the new release validation build check (Part 2).
import { BETA_USER_LABEL_STORAGE_KEY } from "../hooks/useBetaIdentity";

// Phase H3 — Account & beta-user experience. Read once at module load
// (a resolved beta user's label never changes mid-session); falls back to
// the existing "Guest workspace" identity when no beta user is resolved,
// exactly the pre-H3 behavior.
function readBetaUserLabel() {
  try {
    return window.localStorage.getItem(BETA_USER_LABEL_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}
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

const NEW_YORK_TIME_ZONE = "America/New_York";

function newYorkDateParts(value) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NEW_YORK_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const read = (type) => parts.find((part) => part.type === type)?.value;
  return { year: Number(read("year")), month: Number(read("month")), day: Number(read("day")), hour: Number(read("hour")), minute: Number(read("minute")), weekday: read("weekday") };
}

function newYorkOffsetMinutes(value) {
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: NEW_YORK_TIME_ZONE, timeZoneName: "longOffset" })
    .formatToParts(value).find((part) => part.type === "timeZoneName")?.value || "GMT";
  const match = offset.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "+" ? minutes : -minutes;
}

function newYorkTimeToUtc({ year, month, day, hour, minute }) {
  const localTimestamp = Date.UTC(year, month - 1, day, hour, minute, 0);
  let timestamp = localTimestamp;
  for (let attempt = 0; attempt < 2; attempt += 1) timestamp = localTimestamp - newYorkOffsetMinutes(new Date(timestamp)) * 60_000;
  return timestamp;
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return [Math.floor(totalSeconds / 3600), Math.floor((totalSeconds % 3600) / 60), totalSeconds % 60]
    .map((part) => String(part).padStart(2, "0")).join(":");
}

export function getMarketSession(now = new Date()) {
  const parts = newYorkDateParts(now);
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const currentMinutes = parts.hour * 60 + parts.minute;
  const isWeekday = weekdayIndex >= 1 && weekdayIndex <= 5;
  const today = { year: parts.year, month: parts.month, day: parts.day };
  if (isWeekday && currentMinutes >= 570 && currentMinutes < 960) {
    return { isOpen: true, label: "Closes in", countdown: formatCountdown(newYorkTimeToUtc({ ...today, hour: 16, minute: 0 }) - now.getTime()) };
  }
  const daysUntilOpen = !isWeekday || currentMinutes >= 960 ? (isWeekday ? 1 : (8 - weekdayIndex) % 7 || 1) : 0;
  const nextDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysUntilOpen));
  const opensAt = newYorkTimeToUtc({ year: nextDate.getUTCFullYear(), month: nextDate.getUTCMonth() + 1, day: nextDate.getUTCDate(), hour: 9, minute: 30 });
  return { isOpen: false, label: "Opens in", countdown: formatCountdown(opensAt - now.getTime()) };
}

function Header({ watchlist = [], onQuickSearch, onNavigate }) {
  const { t, formatCurrency, locale, setLocale, availableLocales } = useI18n();
  const [query, setQuery] = useState("");
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [conversationalAnswer, setConversationalAnswer] = useState(null);
  const [isAnswerLoading, setIsAnswerLoading] = useState(false);
  const [answerError, setAnswerError] = useState("");
  const [marketSession, setMarketSession] = useState(() => getMarketSession());
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const headerRef = useRef(null);

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

  useEffect(() => {
    const timer = window.setInterval(() => setMarketSession(getMarketSession()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function closeWhenAnotherOverlayOpens(event) {
      const activeOverlay = event.detail;
      setIsQuickActionsOpen(activeOverlay === "quick-actions" ? (value) => value : false);
      setIsAccountMenuOpen(activeOverlay === "account" ? (value) => value : false);
      setIsLanguageMenuOpen(activeOverlay === "language" ? (value) => value : false);
    }
    function closeOnOutsidePointerDown(event) {
      if (!headerRef.current?.contains(event.target)) {
        setIsQuickActionsOpen(false);
        setIsAccountMenuOpen(false);
        setIsLanguageMenuOpen(false);
      }
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setIsQuickActionsOpen(false);
        setIsAccountMenuOpen(false);
        setIsLanguageMenuOpen(false);
        setConversationalAnswer(null);
        setAnswerError("");
      }
    }
    window.addEventListener("impactone:header-overlay-open", closeWhenAnotherOverlayOpens);
    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("impactone:header-overlay-open", closeWhenAnotherOverlayOpens);
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const navigateTo = useCallback((screen) => {
    onNavigate?.(screen);
    setIsQuickActionsOpen(false);
    setIsAccountMenuOpen(false);
  }, [onNavigate]);

  const submitTicker = useCallback((value) => {
    const normalized = String(value || "").trim().toUpperCase();
    if (!normalized) {
      return;
    }

    setQuery(normalized);
    onQuickSearch?.(normalized);
  }, [onQuickSearch]);

  const askConversationally = useCallback(async (value) => {
    const question = String(value || "").trim();
    if (!question) return;
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
  const betaUserLabel = readBetaUserLabel();
  const accountInitial = betaUserLabel ? betaUserLabel.trim().charAt(0).toUpperCase() : "G";

  return (
    <header ref={headerRef} className="header-bar">
      <button type="button" className="header-title-group header-title-group--home" onClick={() => onNavigate?.("Home")} aria-label="Go to home">
        <img className="impact-logo-image impact-logo-image--header" src="/brand/impactone-app-icon.png" alt="" />
        <div>
          <h2>{t("header.title")}</h2>
          <p>{t("header.subtitle")}</p>
        </div>
      </button>

      <div className={`header-market-orbit ${marketSession.isOpen ? "is-open" : "is-closed"}`} title="Regular NYSE hours only; holidays and special sessions are not included.">
        <div className="header-language-menu">
          <Button
            type="button"
            className="header-language-menu__trigger"
            aria-label="Choose display language"
            aria-expanded={isLanguageMenuOpen}
            onClick={() => { window.dispatchEvent(new CustomEvent("impactone:header-overlay-open", { detail: "language" })); setIsLanguageMenuOpen((value) => !value); }}
          >
            {locale.toUpperCase()}
          </Button>
          {isLanguageMenuOpen ? (
            <div className="header-language-menu__dropdown">
              {availableLocales.map((option) => (
                <Button
                  key={option.code}
                  type="button"
                  className={option.code === locale ? "header-language-menu__option active" : "header-language-menu__option"}
                  onClick={() => { setLocale(option.code); setIsLanguageMenuOpen(false); }}
                >
                  {option.label}
                </Button>
              ))}
              <span className="header-language-menu__option disabled" title="Hebrew translation is not available yet">עברית · בקרוב</span>
            </div>
          ) : null}
        </div>
        <span className="header-market-orbit__status">{marketSession.isOpen ? t("header.marketOpen") : t("header.marketClosed")}<i aria-hidden="true" /></span>
        <span className="header-market-orbit__countdown">{marketSession.isOpen ? t("header.closesIn") : t("header.opensIn")} <strong dir="ltr">{marketSession.countdown}</strong></span>
      </div>

      <div className="header-portfolio-glance">
        <span className="header-portfolio-glance__value">{formatCurrency(portfolioSummary?.totalValue || 0)}</span>
        <span className={dailyPnl >= 0 ? "positive" : "negative"}>
          {dailyPnl >= 0 ? "+" : ""}{formatCurrency(dailyPnl)}
        </span>
      </div>

      <div className="header-controls">
        <label className="search-box" htmlFor="company-search">
          <span className="search-box__glyph" aria-hidden="true">⌕</span>
          <Input
            id="company-search"
            type="search"
            placeholder=""
            aria-label="Search a ticker or ask a market question"
            value={query}
            onChange={(event) => {
              const raw = event.target.value;
              setQuery(looksConversational(raw) ? raw : raw.toUpperCase());
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitSearch(query);
              }
            }}
          />
          <Button type="button" className="search-submit" aria-label="Run search" title="Run search" onClick={() => submitSearch(query)}>↗</Button>
        </label>
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
        <Button
          type="button"
          className="header-icon-button"
          onClick={() => navigateTo("Alerts")}
          aria-label={alertCount ? t("header.openAlertsUnread", { count: alertCount }) : t("header.openAlertsLabel")}
        >
          🔔
          {alertCount > 0 ? <span className="header-icon-button__badge">{alertCount}</span> : null}
        </Button>

        <NotificationCenter />

        <div className="header-menu">
          <Button
            type="button"
            className="header-icon-button"
            onClick={() => { window.dispatchEvent(new CustomEvent("impactone:header-overlay-open", { detail: "quick-actions" })); setIsQuickActionsOpen((value) => !value); }}
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
            onClick={() => { window.dispatchEvent(new CustomEvent("impactone:header-overlay-open", { detail: "account" })); setIsAccountMenuOpen((value) => !value); }}
            aria-label={t("header.accountMenu")}
            title={betaUserLabel || t("header.guestWorkspace")}
          >
            {accountInitial}
          </Button>
          {isAccountMenuOpen ? (
            <div className="header-menu__dropdown">
              <div className="header-menu__label">{betaUserLabel ? `${betaUserLabel} · Private beta` : t("header.guestWorkspace")}</div>
              <Button type="button" className="header-menu__item" onClick={() => navigateTo("Settings")}>{t("nav.settings")}</Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default memo(Header);
