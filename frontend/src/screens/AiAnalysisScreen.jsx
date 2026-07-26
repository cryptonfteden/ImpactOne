import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { SafeList, SafeValue } from "../components/SafeValue";
import useWatchlist from "../hooks/useWatchlist";
import { Button, Input, LoadingSpinner } from "../components/ui";
import { altDataApi, analysisApi, intelligenceApi, marketApi, performanceMetricsApi, claimsApi } from "../services/api";
import { openSymbolPanel } from "../utils/symbolPanel";
import { logError } from "../utils/errorHandling";

function PriceChart({ points }) {
  if (!points?.length) {
    return <p className="company-description">No chart history is available for this ticker yet.</p>;
  }

  const width = 320;
  const height = 160;
  const padding = 16;
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const charts = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((point.value - minValue) / Math.max(maxValue - minValue, 1)) * (height - padding * 2);
    return { ...point, x, y };
  });

  const path = charts.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${path} L ${charts[charts.length - 1].x.toFixed(2)} ${height - padding} L ${charts[0].x.toFixed(2)} ${height - padding} Z`;

  return (
    <div className="chart-card">
      <svg viewBox={`0 0 ${width} ${height}`} className="price-chart">
        <path d={areaPath} className="price-chart__area" />
        <path d={path} className="price-chart__line" />
        {charts.map((point) => (
          <circle key={`${point.label}-${point.value}`} cx={point.x} cy={point.y} r="3.5" className="price-chart__dot" />
        ))}
      </svg>
      <div className="chart-labels">
        {charts.slice(0, 4).map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
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
          setComparisonRows([]);
          setAiNotice("");
          setAiLastUpdated("");
          setErrorMessage("");
          setStatusMessage(quoteData.quote?.companyDescription ? "Live market data loaded" : "Live market data loaded");

          const eventHint = quoteData.news?.[0]?.headline || `${normalizedTicker} earnings`;
          // Phase X9 — Part 6, Performance Monitoring. Real elapsed time
          // for the real AI analysis call — reported fire-and-forget.
          const aiCallStart = performance.now();
          const [aiResponse, compareResponse, altResponse, intelligenceResponse, claimsResponse] = await Promise.allSettled([
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
                  confidenceScore: Number(aiData.analysis?.confidenceScore || 0),
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
  const finalRating = aiReport?.investmentRating || aiReport?.finalRating || "Hold";
  const isPartialReport = Boolean(aiReport && aiReport.source && aiReport.source !== "openai");
  // Phase UI-INTEGRATION-001 — presentation-only pick of the
  // highest-confidence open Claim as "current belief," same rule used by
  // StockSidePanel's Current Platform View. Never computed intelligence,
  // just a real-field sort over the one real fetch above.
  const OPEN_CLAIM_STATUSES = ["DRAFT", "ACTIVE", "STRENGTHENING", "WEAKENING", "CONTESTED"];
  const openClaims = claims.filter((claim) => OPEN_CLAIM_STATUSES.includes(claim.status));
  const currentBeliefClaim = [...openClaims].sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1))[0] || null;
  const sectionTabs = [
    { id: "ai-overview", label: "Overview" },
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
        {sectionTabs.map((item) => (
          <a key={item.id} href={`#${item.id}`} className="analysis-sticky-nav__link">{item.label}</a>
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
            <div className="quote-card__symbol">{ticker}</div>
            <div className="quote-card__price">${Number(quote?.price || 0).toFixed(2)}</div>
            <div className={`quote-card__change ${quote?.change >= 0 ? "positive" : "negative"}`}>
              {quote?.change >= 0 ? "+" : ""}{Number(quote?.change || 0).toFixed(2)}%
            </div>
            <div className="quote-metrics">
              <div><span>Market Cap</span><strong>{quote?.marketCap || "--"}</strong></div>
              <div><span>P/E</span><strong>{quote?.pe || "--"}</strong></div>
              <div><span>Volume</span><strong>{quote?.volume || "--"}</strong></div>
              <div><span>52w High/Low</span><strong>{quote?.weekHigh || "--"}/{quote?.weekLow || "--"}</strong></div>
            </div>
            {quote?.companyLogo ? (
              <img className="company-logo" src={quote.companyLogo} alt={`${ticker} logo`} />
            ) : null}
            <div className="company-description"><SafeValue value={quote?.companyDescription || "Company description is currently unavailable."} /></div>
          </div>
        </SectionCard>

        <SectionCard title="Company information" subtitle="Profile" icon="◌" className="screen-card">
          <div className="company-profile">
            <div className="company-profile__name">{company?.name || ticker}</div>
            <div className="company-profile__meta">{company?.exchange || "US exchange"} • {company?.country || "US"}</div>
            <div className="company-profile__meta">Industry: {company?.industry || "Unknown"}</div>
            <div className="company-profile__meta">Currency: {company?.currency || "USD"}</div>
            {company?.website ? <a className="company-profile__link" href={company.website} target="_blank" rel="noreferrer">Visit website</a> : null}
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
          <div className="score-card">
            <div className={`score-card__recommendation ${recommendation?.label ? recommendation.label.toLowerCase().replace(/\s+/g, "-") : "hold"}`}>
              {recommendation?.label || "Hold"}
            </div>
            <div className="company-description"><SafeValue value={recommendation?.reason || "Analyst consensus data is being loaded."} /></div>
            <div className="company-description subtle"><SafeValue value={recommendation?.details || "-"} /></div>
            <div className="company-description subtle">Consensus trend: <SafeValue value={recommendationTrend?.direction || "Unknown"} /></div>
            <div className="company-description subtle"><SafeValue value={recommendationTrend?.summary || "-"} /></div>
          </div>
        </SectionCard>

        <SectionCard title="Fear & Greed" subtitle="Sentiment indicator" icon="◔" className="screen-card">
          {fearGreed ? (
            <div className="fear-greed-card">
              <div className="fear-greed-card__value">{fearGreed.value}</div>
              <div className="fear-greed-card__label">{fearGreed.classification}</div>
              <p className="company-description">Updated {new Date(Number(fearGreed.timestamp) * 1000).toLocaleString()}</p>
            </div>
          ) : (
            <p className="company-description">Fear and greed data is unavailable right now.</p>
          )}
        </SectionCard>

        {/* Phase X3 — Chart Integration. This 30-day glance stays as a
            lightweight preview (pre-existing, unchanged), but the real
            professional candlestick chart is never duplicated here — it
            opens the same shared Side Analysis Panel every other screen
            uses (StockSidePanel/AdvancedChart), the single source of
            truth per CHART_EXTENSION_API.md. */}
        <SectionCard title="Price chart" subtitle="30-day daily close" icon="◣" className="screen-card">
          <PriceChart points={chart} />
          <button type="button" className="ghost-button" onClick={() => openSymbolPanel(ticker)} style={{ marginTop: 10 }}>
            Open full chart &amp; analysis
          </button>
        </SectionCard>

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
              <div className="ai-report__score">Confidence {aiReport.confidenceScore ?? 0}/100</div>
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
          <p className="company-description">No active Claim exists for this symbol yet — a Claims-based report will appear once one forms.</p>
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
              <p className="company-description subtle">Confidence score: {Number(altSignals.confidenceScore || 0)}/100</p>
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
              <p className="company-description subtle">Confidence: {Number(intelligenceReport.confidenceScore || 0)}/100 | Horizon: {intelligenceReport.timeHorizon || "N/A"}</p>
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
    </div>
  );
}
