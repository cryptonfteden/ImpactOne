import { useEffect, useMemo, useState } from "react";
import WatchlistTable from "./WatchlistTable";
import AIInsightsSidebar from "./AIInsightsSidebar";
import useWatchlist from "../hooks/useWatchlist";
import { altDataApi, intelligenceApi, watchlistApi } from "../services/api";
import { logError } from "../utils/errorHandling";

export default function DashboardHome() {
  const { watchlist } = useWatchlist();
  const [watchlistRows, setWatchlistRows] = useState([]);
  const [watchlistError, setWatchlistError] = useState("");
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [altSummary, setAltSummary] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [dailyBrief, setDailyBrief] = useState(null);

  useEffect(() => {
    async function loadWatchlistIntelligence() {
      if (!watchlist.length) {
        setWatchlistRows([]);
        setWatchlistError("");
        return;
      }

      setWatchlistLoading(true);
      try {
        const data = await watchlistApi.getIntelligence(watchlist);
        setWatchlistRows(data.watchlist || []);
        setWatchlistError("");
      } catch (error) {
        logError("Dashboard watchlist load failed", error);
        setWatchlistRows([]);
        setWatchlistError(error?.message || "Unable to load watchlist data.");
      } finally {
        setWatchlistLoading(false);
      }
    }

    loadWatchlistIntelligence();
  }, [watchlist]);

  useEffect(() => {
    let isMounted = true;

    async function loadAltSummary() {
      const anchorSymbol = watchlist[0] || "AAPL";
      try {
        const summary = await altDataApi.getSummary(anchorSymbol);
        if (isMounted) {
          setAltSummary(summary);
        }
      } catch (error) {
        logError("Dashboard alt summary load failed", error);
        if (isMounted) {
          setAltSummary(null);
        }
      }
    }

    loadAltSummary();
    return () => {
      isMounted = false;
    };
  }, [watchlist]);

  useEffect(() => {
    let isMounted = true;

    async function loadDailyBrief() {
      try {
        const brief = await intelligenceApi.dailyBrief({
          watchlist: watchlist.length ? watchlist : ["AAPL", "NVDA", "TSLA"],
          scenarios: ["Oil spike", "Fed rate hike", "BTC ETF approval", "Israel conflict"],
          sessionType: "morning",
        });

        if (isMounted) {
          setDailyBrief(brief);
        }
      } catch (error) {
        logError("Dashboard daily brief load failed", error);
        if (isMounted) {
          setDailyBrief(null);
        }
      }
    }

    loadDailyBrief();
    return () => {
      isMounted = false;
    };
  }, [watchlist]);

  useEffect(() => {
    let isMounted = true;

    async function loadIntelligence() {
      const anchorSymbol = watchlist[0] || "AAPL";
      const event = "Fed rate hike";

      try {
        const [analysis, scenario] = await Promise.all([
          intelligenceApi.analyze({ event, symbol: anchorSymbol }),
          intelligenceApi.scenario({ event }),
        ]);

        if (isMounted) {
          setIntelligence({
            analysis,
            scenario: scenario?.scenario || null,
          });
        }
      } catch (error) {
        logError("Dashboard intelligence load failed", error);
        if (isMounted) {
          setIntelligence(null);
        }
      }
    }

    loadIntelligence();
    return () => {
      isMounted = false;
    };
  }, [watchlist]);

  const fearGreedValue = useMemo(() => {
    if (!watchlistRows.length) {
      return 72;
    }
    const average = watchlistRows.reduce((sum, row) => sum + Number(row.aiScore || 0), 0) / watchlistRows.length;
    return Math.max(0, Math.min(100, Math.round(average)));
  }, [watchlistRows]);

  const strongestOpportunity = useMemo(() => {
    if (!watchlistRows.length) {
      return null;
    }
    return [...watchlistRows].sort((a, b) => Number(b.aiScore || 0) - Number(a.aiScore || 0))[0] || null;
  }, [watchlistRows]);

  const highestRisk = useMemo(() => {
    if (!watchlistRows.length) {
      return null;
    }
    return [...watchlistRows].sort((a, b) => Number(a.aiScore || 0) - Number(b.aiScore || 0))[0] || null;
  }, [watchlistRows]);

  const todayOpportunities = useMemo(() => {
    const opportunities = watchlistRows.filter((item) => item.alertBadge?.type === "opportunity");
    if (opportunities.length) {
      return opportunities.slice(0, 3);
    }
    return [...watchlistRows].sort((a, b) => Number(b.aiScore || 0) - Number(a.aiScore || 0)).slice(0, 3);
  }, [watchlistRows]);

  const topMovers = useMemo(() => {
    return [...watchlistRows]
      .sort((a, b) => Math.abs(Number(b.change || 0)) - Math.abs(Number(a.change || 0)))
      .slice(0, 4);
  }, [watchlistRows]);

  const positiveCount = watchlistRows.filter((row) => Number(row.change || 0) >= 0).length;
  const altSignals = altSummary?.signals || null;
  const topPrediction = altSignals?.predictionMarketProbabilities || null;
  const macroRegime = altSignals?.macroRegime || null;
  const upcomingEvents = altSignals?.upcomingEventRisk || [];
  const intelligenceAnalysis = intelligence?.analysis || null;
  const intelligenceScenario = intelligence?.scenario || null;
  const sectorConcentration = intelligenceAnalysis?.affected?.sectors || [];
  const topRisks = intelligenceAnalysis?.explainability?.possibleRisks || [];
  const topOpportunities = intelligenceAnalysis?.scenario?.expectedSectorRotation || [];
  const confidenceScore = Number(intelligenceAnalysis?.confidenceScore || 0);
  const marketRegimeLabel = intelligenceScenario?.theme || macroRegime?.riskMode || "mixed";
  const propagationEdges = intelligenceAnalysis?.sectorPropagation || [];
  const capitalFlowHint = propagationEdges[0] || null;
  const impactedCountries = intelligenceAnalysis?.affected?.countries || [];
  const briefSummary = dailyBrief?.aiSummary || null;
  const briefTopEvents = dailyBrief?.topMarketMovingEvents || [];
  const briefActionCards = dailyBrief?.actionCards || [];
  const briefRelevance = dailyBrief?.relevanceItems || [];
  const briefWatchlistImpact = dailyBrief?.portfolioWatchlistExposure || null;
  const briefChanges = dailyBrief?.whatChangedSinceYesterday || [];
  const briefMonitor = dailyBrief?.whatToMonitorToday || [];

  return (
    <main className="dashboard-content premium-dashboard">
      <section className="hero-panel hero-panel--featured">
        <div className="hero-copy">
          <p className="eyebrow">Premium Command Center</p>
          <h1>Institutional-grade market intelligence in one workspace.</h1>
          <p className="subtext">
            Monitor market state, prioritize opportunities, and execute AI-driven research from a single professional dashboard.
          </p>
        </div>
      </section>

      <section className="widget-grid" aria-label="Dashboard widgets">
        <article className="panel-card glass-card widget-card widget-card--full">
          <div className="widget-title">Today&apos;s Intelligence Brief</div>
          {dailyBrief ? (
            <div className="brief-grid">
              <div className="brief-block">
                <h4>Executive Summary</h4>
                <p className="company-description">{briefSummary?.executiveSummary || "Brief summary unavailable."}</p>
                <p className="company-description subtle">Confidence: {Number(briefSummary?.confidenceScore || 0)}/100</p>
                {briefSummary?.providerNotice ? <p className="company-description subtle">{briefSummary.providerNotice}</p> : null}
              </div>

              <div className="brief-block">
                <h4>Top Market-Moving Events</h4>
                <div className="widget-list">
                  {briefTopEvents.slice(0, 4).map((item) => (
                    <div key={item.event} className="widget-list-item">
                      <strong>{item.event}</strong>
                      <span>{item.importanceScore}/100</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="brief-block">
                <h4>What Changed Since Yesterday</h4>
                <div className="widget-list">
                  {(briefChanges.length ? briefChanges : ["No material change detected."]).slice(0, 3).map((item) => (
                    <div key={item} className="widget-list-item"><strong>{item}</strong></div>
                  ))}
                </div>
              </div>

              <div className="brief-block">
                <h4>Monitor Today</h4>
                <div className="widget-list">
                  {(briefMonitor.length ? briefMonitor : ["No active monitor list."]).slice(0, 4).map((item) => (
                    <div key={item} className="widget-list-item"><strong>{item}</strong></div>
                  ))}
                </div>
              </div>

              <div className="brief-block">
                <h4>Portfolio/Watchlist Exposure</h4>
                <p className="company-description">Beta weighted: {Number(briefWatchlistImpact?.riskConcentration?.betaWeighted || 0).toFixed(2)}</p>
                <p className="company-description subtle">Top position: {briefWatchlistImpact?.riskConcentration?.topPosition?.symbol || "N/A"}</p>
                <p className="company-description subtle">Macro tilt: {(briefWatchlistImpact?.macroExposure || []).slice(0, 2).map((item) => `${item.name} ${Math.round(Number(item.weight || 0) * 100)}%`).join(" | ") || "N/A"}</p>
              </div>

              <div className="brief-block">
                <h4>Key Risks</h4>
                <div className="widget-list">
                  {(briefSummary?.keyRisks || dailyBrief?.topRisks || []).slice(0, 4).map((risk) => (
                    <div key={risk} className="widget-list-item"><strong>{risk}</strong></div>
                  ))}
                </div>
              </div>

              <div className="brief-block">
                <h4>Key Opportunities</h4>
                <div className="widget-list">
                  {(briefSummary?.keyOpportunities || dailyBrief?.topOpportunities || []).slice(0, 4).map((item) => (
                    <div key={item} className="widget-list-item"><strong>{item}</strong></div>
                  ))}
                </div>
              </div>

              <div className="brief-block">
                <h4>Action Cards</h4>
                <div className="widget-list">
                  {briefActionCards.map((card) => (
                    <div key={card.type} className="widget-list-item">
                      <strong>{card.type}</strong>
                      <span>{card.item?.event || "None"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="brief-block brief-block--wide">
                <h4>Personal Relevance Engine</h4>
                <div className="table-wrapper">
                  <table className="watchlist-table">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Importance</th>
                        <th>Urgency</th>
                        <th>Impact Type</th>
                        <th>Tickers</th>
                        <th>Sectors</th>
                        <th>Horizon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {briefRelevance.map((item) => (
                        <tr key={item.event}>
                          <td>{item.event}</td>
                          <td>{item.importanceScore}/100</td>
                          <td>{item.urgency}</td>
                          <td>{item.impactType}</td>
                          <td>{(item.relatedTickers || []).join(", ") || "N/A"}</td>
                          <td>{(item.relatedSectors || []).join(", ") || "N/A"}</td>
                          <td>{item.timeHorizon || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="company-description subtle">{briefRelevance[0]?.explanation || "Relevance explanation unavailable."}</p>
              </div>
            </div>
          ) : (
            <p className="company-description subtle">Autonomous brief loading...</p>
          )}
        </article>

        <article className="panel-card glass-card widget-card">
          <div className="widget-title">Market Status</div>
          <div className="widget-value">Open</div>
          <p className="company-description subtle">US equities in active session. Volatility moderate, breadth constructive.</p>
        </article>

        <article className="panel-card glass-card widget-card">
          <div className="widget-title">Fear & Greed</div>
          <div className="widget-value">{fearGreedValue}/100</div>
          <div className="meter">
            <div className="meter-fill meter-fill--greed" style={{ width: `${fearGreedValue}%` }} />
          </div>
        </article>

        <article className="panel-card glass-card widget-card">
          <div className="widget-title">Watchlist Summary</div>
          <div className="widget-value">{watchlistRows.length} tracked</div>
          <p className="company-description subtle">{positiveCount} up today, {Math.max(watchlistRows.length - positiveCount, 0)} down today.</p>
        </article>

        <article className="panel-card glass-card widget-card">
          <div className="widget-title">Today&apos;s Opportunities</div>
          <div className="widget-list">
            {todayOpportunities.length ? todayOpportunities.map((item) => (
              <div key={item.symbol} className="widget-list-item">
                <strong>{item.symbol}</strong>
                <span className={Number(item.change || 0) >= 0 ? "positive" : "negative"}>
                  {Number(item.change || 0) >= 0 ? "+" : ""}{Number(item.change || 0).toFixed(2)}%
                </span>
              </div>
            )) : <p className="company-description subtle">Add tickers to view opportunities.</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">AI Insight of the Day</div>
          {strongestOpportunity ? (
            <>
              <div className="widget-value">{strongestOpportunity.symbol} {strongestOpportunity.aiRating || "Hold"}</div>
              <p className="company-description">
                Highest conviction signal currently sits on {strongestOpportunity.symbol} with AI score {Number(strongestOpportunity.aiScore || 0)}/100.
                {highestRisk ? ` Primary risk watch remains ${highestRisk.symbol}.` : ""}
              </p>
            </>
          ) : (
            <p className="company-description subtle">Run AI analysis and build your watchlist to generate daily insights.</p>
          )}
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Top Movers</div>
          <div className="mover-grid">
            {topMovers.length ? topMovers.map((mover) => (
              <div key={mover.symbol} className="mover-card">
                <strong>{mover.symbol}</strong>
                <span className={Number(mover.change || 0) >= 0 ? "positive" : "negative"}>
                  {Number(mover.change || 0) >= 0 ? "+" : ""}{Number(mover.change || 0).toFixed(2)}%
                </span>
                <small>{mover.aiRating || "Hold"}</small>
              </div>
            )) : <p className="company-description subtle">No movers yet.</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Smart Money Positioning</div>
          {altSignals ? (
            <div className="widget-list">
              <div className="widget-list-item">
                <strong>{altSignals.smartMoneyPositioning?.signal || "Neutral"}</strong>
                <span>{altSignals.smartMoneyPositioning?.market || "COT"}</span>
              </div>
              <p className="company-description subtle">Net {Number(altSignals.smartMoneyPositioning?.netPositioning || 0).toLocaleString()} | Weekly {Number(altSignals.smartMoneyPositioning?.weeklyChange || 0).toLocaleString()}</p>
            </div>
          ) : (
            <p className="company-description subtle">COT feed loading...</p>
          )}
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Prediction Market Signals</div>
          {topPrediction ? (
            <div className="widget-list">
              <div className="widget-list-item">
                <strong>{Math.round(Number(topPrediction.probability || 0) * 100)}%</strong>
                <span>{topPrediction.trend}</span>
              </div>
              <p className="company-description">{topPrediction.event}</p>
            </div>
          ) : (
            <p className="company-description subtle">Prediction market feed loading...</p>
          )}
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Macro Regime</div>
          {macroRegime ? (
            <div className="widget-list">
              <div className="widget-list-item"><strong>Risk</strong><span>{macroRegime.riskMode}</span></div>
              <div className="widget-list-item"><strong>Inflation</strong><span>{macroRegime.inflationPressure}</span></div>
              <div className="widget-list-item"><strong>Recession</strong><span>{macroRegime.recessionRisk}</span></div>
            </div>
          ) : (
            <p className="company-description subtle">Macro regime loading...</p>
          )}
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Upcoming Events</div>
          {upcomingEvents.length ? (
            <div className="widget-list">
              {upcomingEvents.slice(0, 3).map((event) => (
                <div key={`${event.date}-${event.event}`} className="widget-list-item">
                  <strong>{event.event}</strong>
                  <span>{event.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="company-description subtle">No high-risk events in the next window.</p>
          )}
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Political/Regulatory Watch</div>
          {altSignals ? (
            <>
              <p className="company-description">{altSignals.politicalTradingSignal || "No active signal."}</p>
              <p className="company-description subtle">SEC signal: {altSignals.secFilingSignal || "Unavailable"}</p>
            </>
          ) : (
            <p className="company-description subtle">Political and filing watch loading...</p>
          )}
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Global Risk Monitor</div>
          {intelligenceAnalysis ? (
            <>
              <div className="widget-value">{intelligenceAnalysis.confidenceScore}/100</div>
              <p className="company-description">{intelligenceAnalysis.event} | Horizon: {intelligenceAnalysis.timeHorizon}</p>
            </>
          ) : (
            <p className="company-description subtle">Global risk model loading...</p>
          )}
        </article>

        <article className="panel-card glass-card widget-card">
          <div className="widget-title">Market Regime</div>
          <div className="widget-value">{String(marketRegimeLabel).toUpperCase()}</div>
          <p className="company-description subtle">Aligned with macro and scenario engine state.</p>
        </article>

        <article className="panel-card glass-card widget-card">
          <div className="widget-title">Sector Rotation</div>
          <div className="widget-list">
            {(sectorConcentration.length ? sectorConcentration : topOpportunities).slice(0, 3).map((item) => (
              <div key={typeof item === "string" ? item : item.name} className="widget-list-item">
                <strong>{typeof item === "string" ? item : item.name}</strong>
                <span>{typeof item === "string" ? "watch" : `${Math.round(Number(item.weight || 0) * 100)}%`}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card glass-card widget-card">
          <div className="widget-title">Capital Flow</div>
          {capitalFlowHint ? (
            <>
              <div className="widget-value">{capitalFlowHint.from} → {capitalFlowHint.to}</div>
              <p className="company-description subtle">Flow direction: {capitalFlowHint.effect}</p>
            </>
          ) : (
            <p className="company-description subtle">Flow map loading...</p>
          )}
        </article>

        <article className="panel-card glass-card widget-card">
          <div className="widget-title">AI Conviction Meter</div>
          <div className="widget-value">{confidenceScore}/100</div>
          <div className="meter">
            <div className="meter-fill meter-fill--confidence" style={{ width: `${confidenceScore}%` }} />
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Top Macro Risks</div>
          <div className="widget-list">
            {(topRisks.length ? topRisks : ["No elevated risks detected."]).slice(0, 3).map((risk) => (
              <div key={risk} className="widget-list-item"><strong>{risk}</strong></div>
            ))}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Top Opportunities</div>
          <div className="widget-list">
            {(topOpportunities.length ? topOpportunities : ["No clear opportunity cluster yet."]).slice(0, 4).map((opportunity) => (
              <div key={opportunity} className="widget-list-item"><strong>{opportunity}</strong></div>
            ))}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Global Heatmap</div>
          <div className="heatmap-grid">
            {impactedCountries.length ? impactedCountries.map((country, index) => (
              <div key={country} className={`heatmap-tile ${index % 2 === 0 ? "up" : "down"}`}>
                <strong>{country}</strong>
                <small>{index % 2 === 0 ? "Risk premium rising" : "Flow stabilization"}</small>
              </div>
            )) : (
              <p className="company-description subtle">Heatmap loading...</p>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <WatchlistTable rows={watchlistRows} errorMessage={watchlistError} isLoading={watchlistLoading} />
        <AIInsightsSidebar />
      </section>
    </main>
  );
}
