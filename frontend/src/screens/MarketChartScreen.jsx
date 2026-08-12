import { useEffect, useState } from "react";
import AdvancedChart from "../components/chart/AdvancedChart";
import { Button } from "../components/ui";
import { useI18n } from "../i18n/I18nProvider";

const DEFAULT_SYMBOL = "SPY";

/**
 * A dedicated, mobile-reachable home for the app's existing professional
 * chart. AdvancedChart renders only genuine OHLCV bars from the configured
 * market provider; this screen deliberately adds no illustrative series.
 */
export default function MarketChartScreen() {
  const { t } = useI18n();
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [draftSymbol, setDraftSymbol] = useState(DEFAULT_SYMBOL);
  const [chartHeight, setChartHeight] = useState(640);
  // Chart is the primary workspace, so it opens in terminal mode by default.
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // The canvas gets the viewport remainder after the symbol bar, quote row
    // and tool rail. Keeping this exact prevents a stretched empty container
    // below a shorter canvas on tall phones.
    const updateHeight = () => setChartHeight(Math.max(480, window.innerHeight - (isExpanded ? 166 : 188)));
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [isExpanded]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function openSymbol(event) {
    event.preventDefault();
    const normalized = String(draftSymbol || "").trim().toUpperCase();
    if (!/^[A-Z.\-]{1,12}$/.test(normalized)) return;
    setSymbol(normalized);
  }

  function selectSymbol(nextSymbol) {
    setDraftSymbol(nextSymbol);
    setSymbol(nextSymbol);
  }

  return (
    <div className={`screen-page market-chart-screen${isExpanded ? " market-chart-screen--expanded" : ""}`}>
      <section className="market-chart-screen__hero">
        <div>
          <p className="eyebrow">Trading workspace</p>
          <h1>Live market chart</h1>
          <p className="subtext">Candles, volume, crosshair, pan and zoom — based on live market data.</p>
        </div>
        <form className="market-chart-screen__symbol-form" onSubmit={openSymbol}>
          <div className="market-chart-screen__command-deck">
            <div className="market-chart-screen__command-label">
              <span className="market-chart-screen__search-glyph" aria-hidden="true">⌕</span>
              <label htmlFor="market-chart-symbol">Search market</label>
              <span className="market-chart-screen__command-status"><i /> Live lookup</span>
            </div>
            <div className="market-chart-screen__command-control">
              <input
                id="market-chart-symbol"
                value={draftSymbol}
                onChange={(event) => setDraftSymbol(event.target.value.toUpperCase())}
                placeholder="Enter a ticker — AAPL"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={12}
                aria-label="Search ticker symbol"
              />
              <Button type="submit" className="primary-button market-chart-screen__open-symbol">
                <span>{t("core.open")}</span><b aria-hidden="true">↗</b>
              </Button>
            </div>
            <div className="market-chart-screen__quick-symbols" aria-label="Popular symbols">
              <span>Quick jump</span>
              {["SPY", "AAPL", "NVDA", "TSLA"].map((quickSymbol) => (
                <button key={quickSymbol} type="button" onClick={() => selectSymbol(quickSymbol)}>{quickSymbol}</button>
              ))}
            </div>
          </div>
        </form>
        <button
          type="button"
          className="market-chart-screen__expand"
          onClick={() => setIsExpanded((value) => !value)}
          aria-label={isExpanded ? "Exit expanded chart" : "Expand chart"}
        >
          {isExpanded ? "Close" : "Expand"}
        </button>
      </section>

      <section className="market-chart-screen__terminal" aria-label={`${symbol} market chart`}>
        <div className="market-chart-screen__terminal-head">
          <div>
            <span className="market-chart-screen__live-dot" aria-hidden="true" />
            <strong>{symbol}</strong>
            <span>Live OHLCV</span>
          </div>
          <span>Drag to pan · Scroll to zoom</span>
        </div>
        <AdvancedChart symbol={symbol} height={chartHeight} initialRange="1mo" />
      </section>
    </div>
  );
}
