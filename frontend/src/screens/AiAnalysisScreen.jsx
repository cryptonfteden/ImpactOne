import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { SafeList, SafeValue } from "../components/SafeValue";
import useWatchlist from "../hooks/useWatchlist";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

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

      try {
        const quoteUrl = `${API_BASE}/quote?symbol=${normalizedTicker}`;
        console.log(`[frontend] quote request ${quoteUrl}`);
        const quoteResponse = await fetch(quoteUrl);
        const quoteData = await quoteResponse.json();
        console.log(`[frontend] quote response`, quoteData);

        if (isMounted) {
          if (!quoteResponse.ok || quoteData.error) {
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

          const aiUrl = `${API_BASE}/ai/analyze`;
          const compareUrl = `${API_BASE}/compare?symbol=${normalizedTicker}`;
          console.log(`[frontend] ai request ${aiUrl}`, { symbol: normalizedTicker });
          const [aiResponse, compareResponse] = await Promise.all([
            fetch(aiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
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
            }),
            fetch(compareUrl),
          ]);

          const aiData = await aiResponse.json().catch(() => ({}));
          const compareData = await compareResponse.json().catch(() => ({}));
          console.log(`[frontend] ai response`, aiData);
          console.log(`[frontend] compare response`, compareData);

          if (isMounted) {
            if (aiResponse.ok && aiData.analysis) {
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
              setAiNotice(aiData.error || "AI analysis is temporarily unavailable. Please try again shortly.");
              setAiError(aiData.error || "OpenAI analysis failed to complete.");
              setAiLastUpdated("");
            }

            if (compareResponse.ok) {
              setComparisonRows(compareData.comparison || []);
              setComparisonError("");
            } else {
              setComparisonRows([]);
              setComparisonError(compareData.error || "Comparison data is unavailable right now.");
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error("[frontend] analysis request failed", error);
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
          setErrorMessage(error?.message || "Unable to contact the analysis service.");
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
  const sectionTabs = [
    { id: "ai-overview", label: "Overview" },
    { id: "ai-report", label: "AI Report" },
    { id: "ai-impact", label: "Market Impact" },
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
          <input
            value={searchTicker}
            onChange={(event) => setSearchTicker(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Enter ticker"
          />
          <button type="button" onClick={handleSearch}>Analyze</button>
        </div>
        <div className="analysis-search__status">
          {isLoading ? <span className="loading-spinner" aria-label="Loading" /> : null}
          <div className={`status-pill${errorMessage ? " error" : ""}`}>{isLoading ? "Loading live data..." : errorMessage || statusMessage}</div>
        </div>
        <button type="button" className="ghost-button favorite-toggle" onClick={toggleFavorite}>
          {isFavorite ? "Remove favorite" : "Save favorite"}
        </button>
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

        <SectionCard title="Recommendation" subtitle="Analyst posture" icon="▲" className="screen-card">
          <div className="score-card">
            <div className={`score-card__recommendation ${recommendation?.label ? recommendation.label.toLowerCase().replace(/\s+/g, "-") : "hold"}`}>
              {recommendation?.label || "Hold"}
            </div>
            <div className="company-description"><SafeValue value={recommendation?.reason || "Recommendation data is being loaded."} /></div>
            <div className="company-description subtle"><SafeValue value={recommendation?.details || "-"} /></div>
            <div className="company-description subtle">Trend: <SafeValue value={recommendationTrend?.direction || "Unknown"} /></div>
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

        <SectionCard title="Price chart" subtitle="30-day daily close" icon="◣" className="screen-card">
          <PriceChart points={chart} />
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
            <span className="loading-spinner" aria-label="Generating AI report" />
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
