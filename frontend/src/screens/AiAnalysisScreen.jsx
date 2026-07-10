import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";

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
  const [comparisonRows, setComparisonRows] = useState([]);
  const [comparisonError, setComparisonError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Searching live market data...");
  const [errorMessage, setErrorMessage] = useState("");

  const [favorites, setFavorites] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      return JSON.parse(localStorage.getItem("impactone-favorites") || "[]");
    } catch (error) {
      return [];
    }
  });

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
            setComparisonRows([]);
            setErrorMessage(quoteData.error || "Unable to load live stock analysis.");
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
            } else {
              setAiReport(null);
              setAiNotice(aiData.error || "AI analysis is temporarily unavailable. Please try again shortly.");
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

  const isFavorite = favorites.includes(ticker.toUpperCase());

  const toggleFavorite = () => {
    const normalizedTicker = ticker.toUpperCase();
    setFavorites((current) => {
      if (current.includes(normalizedTicker)) {
        return current.filter((item) => item !== normalizedTicker);
      }
      return [...current, normalizedTicker];
    });
  };

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

      <SectionCard title="Research workspace" subtitle="Ticker input" className="screen-card">
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

      <div className="analysis-grid">
        <SectionCard title="Market snapshot" subtitle="Live quote details" className="screen-card">
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
            <p className="company-description">{quote?.companyDescription || "Company description is currently unavailable."}</p>
          </div>
        </SectionCard>

        <SectionCard title="Company information" subtitle="Profile" className="screen-card">
          <div className="company-profile">
            <div className="company-profile__name">{company?.name || ticker}</div>
            <div className="company-profile__meta">{company?.exchange || "US exchange"} • {company?.country || "US"}</div>
            <div className="company-profile__meta">Industry: {company?.industry || "Unknown"}</div>
            <div className="company-profile__meta">Currency: {company?.currency || "USD"}</div>
            {company?.website ? <a className="company-profile__link" href={company.website} target="_blank" rel="noreferrer">Visit website</a> : null}
          </div>
        </SectionCard>

        <SectionCard title="Recommendation" subtitle="Analyst posture" className="screen-card">
          <div className="score-card">
            <div className={`score-card__recommendation ${recommendation?.label ? recommendation.label.toLowerCase().replace(/\s+/g, "-") : "hold"}`}>
              {recommendation?.label || "Hold"}
            </div>
            <p className="company-description">{recommendation?.reason || "Recommendation data is being loaded."}</p>
            <p className="company-description subtle">{recommendation?.details || ""}</p>
            <p className="company-description subtle">Trend: {recommendationTrend?.direction || "Unknown"}</p>
            <p className="company-description subtle">{recommendationTrend?.summary || ""}</p>
          </div>
        </SectionCard>

        <SectionCard title="Fear & Greed" subtitle="Sentiment indicator" className="screen-card">
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

        <SectionCard title="Price chart" subtitle="30-day daily close" className="screen-card">
          <PriceChart points={chart} />
        </SectionCard>

        <SectionCard title="Recent news" subtitle="Latest company coverage" className="screen-card">
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

      <SectionCard title="AI Report" subtitle="Structured investment analysis" className="screen-card">
        {aiReport ? (
          <div className="ai-report">
            <div className="ai-report__header">
              <div className="score-card__recommendation">{aiReport.investmentRating || aiReport.recommendation || "Hold"}</div>
              <div className="ai-report__score">Confidence {aiReport.confidenceScore ?? 0}/100</div>
            </div>
            <p className="company-description">{aiReport.executiveSummary || aiReport.summary}</p>
            {aiNotice ? <p className="company-description subtle">{aiNotice}</p> : null}
            <div className="ai-report__grid">
              <div>
                <h4>Bull Case</h4>
                <ul>{(aiReport.bullCase || []).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h4>Bear Case</h4>
                <ul>{(aiReport.bearCase || []).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h4>Valuation</h4>
                <p>{aiReport.valuation || aiReport.valuationSummary}</p>
              </div>
              <div>
                <h4>Key Risks</h4>
                <ul>{(aiReport.keyRisks || []).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h4>Catalysts</h4>
                <ul>{(aiReport.catalysts || []).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h4>Short-Term Outlook</h4>
                <p>{aiReport.shortTermOutlook}</p>
              </div>
              <div>
                <h4>Long-Term Outlook</h4>
                <p>{aiReport.longTermOutlook}</p>
              </div>
              <div>
                <h4>What Changed Today?</h4>
                <ul>{(aiReport.whatChangedToday || []).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          </div>
        ) : (
          <p className="company-description">{aiNotice || "The AI report will appear here once the analysis completes."}</p>
        )}
      </SectionCard>

      <SectionCard title="Ticker Comparison" subtitle="Selected ticker vs peers" className="screen-card">
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
          <p className="company-description">{comparisonError || "Comparison will appear once live data loads."}</p>
        )}
      </SectionCard>
    </div>
  );
}
