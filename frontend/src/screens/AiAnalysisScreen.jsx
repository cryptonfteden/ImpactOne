import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { SafeList, SafeValue } from "../components/SafeValue";
import useWatchlist from "../hooks/useWatchlist";
import { Button, Input, LoadingSpinner, EmptyState } from "../components/ui";
import { altDataApi, analysisApi, intelligenceApi, marketApi, performanceMetricsApi, claimsApi, agentOrchestratorApi } from "../services/api";
import { logError } from "../utils/errorHandling";

const SHORT_VOLUME_RANGES = [
  { id: "15M", label: "15m", sessions: 0 },
  { id: "4H", label: "4h", sessions: 0 },
  { id: "1D", label: "Day", sessions: 1 },
  { id: "1W", label: "Week", sessions: 5 },
  { id: "1M", label: "Month", sessions: 20 },
  { id: "3M", label: "3 months", sessions: 60 },
  { id: "1Y", label: "Year", sessions: 252 },
];

function formatSignalVolume(value) {
  return Number.isFinite(Number(value)) ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value)) : "--";
}

function getShortVolumeRange(signal, rangeId) {
  if (!signal?.available) return { available: false, reason: signal?.reason || "FINRA short-volume data is unavailable." };
  const range = SHORT_VOLUME_RANGES.find((item) => item.id === rangeId) || SHORT_VOLUME_RANGES[1];
  if (range.sessions === 0) {
    return { available: false, reason: "FINRA publishes short-volume data by trading day, not intraday." };
  }
  const history = Array.isArray(signal.dailyHistory) && signal.dailyHistory.length ? signal.dailyHistory : [{
    date: signal.date,
    shortVolume: signal.shortVolume,
    nonShortVolume: signal.nonShortVolume,
    totalVolume: signal.totalVolume,
  }];
  if (history.length < range.sessions) {
    return { available: false, reason: `Only ${history.length} verified trading sessions are currently available; ${range.label.toLowerCase()} needs ${range.sessions}.` };
  }
  const rows = history.slice(-range.sessions);
  return {
    available: true,
    label: range.label,
    date: rows.at(-1)?.date,
    sessions: rows.length,
    shortVolume: rows.reduce((total, row) => total + Number(row.shortVolume || 0), 0),
    nonShortVolume: rows.reduce((total, row) => total + Number(row.nonShortVolume || 0), 0),
  };
}

export default function AiAnalysisScreen() {
  const [searchTicker, setSearchTicker] = useState("NVDA");
  const [ticker, setTicker] = useState("NVDA");
  const [quote, setQuote] = useState(null);
  const [company, setCompany] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [recommendationTrend, setRecommendationTrend] = useState(null);
  const [news, setNews] = useState([]);
  const [chart, setChart] = useState([]);
  const [fearGreed, setFearGreed] = useState(null);
  const [snapshotSignals, setSnapshotSignals] = useState(null);
  const [shortVolumeRange, setShortVolumeRange] = useState("1D");
  const [shortVolumeHistory, setShortVolumeHistory] = useState(null);
  const [isShortVolumeLoading, setIsShortVolumeLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("ai-overview");
  const [aiReport, setAiReport] = useState(null);
  const [aiNotice, setAiNotice] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLastUpdated, setAiLastUpdated] = useState("");
  const [comparisonRows, setComparisonRows] = useState([]);
  const [comparisonError, setComparisonError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Searching live market data...");
  const [errorMessage, setErrorMessage] = useState("");
  const [altSignals, setAltSignals] = useState(null);
  const [altSignalsError, setAltSignalsError] = useState("");
  const [intelligenceReport, setIntelligenceReport] = useState(null);
  const [intelligenceError, setIntelligenceError] = useState("");
  // Sprint 41 — Committee Unification: the ONE committee's coordinator
  // summary and CIO summary (intelligenceCommitteeService), never an
  // independent decision — only debate context (per-member evidence,
  // agreement/disagreement, CIO thesis).
  const [committee, setCommittee] = useState(null);
  const [cio, setCio] = useState(null);
  const [committeeError, setCommitteeError] = useState("");
  // Phase UI-INTEGRATION-001 — the Claims-Based Analysis section below is
  // generated entirely from this real Claims fetch, never from the
  // separate OpenAI-backed AI Report above. An honest empty state shows
  // when no active claim exists for this symbol yet.
  const [claims, setClaims] = useState([]);
  const [claimsError, setClaimsError] = useState("");
  const [agentIntelligence, setAgentIntelligence] = useState(null);
  const [cotReport, setCotReport] = useState(null);

  const { watchlist, toggleTicker } = useWatchlist();

  useEffect(() => {
    const handleTickerSelection = (event) => {
      const nextTicker = event.detail?.toUpperCase();
      if (nextTicker) {
        setSearchTicker(nextTicker);
        setTicker(nextTicker);
      }
    };

    window.addEventListener("impactone:select-ticker", handleTickerSelection);
    return () => window.removeEventListener("impactone:select-ticker", handleTickerSelection);
  }, []);

  // Keep the global market-sentiment dial current even when Fast Refresh
  // preserves an older screen state after a backend or UI update.
  useEffect(() => {
    let active = true;
    async function refreshFearGreed() {
      try {
        const payload = await marketApi.getQuote(ticker.toUpperCase());
        if (active && payload?.fearGreed) setFearGreed(payload.fearGreed);
      } catch {
        // The existing quote request owns user-facing error reporting.
      }
    }
    refreshFearGreed();
    const timer = window.setInterval(refreshFearGreed, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [ticker]);

  // The primary quote stays fast with the latest month of verified FINRA
  // sessions. Longer windows load only when the investor selects them.
  useEffect(() => {
    const range = SHORT_VOLUME_RANGES.find((item) => item.id === shortVolumeRange);
    if (!range || range.sessions <= 20) {
      setShortVolumeHistory(null);
      setIsShortVolumeLoading(false);
      return undefined;
    }

    let active = true;
    setShortVolumeHistory(null);
    setIsShortVolumeLoading(true);
    marketApi.getShortVolumeRange(ticker.toUpperCase(), range.sessions)
      .then((payload) => {
        if (active) setShortVolumeHistory(payload?.available ? payload : null);
      })
      .catch(() => {
        if (active) setShortVolumeHistory(null);
      })
      .finally(() => {
        if (active) setIsShortVolumeLoading(false);
      });
    return () => { active = false; };
  }, [ticker, shortVolumeRange]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-145px 0px -52% 0px", threshold: [0.05, 0.25, 0.5] },
    );
    const sections = document.querySelectorAll(".analysis-section-block[id]");
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAnalysis() {
      const normalizedTicker = ticker.toUpperCase();
      setIsLoading(true);
      setStatusMessage("Searching live market data...");
      setErrorMessage("");
      setComparisonError("");
      setAiError("");
      setCommitteeError("");

      try {
        const quoteData = await marketApi.getQuote(normalizedTicker);

        if (isMounted) {
          if (quoteData.error) {
            setQuote(null);
            setCompany(null);
            setRecommendation(null);
            setRecommendationTrend(null);
            setNews([]);
            setChart([]);
            setFearGreed(null);
            setAiReport(null);
            setAiNotice("");
            setAiLastUpdated("");
            setComparisonRows([]);
            setClaims([]);
            setClaimsError("");
            setAgentIntelligence(null);
            setCotReport(null);
            setErrorMessage(quoteData.error || "Unable to load live stock analysis from Finnhub right now.");
            setStatusMessage("Live market data request failed.");
            return;
          }

          setQuote(quoteData.quote || null);
          setCompany(quoteData.company || null);
          setRecommendation(quoteData.recommendation || null);
          setRecommendationTrend(quoteData.recommendationTrend || null);
          setNews(quoteData.news || []);
          setChart(quoteData.chart || []);
          setFearGreed(quoteData.fearGreed || null);
          setSnapshotSignals(quoteData.snapshotSignals || null);
          setComparisonRows([]);
          setAiNotice("");
          setAiLastUpdated("");
          setErrorMessage("");
          setStatusMessage(quoteData.quote?.companyDescription ? "Live market data loaded" : "Live market data loaded");

          const eventHint = quoteData.news?.[0]?.headline || `${normalizedTicker} earnings`;
          // Phase X9 — Part 6, Performance Monitoring. Real elapsed time
          // for the real AI analysis call — reported fire-and-forget.
          const aiCallStart = performance.now();
          const [aiResponse, compareResponse, altResponse, intelligenceResponse, claimsResponse, agentResponse, cotResponse] = await Promise.allSettled([
            analysisApi.analyze({
                symbol: normalizedTicker,
                context: {
                  quote: quoteData.quote || null,
                  company: quoteData.company || null,
                  recommendation: quoteData.recommendation || null,
                  recommendationTrend: quoteData.recommendationTrend || null,
                  news: quoteData.news || [],
                  chart: quoteData.chart || [],
                  fearGreed: quoteData.fearGreed || null,
                  metrics: quoteData.quote || null,
                },
              }),
            analysisApi.compare(normalizedTicker),
            altDataApi.getSummary(normalizedTicker),
            intelligenceApi.analyze({ event: eventHint, symbol: normalizedTicker }),
            claimsApi.listBySymbol(normalizedTicker, { limit: 50 }),
            agentOrchestratorApi.getStockIntelligence(normalizedTicker),
            altDataApi.getCot(normalizedTicker),
          ]);
          performanceMetricsApi.recordClientTiming("aiResponse", performance.now() - aiCallStart).catch(() => {});

          // Phase X5 — Part 7, Private Beta Polish. Raw rejection messages
          // are logged for diagnostics, never carried into state that
          // reaches an investor's screen — see the friendly-only fallbacks
          // below (no more `X.error ||` leaking a caught error.message).
          if (aiResponse.status === "rejected") logError("AI analysis request failed", aiResponse.reason);
          if (compareResponse.status === "rejected") logError("Comparison request failed", compareResponse.reason);
          const aiData = aiResponse.status === "fulfilled" ? aiResponse.value || {} : {};
          const compareData = compareResponse.status === "fulfilled" ? compareResponse.value || {} : {};

          if (isMounted) {
            if (aiData.analysis) {
              setAiReport(aiData.analysis || null);
              setAiNotice(aiData.analysis?.providerNotice || "");
              setAiError("");
              const updatedAt = new Date().toLocaleString();
              setAiLastUpdated(updatedAt);
              if (typeof window !== "undefined") {
                const latestAnalyzed = {
                  symbol: normalizedTicker,
                  updatedAt,
                  rating: aiData.analysis?.investmentRating || "Hold",
                  // Phase LIVE-DATA-INTEGRATION-001 — real bug fix: previously
                  // defaulted to a literal 0 (a fabricated confidence reading)
                  // whenever the real value was genuinely absent; now stores an
                  // honest null instead.
                  confidenceScore: Number.isFinite(aiData.analysis?.confidenceScore) ? aiData.analysis.confidenceScore : null,
                };
                localStorage.setItem("impactone-last-analyzed", JSON.stringify(latestAnalyzed));
                window.dispatchEvent(new CustomEvent("impactone:last-analyzed-updated", { detail: latestAnalyzed }));
              }
            } else {
              setAiReport(null);
              setAiNotice("AI analysis is temporarily unavailable. Please try again shortly.");
              setAiError("AI analysis didn't complete this time — your data isn't affected.");
              setAiLastUpdated("");
              setCommittee(null);
              setCio(null);
            }

            if (aiData.analysis?.committee) {
              setCommittee(aiData.analysis.committee);
              setCio(aiData.analysis.cio || null);
              setCommitteeError("");
            } else {
              setCommittee(null);
              setCio(null);
              setCommitteeError("Investment committee is temporarily unavailable.");
            }

            if (compareData.comparison) {
              setComparisonRows(compareData.comparison || []);
              setComparisonError("");
            } else {
              setComparisonRows([]);
              setComparisonError("Comparison data is unavailable right now.");
            }

            const altResult = altResponse;
            if (altResult?.status === "fulfilled") {
              setAltSignals(altResult.value?.signals || aiData.analysis?.alternativeDataSignals || null);
              setAltSignalsError("");
            } else {
              setAltSignals(aiData.analysis?.alternativeDataSignals || null);
              if (altResult?.reason) logError("Alternative data feeds request failed", altResult.reason);
              setAltSignalsError("Alternative data feeds are temporarily unavailable.");
            }

            const intelResult = intelligenceResponse;
            if (intelResult?.status === "fulfilled") {
              setIntelligenceReport(intelResult.value || null);
              setIntelligenceError("");
            } else {
              setIntelligenceReport(null);
              if (intelResult?.reason) logError("Intelligence engine request failed", intelResult.reason);
              setIntelligenceError("Intelligence engine is temporarily unavailable.");
            }

            if (claimsResponse.status === "fulfilled") {
              setClaims(claimsResponse.value?.claims || []);
              setClaimsError("");
            } else {
              setClaims([]);
              logError("Claims request failed", claimsResponse.reason);
              setClaimsError("Claims are temporarily unavailable for this symbol.");
            }

            setAgentIntelligence(agentResponse.status === "fulfilled" ? agentResponse.value || null : null);
            setCotReport(cotResponse.status === "fulfilled" ? cotResponse.value?.cot || null : null);
          }
        }
      } catch (error) {
        if (isMounted) {
          logError("analysis request failed", error);
          setQuote(null);
          setCompany(null);
          setRecommendation(null);
          setRecommendationTrend(null);
          setNews([]);
          setChart([]);
          setFearGreed(null);
          setAiReport(null);
          setAiNotice("");
          setAiError("Unable to complete AI analysis due to a network or provider error.");
          setAiLastUpdated("");
          setComparisonRows([]);
          setComparisonError("");
          setAltSignals(null);
          setAltSignalsError("Alternative data feeds are temporarily unavailable.");
          setIntelligenceReport(null);
          setIntelligenceError("Intelligence engine is temporarily unavailable.");
          setClaims([]);
          setClaimsError("Claims are temporarily unavailable for this symbol.");
          setAgentIntelligence(null);
          setCotReport(null);
          setCommittee(null);
          setCio(null);
          setCommitteeError("Investment committee is temporarily unavailable.");
          setErrorMessage("Unable to contact the analysis service.");
          setStatusMessage("Live market data request failed.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAnalysis();

    return () => {
      isMounted = false;
    };
  }, [ticker]);

  const handleSearch = () => {
    const normalizedTicker = searchTicker.trim().toUpperCase();
    if (normalizedTicker) {
      setTicker(normalizedTicker);
    }
  };

  const isFavorite = watchlist.includes(ticker.toUpperCase());

  const toggleFavorite = () => {
    toggleTicker(ticker);
  };

  const marketImpact = aiReport?.marketImpact || null;
  const marketImpactScore = Number(marketImpact?.marketImpactScore || 0);
  const marketImpactLabel = marketImpact?.marketImpactLabel || "Pending";
  const whyMovingToday = marketImpact?.whyMovingToday || [];
  const sectorImpact = marketImpact?.sectorImpact || null;
  const marketOpportunities = marketImpact?.marketOpportunities || [];
  const finalRating = aiReport?.investmentRating || aiReport?.finalRating || recommendation?.label || "Unavailable";
  const selectedShortVolume = isShortVolumeLoading
    ? { available: false, label: SHORT_VOLUME_RANGES.find((item) => item.id === shortVolumeRange)?.label, reason: "Loading verified FINRA sessions…" }
    : getShortVolumeRange(shortVolumeHistory || snapshotSignals?.shortLongVolume, shortVolumeRange);
  const shortLongTotal = selectedShortVolume.available ? selectedShortVolume.shortVolume + selectedShortVolume.nonShortVolume : 0;
  const shortPercent = shortLongTotal > 0 ? Math.round(selectedShortVolume.shortVolume / shortLongTotal * 100) : null;
  const longPercent = shortPercent === null ? null : 100 - shortPercent;
  const analystVotes = recommendation?.counts || {};
  const analystVoteTotal = Number(analystVotes.buy || 0) + Number(analystVotes.hold || 0) + Number(analystVotes.sell || 0);
  const fearGreedValue = Number(fearGreed?.value);
  const fearGreedTone = Number.isFinite(fearGreedValue) ? (fearGreedValue < 40 ? "fear" : fearGreedValue > 60 ? "greed" : "neutral") : "waiting";
  const fearGreedDirection = Number.isFinite(fearGreedValue) ? (fearGreedValue < 40 ? `${40 - fearGreedValue} points inside the Fear zone` : fearGreedValue > 60 ? `${fearGreedValue - 60} points inside the Greed zone` : "Balanced around Neutral") : "Live direction is loading";
  const analystScoreMap = { "STRONG BUY": 85, BUY: 72, HOLD: 50, SELL: 28, "STRONG SELL": 15 };
  const availableBuyInputs = [];
  const analystScore = analystScoreMap[String(recommendation?.label || "").toUpperCase()];
  if (Number.isFinite(analystScore)) availableBuyInputs.push(analystScore);
  if (snapshotSignals?.sentiment?.available && Number.isFinite(Number(snapshotSignals.sentiment.score))) availableBuyInputs.push(Number(snapshotSignals.sentiment.score));
  if (quote?.analystPriceFit?.available && Number.isFinite(Number(quote.analystPriceFit.score))) availableBuyInputs.push(Number(quote.analystPriceFit.score) * 10);
  if (snapshotSignals?.insider?.available && Number(snapshotSignals.insider.buyCount) > 0) availableBuyInputs.push(70);
  const hasAiConfidence = Number.isFinite(Number(aiReport?.confidenceScore)) && Number(aiReport.confidenceScore) > 0;
  const buyRatingScore = hasAiConfidence
    ? Math.round(Number(aiReport.confidenceScore))
    : availableBuyInputs.length ? Math.round(availableBuyInputs.reduce((total, value) => total + value, 0) / availableBuyInputs.length) : null;
  const buyRatingDetail = hasAiConfidence
    ? "AI confidence based on the available criteria."
    : availableBuyInputs.length ? `${availableBuyInputs.length} live inputs: analyst consensus, sentiment, valuation${snapshotSignals?.insider?.buyCount ? ", and insider buying" : ""}.` : "No live rating inputs are available yet.";
  const isPartialReport = Boolean(aiReport && aiReport.source && aiReport.source !== "openai");
  // Phase UI-INTEGRATION-001 — presentation-only pick of the
  // highest-confidence open Claim as "current belief," same rule used by
  // StockSidePanel's Current Platform View. Never computed intelligence,
  // just a real-field sort over the one real fetch above.
  const OPEN_CLAIM_STATUSES = ["DRAFT", "ACTIVE", "STRENGTHENING", "WEAKENING", "CONTESTED"];
  const openClaims = claims.filter((claim) => OPEN_CLAIM_STATUSES.includes(claim.status));
  const currentBeliefClaim = [...openClaims].sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1))[0] || null;
  const agentResult = (id) => agentIntelligence?.agents?.find((agent) => agent.agentId === id)?.result?.raw || null;
  const earningsReport = agentResult("earnings");
  const valuationReport = agentResult("valuation");
  const fibonacciReport = agentResult("fibonacci");
  const moneyFormat = (value) => Number.isFinite(Number(value)) ? `$${Number(value).toFixed(2)}` : "--";
  const cotAvailable = cotReport && !cotReport.unavailable;
  const sectionTabs = [
    { id: "ai-overview", label: "Overview" },
    { id: "ai-fundamentals", label: "Financials" },
    { id: "ai-positioning", label: "COT" },
    { id: "ai-report", label: "AI Report" },
    { id: "ai-claims", label: "Claims-Based Analysis" },
    { id: "ai-impact", label: "Market Impact" },
    { id: "ai-alt", label: "Alt Data" },
    { id: "ai-intel", label: "Intelligence" },
    { id: "ai-committee", label: "Committee" },
    { id: "ai-sector", label: "Sector Impact" },
    { id: "ai-compare", label: "Compare" },
  ];

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">AI Analysis</p>
          <h1>Live stock analysis from one search</h1>
          <p className="subtext">
            Search any US ticker to load the live price, company profile, recommendation, recent news, price chart, and fear and greed signal.
          </p>
        </div>
      </section>

      <nav className="analysis-sticky-nav" aria-label="AI Analysis sections">
        <span className="analysis-sticky-nav__beacon" aria-hidden="true"><i /> Analysis map</span>
        {sectionTabs.map((item) => (
          <a key={item.id} href={`#${item.id}`} onClick={() => setActiveSection(item.id)} className={`analysis-sticky-nav__link${activeSection === item.id ? " is-active" : ""}`} aria-current={activeSection === item.id ? "location" : undefined}><i aria-hidden="true" />{item.label}</a>
        ))}
      </nav>

      <div id="ai-overview" className="analysis-section-block">
      <SectionCard title="Research workspace" subtitle="Ticker input" icon="⌕" className="screen-card">
        <div className="analysis-search">
          <Input
            value={searchTicker}
            onChange={(event) => setSearchTicker(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Enter ticker"
          />
          <Button type="button" onClick={handleSearch}>Analyze</Button>
        </div>
        <div className="analysis-search__status">
          {isLoading ? <LoadingSpinner /> : null}
          <div className={`status-pill${errorMessage ? " error" : ""}`}>{isLoading ? "Loading live data..." : errorMessage || statusMessage}</div>
        </div>
        <Button type="button" className="ghost-button favorite-toggle" onClick={toggleFavorite}>
          {isFavorite ? "Remove favorite" : "Save favorite"}
        </Button>
      </SectionCard>
      </div>

      <div className="analysis-grid">
        <SectionCard title="Market snapshot" subtitle="Live quote details" icon="◉" className="screen-card">
          <div className="quote-card">
            <div className="quote-card__identity">
              <div className="quote-card__symbol">{ticker}</div>
              <span className="quote-card__sector">{company?.industry || "Sector unavailable"}</span>
            </div>
            <div className="quote-card__price">${Number(quote?.price || 0).toFixed(2)}</div>
            <div className={`quote-card__change ${quote?.change >= 0 ? "positive" : "negative"}`}>
              {quote?.change >= 0 ? "+" : ""}{Number(quote?.change || 0).toFixed(2)}%
            </div>
            <div className="quote-metrics">
              <div><span>Market Cap</span><strong>{quote?.marketCap || "--"}</strong></div>
              <div className="quote-metrics__valuation"><span>P/E</span><strong>{quote?.pe || "--"}</strong>{quote?.analystPriceFit?.available ? <><div className="quote-metrics__fit" title="This score uses the live analyst mean price target when available. Otherwise it is a P/E-only context score, not an intrinsic-value estimate."><i style={{ width: `${Math.max(0, Math.min(10, Number(quote.analystPriceFit.score || 0))) * 10}%` }} /></div><small>{quote.analystPriceFit.source === "analyst-target" ? `${quote.analystPriceFit.score}/10 price fit` : `${quote.analystPriceFit.score}/10 P/E context`}</small></> : <small className="quote-metrics__pending">Valuation signal loading</small>}</div>
              <div className="quote-metrics__volume"><span>Volume</span><strong>{quote?.volume || "--"}</strong>{quote?.volumeActivity?.available ? <><div className="quote-metrics__volume-track"><i style={{ width: `${Math.max(8, Math.min(100, Number(quote.volumeActivity.ratio) * 50))}%` }} /></div><small><b>{quote.volumeActivity.state}</b> · {quote.volumeActivity.ratio.toFixed(2)}× avg {formatSignalVolume(quote.volumeActivity.averageVolume)}</small></> : <small className="quote-metrics__pending">Volume baseline loading</small>}</div>
            </div>
            <div className="market-snapshot-card__signals" aria-label="Stock intelligence signals">
              <div className="market-snapshot-card__range-tabs" aria-label="Short volume period">
                {SHORT_VOLUME_RANGES.map((range) => <Button key={range.id} type="button" className={shortVolumeRange === range.id ? "active" : ""} onClick={() => setShortVolumeRange(range.id)} disabled={range.sessions === 0} title={range.sessions === 0 ? "FINRA publishes verified short-volume data once per trading day." : undefined}>{range.label}</Button>)}
              </div>
              <div className="market-snapshot-card__signal market-snapshot-card__signal--short"><span>Short · {selectedShortVolume.label || shortVolumeRange}</span><strong>{shortPercent === null ? "—" : `${shortPercent}%`}</strong><div className="market-snapshot-card__share-track"><i style={{ width: `${shortPercent || 0}%` }} /></div></div>
              <div className="market-snapshot-card__signal market-snapshot-card__signal--long"><span>Non-short · {selectedShortVolume.label || shortVolumeRange}</span><strong>{longPercent === null ? "—" : `${longPercent}%`}</strong><div className="market-snapshot-card__share-track"><i style={{ width: `${longPercent || 0}%` }} /></div></div>
              <div className="market-snapshot-card__signal"><span>Sentiment</span><strong>{snapshotSignals?.sentiment?.available ? `${snapshotSignals.sentiment.state} · ${snapshotSignals.sentiment.score}/100` : "Unavailable"}</strong><small>{snapshotSignals?.sentiment?.available ? `${snapshotSignals.sentiment.articleCount} news articles analyzed for this symbol.` : snapshotSignals?.sentiment?.reason || "Loading symbol sentiment…"}</small></div>
              <div className="market-snapshot-card__signal"><span>Insider buying · last 12 months</span><strong>{snapshotSignals?.insider?.available ? (snapshotSignals.insider.buyCount ? `${snapshotSignals.insider.buyCount} purchases` : "No open-market purchases") : "Unavailable"}</strong><small>{snapshotSignals?.insider?.available ? (snapshotSignals.insider.averagePrice ? `Weighted average purchase price: $${snapshotSignals.insider.averagePrice.toFixed(2)}.` : "No qualifying Form 4 purchases in the last 12 months.") : snapshotSignals?.insider?.reason || "Loading SEC Form 4 data…"}</small></div>
              <div className="market-snapshot-card__signal"><span>News score</span><strong>{snapshotSignals?.sentiment?.available ? `${snapshotSignals.sentiment.newsScore}/10` : "Unavailable"}</strong><small>{snapshotSignals?.sentiment?.available ? "Derived from the live symbol news-sentiment score." : snapshotSignals?.sentiment?.reason || "Loading news score…"}</small></div>
              <div className="market-snapshot-card__signal market-snapshot-card__signal--rating"><span>ImpactOne buy rating</span><strong>{finalRating}</strong><div className="market-snapshot-card__rating-track" aria-label="Investment rating confidence"><i style={{ width: `${Math.max(0, Math.min(100, Number(buyRatingScore || 0)))}%` }} /></div><small>{buyRatingScore !== null ? `${buyRatingScore}/100 — ${buyRatingDetail}` : buyRatingDetail}</small></div>
            </div>
            {quote?.companyLogo ? (
              <img className="company-logo" src={quote.companyLogo} alt={`${ticker} logo`} />
            ) : null}
            <div className="company-description"><SafeValue value={quote?.companyDescription || "Company description is currently unavailable."} /></div>
          </div>
        </SectionCard>

        {/* Phase E3.5 — this card surfaces Finnhub's third-party Wall
            Street analyst consensus (buy/hold/sell counts), not an
            ImpactOne-generated recommendation. ImpactOne's own AI
            recommendations live on the Recommendations screen
            (RecommendationCard, backed by the autonomous recommendation
            engine + committee). Title/copy renamed to remove any
            implication these are the same thing. */}
        <SectionCard title="Wall Street Analyst Consensus" subtitle="Third-party data — not an ImpactOne recommendation" icon="▲" className="screen-card">
          <div className="score-card analyst-consensus-card">
            <div className="analyst-consensus-card__topline">
              <div className={`score-card__recommendation ${recommendation?.label ? recommendation.label.toLowerCase().replace(/\s+/g, "-") : "hold"}`}>
                {recommendation?.label || "Hold"}
              </div>
              <div className="analyst-consensus-card__orbit" aria-hidden="true"><i /><i /><i /></div>
            </div>
            <div className="company-description"><SafeValue value={recommendation?.reason || "Analyst consensus data is being loaded."} /></div>
            <div className="analyst-consensus-card__votes" aria-label="Analyst vote distribution">
              {[{ label: "Buy", value: analystVotes.buy, tone: "buy" }, { label: "Hold", value: analystVotes.hold, tone: "hold" }, { label: "Sell", value: analystVotes.sell, tone: "sell" }].map((vote) => (
                <div className={`analyst-consensus-card__vote analyst-consensus-card__vote--${vote.tone}`} key={vote.label}><span>{vote.label}</span><strong>{Number(vote.value || 0)}</strong><i><b style={{ width: `${analystVoteTotal ? Number(vote.value || 0) / analystVoteTotal * 100 : 0}%` }} /></i></div>
              ))}
            </div>
            <div className="company-description subtle">Consensus trend: <SafeValue value={recommendationTrend?.direction || "Unknown"} /></div>
            <div className="company-description subtle"><SafeValue value={recommendationTrend?.summary || "-"} /></div>
          </div>
        </SectionCard>

        <SectionCard title="Fear & Greed" subtitle="Sentiment indicator" icon="◔" className="screen-card fear-greed-shell">
          <div className={`fear-greed-card ${fearGreed ? "is-live" : "is-waiting"} fear-greed-card--${fearGreedTone}`} style={{ "--sentiment-position": `${Number.isFinite(fearGreedValue) ? fearGreedValue : 50}%` }}>
            <div className="fear-greed-card__radar" aria-label={fearGreed ? `Fear and Greed value ${fearGreed.value}` : "Fear and Greed awaiting data"}><i /><i /><i /><b style={{ transform: `rotate(${fearGreed ? Math.max(-74, Math.min(74, (Number(fearGreed.value) - 50) * 1.48)) : 0}deg)` }} /><em>{fearGreed ? fearGreed.value : "—"}<small>/100</small></em></div>
            <div className="fear-greed-card__reading"><span>Current direction</span><strong>{fearGreed?.classification || "Awaiting live pulse"}</strong><small>{fearGreedDirection}</small></div>
            <div className="fear-greed-card__scale"><span>Fear</span><i /><span>Neutral</span><i /><span>Greed</span></div>
            <p className="fear-greed-card__stamp">{fearGreed ? `Updated ${new Date(Number(fearGreed.timestamp) * 1000).toLocaleString()}` : "Global sentiment feed reconnecting"}</p>
          </div>
        </SectionCard>

        {/* Phase X3 — Chart Integration. This 30-day glance stays as a
            lightweight preview (pre-existing, unchanged), but the real
            professional candlestick chart is never duplicated here — it
            opens the same shared Side Analysis Panel every other screen
            uses (StockSidePanel/AdvancedChart), the single source of
            truth per CHART_EXTENSION_API.md. */}
        <SectionCard title="Recent news" subtitle="Latest company coverage" icon="◍" className="screen-card">
          <div className="news-list">
            {news.length ? news.map((item) => (
              <div className="news-item" key={`${item.headline}-${item.url}`}>
                <div className="news-item__meta">{new Date((item.datetime || 0) * 1000).toLocaleDateString()}</div>
                <h4>{item.headline}</h4>
                <p>{item.summary}</p>
              </div>
            )) : <p className="company-description">No recent news is available for this ticker.</p>}
          </div>
        </SectionCard>
      </div>

      <div id="ai-fundamentals" className="analysis-section-block analysis-section-block--split">
        <SectionCard title="Quarterly earnings & value" subtitle="Live company fundamentals · not investment advice" icon="◈" className="screen-card intelligence-card">
          {valuationReport?.dataAvailable ? (
            <div className="fundamentals-card">
              <div className="fundamentals-card__verdict">
                <span>Fair-value view</span><strong>{String(valuationReport.valuationStatus || "Unknown").replaceAll("_", " ")}</strong>
                <div className="fundamentals-card__score"><i style={{ width: `${Math.max(0, Math.min(10, Number(valuationReport.confidence || 0))) * 10}%` }} /></div>
                <small>Estimate confidence {Number(valuationReport.confidence || 0)}/10</small>
              </div>
              <div className="fundamentals-card__facts">
                <div><span>Estimated fair value</span><strong>{moneyFormat(valuationReport.estimatedFairValue)}</strong></div>
                <div><span>Price vs fair value</span><strong className={Number(valuationReport.discountToFairValue) >= 0 ? "positive" : "negative"}>{Number.isFinite(Number(valuationReport.discountToFairValue)) ? `${Number(valuationReport.discountToFairValue).toFixed(1)}%` : "--"}</strong></div>
                <div><span>Latest earnings health</span><strong>{earningsReport?.earningsHealth || "Loading"}</strong></div>
                <div><span>Forward outlook</span><strong>{earningsReport?.forwardOutlook || "Loading"}</strong></div>
              </div>
              <p className="company-description subtle">{valuationReport.aiSummary}</p>
            </div>
          ) : <p className="company-description">{valuationReport?.unavailableReason || "Financial valuation is loading from the connected live provider."}</p>}
        </SectionCard>

        <SectionCard title="Fibonacci map" subtitle="Daily / monthly swing levels from verified price history" icon="⌁" className="screen-card intelligence-card">
          {fibonacciReport?.dataAvailable ? (
            <div className="fib-map-card">
              <div className="fib-map-card__headline"><span>{fibonacciReport.primarySwing?.trend || "Current swing"}</span><strong>{fibonacciReport.entryZone?.label || "Watch zone"}</strong></div>
              <div className="fib-map-card__levels">{(fibonacciReport.retracementLevels || []).slice(0, 5).map((level) => <div key={level.ratio}><span>{Number(level.ratio) * 100}%</span><i /><strong>{moneyFormat(level.price)}</strong></div>)}</div>
              <p className="company-description subtle">{fibonacciReport.aiSummary}</p>
            </div>
          ) : <p className="company-description">{fibonacciReport?.unavailableReason || "Fibonacci levels are loading from real historical candles."}</p>}
        </SectionCard>
      </div>

      <div id="ai-positioning" className="analysis-section-block">
        <SectionCard title="Weekly COT positioning" subtitle="CFTC futures positioning · market proxy, not individual-stock ownership" icon="◌" className="screen-card cot-card">
          {cotAvailable ? (
            <div className="cot-card__content">
              <div className="cot-card__signal"><span>{cotReport.market || "CFTC market"}</span><strong>{cotReport.signal}</strong><small>Weekly non-commercial net: {Number(cotReport.netPositioning || 0).toLocaleString()}</small></div>
              <div className="cot-card__groups">
                <div><span>Dealers & intermediaries</span><strong className="cot-card__long">Long {Number(cotReport.commercialLong || 0).toLocaleString()}</strong><strong className="cot-card__short">Short {Number(cotReport.commercialShort || 0).toLocaleString()}</strong></div>
                <div><span>Leveraged funds</span><strong className="cot-card__long">Long {Number(cotReport.nonCommercialLong || 0).toLocaleString()}</strong><strong className="cot-card__short">Short {Number(cotReport.nonCommercialShort || 0).toLocaleString()}</strong></div>
              </div>
              <p className="company-description subtle">The CFTC TFF report does not identify central-bank positions. It reports weekly futures positions by trader category; equities therefore use S&amp;P futures as a broad risk-positioning proxy.</p>
            </div>
          ) : <p className="company-description">{cotReport?.reason || "CFTC positioning data is loading."}</p>}
        </SectionCard>
      </div>

      <div id="ai-report" className="analysis-section-block">
      <SectionCard title="AI Report" subtitle="Structured investment analysis" icon="✦" className="screen-card ai-report-card">
        {isLoading && !aiReport ? (
          <div className="analysis-loading-panel">
            <LoadingSpinner label="Generating AI report" />
            <div>
              <div className="analysis-loading-panel__title">Generating market impact engine analysis...</div>
              <p className="company-description subtle">Gathering live quotes, news, analyst signals, and peer context.</p>
            </div>
            <div className="loading-bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : aiReport ? (
          <div className="ai-report">
            <div className="ai-report__header">
              <div className={`score-card__recommendation ${String(finalRating).toLowerCase().replace(/\s+/g, "-")}`}>{finalRating}</div>
              {/* Phase LIVE-DATA-INTEGRATION-001 — real bug fix: this
                  previously fell back to a literal 0 whenever
                  confidenceScore was genuinely absent, fabricating a
                  specific, fake confidence reading rather than honestly
                  disclosing that none was available. */}
              <div className="ai-report__score">
                Confidence {Number.isFinite(aiReport.confidenceScore) ? `${aiReport.confidenceScore}/100` : "not available"}
              </div>
            </div>
            {aiLastUpdated ? <div className="company-description subtle">Last updated: {aiLastUpdated}</div> : null}
            <div className="company-description"><SafeValue value={aiReport.executiveSummary || aiReport.summary} /></div>
            {aiNotice ? <p className="company-description subtle">Provider notice: {aiNotice}</p> : null}
            {isPartialReport ? <p className="company-description subtle">Data is partial and may be based on fallback analysis.</p> : null}
            {aiError ? <p className="company-description subtle">{aiError}</p> : null}
            <div className="ai-report__grid">
              <div>
                <h4>Bull Case</h4>
                <SafeList value={aiReport.bullCase} fallback="-" />
              </div>
              <div>
                <h4>Bear Case</h4>
                <SafeList value={aiReport.bearCase} fallback="-" />
              </div>
              <div>
                <h4>Valuation</h4>
                <div className="company-description"><SafeValue value={aiReport.valuation || aiReport.valuationSummary} /></div>
              </div>
              <div>
                <h4>Key Risks</h4>
                <SafeList value={aiReport.keyRisks} fallback="-" />
              </div>
              <div>
                <h4>Catalysts</h4>
                <SafeList value={aiReport.catalysts} fallback="-" />
              </div>
              <div>
                <h4>Short-Term Outlook</h4>
                <div className="company-description"><SafeValue value={aiReport.shortTermOutlook} /></div>
              </div>
              <div>
                <h4>Long-Term Outlook</h4>
                <div className="company-description"><SafeValue value={aiReport.longTermOutlook} /></div>
              </div>
              <div>
                <h4>What Changed Today?</h4>
                <SafeList value={aiReport.whatChangedToday} fallback="-" />
              </div>
            </div>
          </div>
        ) : (
          <div className="company-description"><SafeValue value={aiNotice || "The AI report will appear here once the analysis completes."} /></div>
        )}
      </SectionCard>
      </div>

      <div id="ai-claims" className="analysis-section-block">
      {/* Phase PRODUCT-001 — AI Analysis answers exactly one question:
          "Explain everything." The required report order is Executive
          Summary, Why this matters, Evidence, Counter evidence, Portfolio
          impact, Possible outcomes, Confidence, Unknowns, Things to
          monitor next — generated entirely from the real Claim contract
          above, never from the separate OpenAI-backed AI Report, and
          never an unsupported conclusion: every field below is a real
          Claim field or an honest "not yet available" state. Unknowns
          reuses the Claim's real `assumptions` (what this belief is
          resting on that hasn't been independently confirmed); Things To
          Monitor Next reuses the real `invalidationConditions` — no new
          fields invented for this renaming. */}
      <SectionCard title="Claims-Based Analysis" subtitle="Generated from the platform's real Claims — not a second AI opinion" icon="◇" className="screen-card">
        {claimsError ? (
          <p className="company-description">{claimsError}</p>
        ) : currentBeliefClaim ? (
          <div className="ai-report">
            <div className="ai-report__header">
              <div className={`score-card__recommendation ${currentBeliefClaim.expectedDirection === "BULLISH" ? "buy" : currentBeliefClaim.expectedDirection === "BEARISH" ? "sell" : "hold"}`}>
                {currentBeliefClaim.expectedDirection}
              </div>
              <div className="ai-report__score">
                {Number.isFinite(currentBeliefClaim.confidence) ? `Confidence ${currentBeliefClaim.confidence}/100` : "Confidence not yet available"}
              </div>
            </div>
            <div className="ai-report__grid">
              <div>
                <h4>Executive Summary</h4>
                <div className="company-description">{currentBeliefClaim.plainLanguageStatement || currentBeliefClaim.statement}</div>
              </div>
              <div>
                <h4>Why this matters</h4>
                <p className="company-description">{currentBeliefClaim.statement}</p>
                <p className="company-description subtle">Status: {currentBeliefClaim.status}</p>
              </div>
              <div>
                <h4>Evidence</h4>
                <SafeList value={(currentBeliefClaim.evidence || []).map((entry) => entry.observedFact)} fallback="No real supporting evidence recorded yet." />
              </div>
              <div>
                <h4>Counter evidence</h4>
                <SafeList value={(currentBeliefClaim.counterEvidence || []).map((entry) => entry.observedFact)} fallback="No real counter-evidence recorded yet." />
              </div>
              <div>
                <h4>Portfolio impact</h4>
                <p className="company-description">{currentBeliefClaim.portfolioImpact ? JSON.stringify(currentBeliefClaim.portfolioImpact) : "No real portfolio impact computed for this Claim yet."}</p>
              </div>
              <div>
                <h4>Possible outcomes</h4>
                <p className="company-description">Scenario preview not yet available — the Scenario Engine is architecture-only today.</p>
              </div>
              <div>
                <h4>Confidence</h4>
                <p className="company-description">
                  {Number.isFinite(currentBeliefClaim.confidence) ? `${currentBeliefClaim.confidence}/100` : "Not yet available."}
                  {Number.isFinite(currentBeliefClaim.probability) ? ` · Probability ${currentBeliefClaim.probability}%` : ""}
                </p>
              </div>
              <div>
                <h4>Unknowns</h4>
                <SafeList value={currentBeliefClaim.assumptions || []} fallback="No assumptions recorded for this Claim yet." />
              </div>
              <div>
                <h4>Things to monitor next</h4>
                <SafeList value={currentBeliefClaim.invalidationConditions || []} fallback="No invalidation conditions recorded for this Claim yet." />
              </div>
            </div>
          </div>
        ) : (
          // Phase FOUNDER-MODE-001 — real UX-consistency fix: this was a
          // plain, hand-rolled paragraph while the identical "no active
          // Claim" empty state on AiAnalysisWorkspaceScreen.jsx already
          // used the shared EmptyState component's icon+title treatment.
          <EmptyState icon="◇" title="No active Claim exists for this symbol yet" message="A Claims-based report will appear once one forms." />
        )}
      </SectionCard>
      </div>

      <div id="ai-impact" className="analysis-section-block">
      <SectionCard title="Market Impact Engine" subtitle="Event-driven score" icon="◎" className="screen-card">
        {marketImpact ? (
          <div className="impact-engine">
            <div className="impact-engine__score">
              <div className="impact-engine__ring">
                <span>{marketImpactScore}</span>
                <small>/100</small>
              </div>
              <div>
                <div className={`score-card__recommendation ${String(marketImpactLabel).toLowerCase().replace(/\s+/g, "-")}`}><SafeValue value={marketImpactLabel} fallback="Pending" /></div>
                <p className="company-description subtle">Combines news sentiment, analyst trend, price momentum, Fear & Greed, and recent volatility.</p>
              </div>
            </div>
            <div className="impact-engine__breakdown">
              <div><span>News Sentiment</span><strong><SafeValue value={marketImpact.breakdown?.newsSentiment?.label || "Neutral"} /></strong></div>
              <div><span>Analyst Trend</span><strong><SafeValue value={marketImpact.breakdown?.analystTrend?.label || "Neutral"} /></strong></div>
              <div><span>Momentum</span><strong><SafeValue value={marketImpact.breakdown?.priceMomentum?.label || "Mixed"} /></strong></div>
              <div><span>Fear & Greed</span><strong><SafeValue value={marketImpact.breakdown?.fearGreed?.label || "Neutral"} /></strong></div>
              <div><span>Volatility</span><strong><SafeValue value={marketImpact.breakdown?.volatility?.label || "Moderate"} /></strong></div>
            </div>
            <div>
              <h4>Why is this stock moving today?</h4>
              <SafeList value={whyMovingToday} fallback="-" />
            </div>
          </div>
        ) : (
          <p className="company-description">Market impact details will appear once live data loads.</p>
        )}
      </SectionCard>
      </div>

      <div id="ai-alt" className="analysis-section-block">
      <SectionCard title="Alternative Data Signals" subtitle="Multi-source intelligence layer" icon="⬢" className="screen-card">
        {altSignals ? (
          <div className="ai-report__grid">
            <div>
              <h4>Smart money positioning</h4>
              <p className="company-description">{altSignals.smartMoneyPositioning?.signal || "Unavailable"}</p>
              <p className="company-description subtle">Net {Number(altSignals.smartMoneyPositioning?.netPositioning || 0).toLocaleString()} | Weekly {Number(altSignals.smartMoneyPositioning?.weeklyChange || 0).toLocaleString()}</p>
            </div>
            <div>
              <h4>Prediction market probabilities</h4>
              <p className="company-description">{altSignals.predictionMarketProbabilities?.event || "Unavailable"}</p>
              <p className="company-description subtle">{Math.round(Number(altSignals.predictionMarketProbabilities?.probability || 0) * 100)}% | {altSignals.predictionMarketProbabilities?.trend || "N/A"}</p>
            </div>
            <div>
              <h4>Macro regime</h4>
              <p className="company-description">Risk mode: {altSignals.macroRegime?.riskMode || "N/A"}</p>
              <p className="company-description subtle">Inflation: {altSignals.macroRegime?.inflationPressure || "N/A"} | Recession: {altSignals.macroRegime?.recessionRisk || "N/A"}</p>
            </div>
            <div>
              <h4>SEC filing signal</h4>
              <p className="company-description"><SafeValue value={altSignals.secFilingSignal || "Unavailable"} /></p>
            </div>
            <div>
              <h4>Political trading signal</h4>
              <p className="company-description"><SafeValue value={altSignals.politicalTradingSignal || "Unavailable"} /></p>
            </div>
            <div>
              <h4>Options/on-chain status</h4>
              <p className="company-description">Options: {altSignals.optionsStatus?.status || "not_connected"}</p>
              <p className="company-description subtle">On-chain: {altSignals.onChainStatus?.status || "not_connected"}</p>
            </div>
            <div>
              <h4>Upcoming event risk</h4>
              <SafeList value={(altSignals.upcomingEventRisk || []).map((event) => `${event.date} - ${event.event}`)} fallback="No immediate high-risk events." />
            </div>
            <div>
              <h4>Impacted sectors and tickers</h4>
              <p className="company-description">Sectors: {(altSignals.impactedSectors || []).join(", ") || "N/A"}</p>
              <p className="company-description subtle">Tickers: {(altSignals.relatedTickers || []).join(", ") || "N/A"}</p>
              <p className="company-description subtle">
                Confidence score: {Number.isFinite(altSignals.confidenceScore) ? `${altSignals.confidenceScore}/100` : "not available"}
              </p>
            </div>
          </div>
        ) : (
          <p className="company-description">{altSignalsError || "Alternative data signals will appear once feeds load."}</p>
        )}
      </SectionCard>
      </div>

      <div id="ai-intel" className="analysis-section-block">
      <SectionCard title="Impact Intelligence Engine" subtitle="Cross-asset explainability" icon="⬡" className="screen-card">
        {intelligenceReport ? (
          <div className="ai-report__grid">
            <div>
              <h4>Event + confidence</h4>
              <p className="company-description">{intelligenceReport.event}</p>
              <p className="company-description subtle">
                Confidence: {Number.isFinite(intelligenceReport.confidenceScore) ? `${intelligenceReport.confidenceScore}/100` : "not available"} | Horizon: {intelligenceReport.timeHorizon || "N/A"}
              </p>
            </div>
            <div>
              <h4>Why this matters</h4>
              <p className="company-description"><SafeValue value={intelligenceReport.explainability?.why || "Unavailable"} /></p>
            </div>
            <div>
              <h4>Supporting evidence</h4>
              <SafeList value={intelligenceReport.explainability?.supportingEvidence || []} fallback="No direct evidence available." />
            </div>
            <div>
              <h4>Key risks</h4>
              <SafeList value={intelligenceReport.explainability?.possibleRisks || []} fallback="No elevated risks detected." />
            </div>
            <div>
              <h4>Historical analogs</h4>
              <SafeList
                value={(intelligenceReport.historicalSimilarity || []).map((item) => `${item.event} (${item.similarity}%)`) || []}
                fallback="No historical analogs available."
              />
            </div>
            <div>
              <h4>Scenario engine</h4>
              <p className="company-description">Bull: {intelligenceReport.scenario?.bullCase?.narrative || "N/A"}</p>
              <p className="company-description">Base: {intelligenceReport.scenario?.baseCase?.narrative || "N/A"}</p>
              <p className="company-description">Bear: {intelligenceReport.scenario?.bearCase?.narrative || "N/A"}</p>
            </div>
          </div>
        ) : (
          <p className="company-description">{intelligenceError || "Intelligence engine output will appear once data loads."}</p>
        )}
      </SectionCard>
      </div>

      <div id="ai-committee" className="analysis-section-block">
      {/* Sprint 41 — Committee Unification: this is the ONE canonical
          committee (intelligenceCommitteeService, evidence-matrix-driven) —
          a debate/explanation layer, not a second verdict: it never shows
          its own Buy/Sell pill. The platform's one canonical call (when one
          exists) lives on the Recommendations screen, backed by the same
          committee's DecisionTrace snapshot. */}
      <SectionCard title="AI Investment Committee" subtitle="Multi-agent debate — advisory context, not a standalone verdict" icon="◆" className="screen-card">
        {committee ? (
          <div className="ai-report">
            <div className="ai-report__header">
              <div className="ai-report__score">
                {committee.agreement.status === "AGREEMENT"
                  ? `Agreement: ${committee.agreement.direction}`
                  : committee.disagreement.status === "DISAGREEMENT"
                    ? "Disagreement among specialists"
                    : "No clear agreement"}
              </div>
              <div className="ai-report__score">{committee.members.length} specialists</div>
            </div>
            {cio ? (
              <>
                <div className="company-description"><SafeValue value={cio.overallThesis || "Committee summary unavailable."} /></div>
                {cio.largestDisagreement ? <p className="company-description subtle">Largest disagreement: {cio.largestDisagreement}</p> : null}
                <div className="ai-report__grid">
                  <div>
                    <h4>CIO summary</h4>
                    <p className="company-description">Confidence: {cio.confidence}</p>
                    <p className="company-description subtle">Highest risk: {cio.highestRisk}</p>
                    <p className="company-description subtle">Why this exists: {cio.whyRecommendationExists}</p>
                  </div>
                  <div>
                    <h4>Why this may be wrong</h4>
                    <SafeList value={cio.whyRecommendationMayBeWrong || []} fallback="-" />
                  </div>
                  <div>
                    <h4>Missing information</h4>
                    <SafeList value={cio.missingInformation || []} fallback="-" />
                  </div>
                </div>
              </>
            ) : null}
            <div className="table-wrapper">
              <table className="watchlist-table comparison-table">
                <thead>
                  <tr>
                    <th>Specialist</th>
                    <th>Headline</th>
                    <th>Confidence</th>
                    <th>Uncertainty</th>
                    <th>Freshness</th>
                  </tr>
                </thead>
                <tbody>
                  {(committee.members || []).map((member) => (
                    <tr key={member.memberId}>
                      <td>{member.memberName}</td>
                      <td>{member.headline}</td>
                      <td>{member.confidence}/100</td>
                      <td>{member.uncertainty}/100</td>
                      <td>{member.freshness}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ai-report__grid">
              {(committee.members || []).map((member) => (
                <div key={`${member.memberId}-detail`}>
                  <h4>{member.memberName}</h4>
                  <p className="company-description subtle">{member.reasoning}</p>
                  <SafeList value={(member.supportingEvidence || []).map((item) => item.reason || item.category)} fallback="-" />
                  <SafeList value={(member.counterEvidence || []).map((item) => item.reason || item.category)} fallback="-" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="company-description">{committeeError || "Committee debate will appear once the analysis completes."}</p>
        )}
      </SectionCard>
      </div>

      <div id="ai-sector" className="analysis-section-block">
      <SectionCard title="Sector Impact" subtitle="Peers and market opportunities" icon="◈" className="screen-card">
        {sectorImpact ? (
          <div className="sector-impact">
            <div className="sector-impact__summary">
              <div className="company-profile__meta">Sector: <SafeValue value={sectorImpact.sector} /></div>
              <div className="company-profile__meta">Industry: <SafeValue value={sectorImpact.industry} /></div>
              <div className="company-profile__meta">Movement: <SafeValue value={sectorImpact.movement} /></div>
              <div className="company-description"><SafeValue value={sectorImpact.summary} /></div>
            </div>

            <div>
              <h4>Top competitors</h4>
              <div className="watchlist-grid">
                {(sectorImpact.topCompetitors || []).map((item) => (
                  <article key={item.symbol} className="watch-item">
                    <div className="watch-item__top">
                      <strong><SafeValue value={item.symbol} /></strong>
                      <span className="pill monitor">{Number(item.priceChange || 0) >= 0 ? "Positive" : "Negative"}</span>
                    </div>
                    <div className="watch-item__company"><SafeValue value={item.company} /></div>
                    <div className={Number(item.priceChange || 0) >= 0 ? "positive" : "negative"}>{Number(item.priceChange || 0).toFixed(2)}% today</div>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <h4>Market opportunities</h4>
              <div className="opportunity-list">
                {(marketOpportunities || []).map((item) => (
                  <div className="opportunity-item" key={item.symbol}>
                    <div className="opportunity-item__top">
                      <strong><SafeValue value={item.symbol} /></strong>
                      <span className={`pill ${item.direction === "benefit" ? "opportunity" : "risk"}`}><SafeValue value={item.direction === "benefit" ? "Benefit" : "Hurt"} /></span>
                    </div>
                    <div className="company-description subtle"><SafeValue value={item.company} /></div>
                    <div className="company-description"><SafeValue value={item.thesis} /></div>
                    <div className="company-description subtle"><SafeValue value={item.reason} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="company-description">Sector impact will appear once the selected ticker loads.</p>
        )}
      </SectionCard>
      </div>

      <div id="ai-compare" className="analysis-section-block">
      <SectionCard title="Ticker Comparison" subtitle="Selected ticker vs peers" icon="◫" className="screen-card">
        {comparisonRows.length ? (
          <div className="table-wrapper">
            <table className="watchlist-table comparison-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Price Change</th>
                  <th>Market Cap</th>
                  <th>P/E</th>
                  <th>Analyst Rating</th>
                  <th>AI Score</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.symbol}>
                    <td>{row.symbol}</td>
                    <td className={row.priceChange >= 0 ? "positive" : "negative"}>{row.priceChange >= 0 ? "+" : ""}{Number(row.priceChange || 0).toFixed(2)}%</td>
                    <td>{row.marketCap}</td>
                    <td>{row.pe}</td>
                    <td>{row.analystRating}</td>
                    <td>{Number(row.aiScore || 0)}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="company-description"><SafeValue value={comparisonError || "Comparison will appear once live data loads."} /></div>
        )}
      </SectionCard>
      </div>

      <section className="company-identity-section" aria-label="Company profile">
        <div className="company-identity-section__orb" aria-hidden="true"><i /><i /><i /></div>
        <div className="company-identity-section__content">
          <p className="eyebrow">Company identity</p>
          <div className="company-identity-section__title-row">
            {quote?.companyLogo ? <img src={quote.companyLogo} alt="" className="company-identity-section__logo" /> : <span className="company-identity-section__monogram">{ticker.slice(0, 1)}</span>}
            <div><h2>{company?.name || ticker}</h2><p>{ticker} · {company?.industry || "Sector unavailable"}</p></div>
          </div>
          <div className="company-identity-section__facts">
            <span>{company?.exchange || "US exchange"}</span>
            <span>{company?.country || "US"}</span>
            <span>{company?.currency || "USD"}</span>
          </div>
          {company?.website ? <a className="company-identity-section__link" href={company.website} target="_blank" rel="noreferrer">Visit company website <span aria-hidden="true">↗</span></a> : null}
        </div>
      </section>
    </div>
  );
}
