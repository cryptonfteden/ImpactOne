import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import useWatchlist from "../hooks/useWatchlist";
import { Button, EmptyState, ErrorState, Input } from "../components/ui";
import { watchlistApi, claimsApi, optionsAgentApi } from "../services/api";
import { logError } from "../utils/errorHandling";

function MiniSparkline({ change = 0, score = 50 }) {
  const direction = Number(change || 0) >= 0 ? 1 : -1;
  const volatility = Math.max(2, Math.round(Math.abs(Number(change || 0)) * 2));
  const base = 24;
  const points = [
    base - direction * 2,
    base + direction * 1,
    base - direction * volatility,
    base + direction * 2,
    base - direction * Math.round((Number(score || 50) - 50) / 12),
    base - direction * (volatility + 3),
  ];

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${index * 18} ${point}`).join(" ");

  return (
    <svg viewBox="0 0 90 48" className="mini-sparkline" aria-hidden="true">
      <path d={path} className={direction > 0 ? "mini-sparkline__line up" : "mini-sparkline__line down"} />
    </svg>
  );
}

export default function WatchlistScreen() {
  const { watchlist, addTicker, removeTicker } = useWatchlist();
  const [rows, setRows] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [tickerInput, setTickerInput] = useState("");
  const [attentionBySymbol, setAttentionBySymbol] = useState({});
  const [attentionScoreBySymbol, setAttentionScoreBySymbol] = useState({});

  useEffect(() => {
    async function loadWatchlistIntelligence() {
      if (!watchlist.length) {
        setRows([]);
        setErrorMessage("");
        return;
      }

      try {
        const data = await watchlistApi.getIntelligence(watchlist);
        setRows(data.watchlist || []);
        setErrorMessage("");
      } catch (error) {
        logError("Watchlist load failed", error);
        setRows([]);
        setErrorMessage("Unable to load watchlist intelligence.");
      }
    }

    loadWatchlistIntelligence();
  }, [watchlist]);

  // Phase UI-INTEGRATION-001 — "why does this symbol deserve attention
  // today," per symbol. Additive and independent of the main intelligence
  // load above — a slow/failed fetch here never blocks the watchlist
  // itself from rendering. Every reason is a real, already-computed fact
  // (a real Claim status, a real active options signal) — never a
  // fabricated "something is happening" placeholder; a symbol with none
  // of these honestly shows "Nothing new today."
  //
  // Phase PRODUCT-001 — the mission requires ranking by Attention Score,
  // not price movement. Each Claim already carries a real, canonical
  // attentionScore (computed server-side by the Attention Engine); this
  // screen takes the max real score across a symbol's claims as that
  // symbol's rank — a presentation-only aggregation over already-real,
  // already-scored data, never a new score computed here.
  useEffect(() => {
    let cancelled = false;
    async function loadAttention() {
      const entries = await Promise.all(
        watchlist.map(async (symbol) => {
          const reasons = [];
          let maxAttentionScore = 0;
          try {
            const claimsResult = await claimsApi.listBySymbol(symbol, { limit: 20 });
            const claims = claimsResult.claims || [];
            if (claims.some((claim) => claim.status === "DRAFT")) reasons.push("New claim");
            if (claims.some((claim) => claim.status === "STRENGTHENING")) reasons.push("Strengthening claim");
            if (claims.some((claim) => claim.status === "WEAKENING")) reasons.push("Weakening claim");
            maxAttentionScore = claims.reduce((max, claim) => Math.max(max, claim.attentionScore ?? 0), 0);
          } catch {
            // Additive — a failed claims lookup for one symbol never blocks the others.
          }
          try {
            const optionsView = await optionsAgentApi.getSymbolView(symbol);
            if (!optionsView.unavailable && optionsView.activeSignalCount > 0) reasons.push("Unusual options activity");
          } catch {
            // Additive — same isolation as above.
          }
          return [symbol, { reasons, attentionScore: maxAttentionScore }];
        })
      );
      if (!cancelled) {
        setAttentionBySymbol(Object.fromEntries(entries.map(([symbol, data]) => [symbol, data.reasons])));
        setAttentionScoreBySymbol(Object.fromEntries(entries.map(([symbol, data]) => [symbol, data.attentionScore])));
      }
    }
    if (watchlist.length) loadAttention();
    else {
      setAttentionBySymbol({});
      setAttentionScoreBySymbol({});
    }
    return () => {
      cancelled = true;
    };
  }, [watchlist]);

  const handleAddTicker = () => {
    const normalized = tickerInput.trim().toUpperCase();
    if (!normalized) {
      return;
    }
    addTicker(normalized);
    setTickerInput("");
  };

  const openTicker = (ticker) => {
    window.dispatchEvent(new CustomEvent("impactone:select-ticker", { detail: ticker }));
  };

  // Phase PRODUCT-001 — rank by real Attention Score, not price movement
  // alone. Presentation-only sort over the real, already-scored data
  // above; ties (including "no score loaded yet") keep the original
  // AI-ranked order from watchlistApi rather than reshuffling arbitrarily.
  const rankedRows = [...rows].sort((rowA, rowB) => (attentionScoreBySymbol[rowB.symbol] ?? 0) - (attentionScoreBySymbol[rowA.symbol] ?? 0));

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Watchlist</p>
          <h1>Professional watchlist intelligence</h1>
          <p className="subtext">
            Review conviction, movement, and alerts in one premium card view.
          </p>
        </div>
      </section>

      <SectionCard title="Watchlist" subtitle="AI-ranked symbols" icon="◈" className="screen-card">
        <div className="analysis-search">
          <Input
            value={tickerInput}
            onChange={(event) => setTickerInput(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleAddTicker();
              }
            }}
            placeholder="Add ticker (e.g. AAPL)"
          />
          <Button type="button" onClick={handleAddTicker}>Add</Button>
        </div>
        <div className="company-description subtle">Tracked tickers: {watchlist.length}</div>

        {rankedRows.length ? (
          <div className="watchlist-premium-grid">
            {rankedRows.map((item) => (
              <article key={item.symbol} className="watch-card-premium">
                <div className="watch-card-premium__top">
                  <Button type="button" className="favorite-item favorite-item--inline" onClick={() => openTicker(item.symbol)}>
                    {item.symbol}
                  </Button>
                  <span className="score-badge">Attention {Number(attentionScoreBySymbol[item.symbol] || 0)}/100</span>
                </div>

                <div className="watch-card-premium__company">{item.company}</div>

                <div className="watch-card-premium__metrics">
                  <div>
                    <span>Price</span>
                    <strong>${Number(item.price || 0).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>Move</span>
                    <strong className={Number(item.change || 0) >= 0 ? "positive" : "negative"}>
                      {Number(item.change || 0) >= 0 ? "+" : ""}{Number(item.change || 0).toFixed(2)}%
                    </strong>
                  </div>
                  <div>
                    <span>AI Rating</span>
                    <strong>{item.aiRating || "Hold"}</strong>
                  </div>
                </div>

                <MiniSparkline change={Number(item.change || 0)} score={Number(item.aiScore || 0)} />

                <div className="company-description subtle watch-card-premium__attention">
                  {attentionBySymbol[item.symbol]?.length ? `Why today: ${attentionBySymbol[item.symbol].join(", ")}` : "Nothing new today."}
                </div>

                <div className="watch-card-premium__footer">
                  <span className={`alert-badge ${item.alertBadge?.type || "monitor"}`}>{item.alertBadge?.label || "Monitor"}</span>
                  <div className="watch-card-premium__actions">
                    <Button type="button" className="ghost-button" onClick={() => openTicker(item.symbol)}>Analyze</Button>
                    <Button type="button" className="ghost-button" onClick={() => removeTicker(item.symbol)}>Remove</Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          errorMessage
            ? <ErrorState message={errorMessage} />
            : <EmptyState message="No watchlist symbols yet. Add tickers to generate premium watch intelligence." />
        )}
      </SectionCard>
    </div>
  );
}
