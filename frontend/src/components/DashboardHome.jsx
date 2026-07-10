import { useEffect, useMemo, useState } from "react";
import WatchlistTable from "./WatchlistTable";
import AIInsightsSidebar from "./AIInsightsSidebar";
import useWatchlist from "../hooks/useWatchlist";
import { altDataApi, committeeApi, intelligenceApi, watchlistApi } from "../services/api";
import { logError } from "../utils/errorHandling";

export default function DashboardHome() {
  const { watchlist } = useWatchlist();
  const [watchlistRows, setWatchlistRows] = useState([]);
  const [watchlistError, setWatchlistError] = useState("");
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [altSummary, setAltSummary] = useState(null);
  const [overview, setOverview] = useState(null);
  const [committee, setCommittee] = useState(null);

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
    const symbol = overview?.watchlistRankings?.[0]?.symbol || watchlist[0] || "AAPL";

    async function loadCommittee() {
      try {
        const payload = await committeeApi.analyze({ symbol });
        if (isMounted) {
          setCommittee(payload);
        }
      } catch (error) {
        logError("Dashboard committee load failed", error);
        if (isMounted) {
          setCommittee(null);
        }
      }
    }

    loadCommittee();
    return () => {
      isMounted = false;
    };
  }, [overview, watchlist]);

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
    let intervalId;

    async function loadOverview() {
      try {
        const payload = await intelligenceApi.overview({
          watchlist: watchlist.length ? watchlist : ["AAPL", "NVDA", "TSLA"],
          scenarios: ["Oil spike", "Fed rate hike", "BTC ETF approval", "Israel conflict"],
          sessionType: "morning",
        });

        if (isMounted) {
          setOverview(payload);
        }
      } catch (error) {
        logError("Dashboard autonomous overview load failed", error);
        if (isMounted) {
          setOverview(null);
        }
      }
    }

    loadOverview();
    intervalId = setInterval(loadOverview, 60000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
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
  const dailyBrief = overview?.dailyBrief || null;
  const feed = overview?.feed || [];
  const alerts = overview?.alerts || [];
  const watchlistRankings = overview?.watchlistRankings || [];
  const globalMap = overview?.globalMap || null;
  const decisionCenter = overview?.decisionCenter || null;
  const leadEvent = feed[0] || null;
  const sectorConcentration = leadEvent?.affectedSectors || [];
  const topRisks = dailyBrief?.topRisks || (decisionCenter?.biggestRisks || []).map((item) => item.headline);
  const topOpportunities = decisionCenter?.sectorRotation || dailyBrief?.topOpportunities || [];
  const confidenceScore = Number(leadEvent?.confidence || dailyBrief?.aiSummary?.confidenceScore || 0);
  const marketRegimeLabel = globalMap?.macroRegime?.riskMode || macroRegime?.riskMode || "mixed";
  const capitalFlowHint = globalMap?.capitalFlows?.[0] || null;
  const impactedCountries = globalMap?.countriesAffected || [];
  const briefSummary = dailyBrief?.aiSummary || null;
  const briefTopEvents = dailyBrief?.topMarketMovingEvents || [];
  const briefActionCards = dailyBrief?.actionCards || [];
  const briefRelevance = dailyBrief?.relevanceItems || [];
  const briefWatchlistImpact = dailyBrief?.portfolioWatchlistExposure || null;
  const briefChanges = dailyBrief?.whatChangedSinceYesterday || [];
  const briefMonitor = dailyBrief?.whatToMonitorToday || [];
  const highestConvictionIdeas = decisionCenter?.highestConvictionIdeas || [];
  const biggestRisks = decisionCenter?.biggestRisks || [];
  const mostImportantMacroEvent = decisionCenter?.mostImportantMacroEvent || null;
  const mostImportantCompanyEvent = decisionCenter?.mostImportantCompanyEvent || null;
  const ignoredNews = decisionCenter?.mostImportantNewsIgnoredByMarkets || null;
  const changeWindows = overview?.changeWindows || {};
  const committeeSummary = committee?.committee || null;
  const alphaDiscovery = overview?.alphaDiscovery || null;
  const homepageAnswers = overview?.homepageAnswers || {};
  const topIdeas = alphaDiscovery?.top10InvestmentIdeas || [];
  const topRiskFeed = alphaDiscovery?.top10Risks || [];
  const topMacroThemes = alphaDiscovery?.topMacroThemes || [];
  const leadingSectors = alphaDiscovery?.topSectors || [];
  const hiddenOpportunities = alphaDiscovery?.hiddenOpportunities || [];
  const emergingNarratives = alphaDiscovery?.emergingNarratives || [];
  const contrarianIdeas = alphaDiscovery?.contrarianOpportunities || [];
  const institutionalPositioning = alphaDiscovery?.institutionalPositioning || null;

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
          <div className="widget-title">Autonomous Alpha Discovery Engine</div>
          <div className="brief-grid">
            <div className="brief-block">
              <h4>What matters today?</h4>
              <p className="company-description">{homepageAnswers.whatMattersToday || "Scanning global intelligence..."}</p>
            </div>
            <div className="brief-block">
              <h4>Where is money flowing?</h4>
              <p className="company-description">{homepageAnswers.whereMoneyIsFlowing || "Flow map loading..."}</p>
            </div>
            <div className="brief-block">
              <h4>What changed?</h4>
              <p className="company-description">{homepageAnswers.whatChanged || "Change engine loading..."}</p>
            </div>
            <div className="brief-block">
              <h4>What should I buy?</h4>
              <p className="company-description">{homepageAnswers.whatShouldIBuy?.symbol || homepageAnswers.whatShouldIBuy?.headline || "No high-conviction idea yet."}</p>
              <p className="company-description subtle">{homepageAnswers.whatShouldIBuy?.portfolioAction?.action || "Wait"} | {homepageAnswers.whatShouldIBuy?.portfolioAction?.expectedUpside || "N/A"}</p>
            </div>
            <div className="brief-block">
              <h4>What should I avoid?</h4>
              <p className="company-description">{homepageAnswers.whatShouldIAvoid?.headline || "No elevated risk flagged."}</p>
              <p className="company-description subtle">Risk level: {homepageAnswers.whatShouldIAvoid?.riskLevel || "N/A"}</p>
            </div>
            <div className="brief-block">
              <h4>Biggest global risk</h4>
              <p className="company-description">{homepageAnswers.biggestGlobalRisk?.headline || "No singular risk leader."}</p>
              <p className="company-description subtle">{homepageAnswers.biggestGlobalRisk?.whyItMatters || "Global risk scan in progress."}</p>
            </div>
          </div>
        </article>

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
          {leadEvent ? (
            <>
              <div className="widget-value">{leadEvent.importanceScore}/100</div>
              <p className="company-description">{leadEvent.headline} | Horizon: {leadEvent.timeHorizon}</p>
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
              <p className="company-description subtle">{capitalFlowHint.rationale}</p>
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

        <article className="panel-card glass-card widget-card widget-card--full">
          <div className="widget-title">Live Intelligence Feed</div>
          <div className="news-list">
            {feed.length ? feed.slice(0, 5).map((item) => (
              <article key={item.id} className="news-item news-item--premium">
                <div className="news-item__icon">◉</div>
                <div>
                  <div className="news-item__meta">{item.eventType} • {item.confidence}/100 confidence • {item.actionability}</div>
                  <h4>{item.headline}</h4>
                  <p>{item.whyItMatters}</p>
                  <p className="company-description subtle">Assets: {(item.affectedAssets || []).slice(0, 5).join(", ") || "N/A"} | Analogue: {item.historicalAnalogue} | Risk: {item.riskLevel}</p>
                </div>
              </article>
            )) : <p className="company-description subtle">Autonomous event feed loading...</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--full">
          <div className="widget-title">Top 10 Investment Ideas</div>
          <div className="table-wrapper">
            <table className="watchlist-table">
              <thead>
                <tr>
                  <th>Idea</th>
                  <th>Conviction</th>
                  <th>Action</th>
                  <th>Position Size</th>
                  <th>Expected Upside</th>
                  <th>Risk/Reward</th>
                </tr>
              </thead>
              <tbody>
                {topIdeas.slice(0, 10).map((idea) => (
                  <tr key={`${idea.symbol}-${idea.primaryDriver}`}>
                    <td>{idea.symbol}</td>
                    <td>{idea.convictionScore}</td>
                    <td>{idea.portfolioAction?.action || "Wait"}</td>
                    <td>{idea.portfolioAction?.positionSize || "N/A"}</td>
                    <td>{idea.portfolioAction?.expectedUpside || "N/A"}</td>
                    <td>{idea.portfolioAction?.riskRewardRatio || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Top 10 Risks</div>
          <div className="widget-list">
            {topRiskFeed.length ? topRiskFeed.slice(0, 10).map((item) => (
              <div key={item.id} className="widget-list-item">
                <strong>{item.headline}</strong>
                <span>{item.importanceScore}/100</span>
              </div>
            )) : <p className="company-description subtle">Risk discovery engine loading...</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Top Macro Themes</div>
          <div className="widget-list">
            {topMacroThemes.length ? topMacroThemes.map((item) => (
              <div key={item.theme} className="widget-list-item">
                <strong>{item.theme}</strong>
                <span>{item.count} drivers</span>
              </div>
            )) : <p className="company-description subtle">Macro theme engine loading...</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Top Sectors</div>
          <div className="widget-list">
            {leadingSectors.length ? leadingSectors.map((item) => (
              <div key={item.sector} className="widget-list-item">
                <strong>{item.sector}</strong>
                <span>{item.count}</span>
              </div>
            )) : <p className="company-description subtle">Sector scan loading...</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Institutional Positioning</div>
          {institutionalPositioning ? (
            <>
              <p className="company-description">Smart money: {institutionalPositioning.smartMoney?.signal || "N/A"}</p>
              <p className="company-description subtle">Prediction markets: {institutionalPositioning.predictionMarkets?.event || "N/A"}</p>
            </>
          ) : <p className="company-description subtle">Institutional positioning loading...</p>}
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Hidden Opportunities</div>
          <div className="widget-list">
            {hiddenOpportunities.length ? hiddenOpportunities.map((item) => (
              <div key={item.id} className="widget-list-item">
                <strong>{item.headline}</strong>
                <span>{item.actionability}</span>
              </div>
            )) : <p className="company-description subtle">No hidden opportunities detected yet.</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Emerging Narratives</div>
          <div className="widget-list">
            {emergingNarratives.length ? emergingNarratives.map((item) => (
              <div key={item} className="widget-list-item"><strong>{item}</strong></div>
            )) : <p className="company-description subtle">Narrative engine loading...</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Contrarian Opportunities</div>
          <div className="widget-list">
            {contrarianIdeas.length ? contrarianIdeas.map((item) => (
              <div key={item.symbol} className="widget-list-item">
                <strong>{item.symbol}</strong>
                <span>{item.portfolioAction?.action || "Wait"}</span>
              </div>
            )) : <p className="company-description subtle">No contrarian setup detected.</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Today&apos;s Highest Conviction Ideas</div>
          <div className="widget-list">
            {highestConvictionIdeas.length ? highestConvictionIdeas.map((item) => (
              <div key={item.symbol} className="widget-list-item">
                <strong>{item.symbol}</strong>
                <span>{item.overallAiScore}/100</span>
              </div>
            )) : <p className="company-description subtle">Idea engine loading...</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Today&apos;s Biggest Risks</div>
          <div className="widget-list">
            {biggestRisks.length ? biggestRisks.map((item) => (
              <div key={item.id} className="widget-list-item">
                <strong>{item.headline}</strong>
                <span>{item.riskLevel}</span>
              </div>
            )) : <p className="company-description subtle">Risk engine loading...</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Most Important Macro Event</div>
          {mostImportantMacroEvent ? (
            <>
              <div className="widget-value">{mostImportantMacroEvent.headline}</div>
              <p className="company-description subtle">{mostImportantMacroEvent.whyItMatters}</p>
            </>
          ) : <p className="company-description subtle">Macro event ranking loading...</p>}
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Most Important Company Event</div>
          {mostImportantCompanyEvent ? (
            <>
              <div className="widget-value">{mostImportantCompanyEvent.headline}</div>
              <p className="company-description subtle">{mostImportantCompanyEvent.whyItMatters}</p>
            </>
          ) : <p className="company-description subtle">Company event ranking loading...</p>}
        </article>

        <article className="panel-card glass-card widget-card widget-card--wide">
          <div className="widget-title">Most Important News Ignored By Markets</div>
          {ignoredNews ? (
            <>
              <div className="widget-value">{ignoredNews.headline}</div>
              <p className="company-description subtle">{ignoredNews.whyItMatters}</p>
            </>
          ) : <p className="company-description subtle">No ignored high-importance story detected.</p>}
        </article>

        <article className="panel-card glass-card widget-card widget-card--full">
          <div className="widget-title">What Changed?</div>
          <div className="ai-report__grid">
            <div>
              <h4>Last 15 minutes</h4>
              <ul className="stack-list">
                {(changeWindows.last15Minutes || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h4>Last hour</h4>
              <ul className="stack-list">
                {(changeWindows.lastHour || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h4>Since market open</h4>
              <ul className="stack-list">
                {(changeWindows.sinceMarketOpen || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h4>Weekly</h4>
              <ul className="stack-list">
                {(changeWindows.weekly || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--full">
          <div className="widget-title">Intelligent Alerts</div>
          <div className="widget-list">
            {alerts.length ? alerts.map((item) => (
              <div key={item.id} className="widget-list-item">
                <strong>{item.headline}</strong>
                <span>{item.confidence}/100 • {item.actionability}</span>
              </div>
            )) : <p className="company-description subtle">No alert crossed confidence, impact, and exposure thresholds.</p>}
          </div>
        </article>

        <article className="panel-card glass-card widget-card widget-card--full">
          <div className="widget-title">Investment Committee</div>
          {committeeSummary ? (
            <div className="brief-grid">
              <div className="brief-block">
                <h4>Final Recommendation</h4>
                <div className={`score-card__recommendation ${String(committeeSummary.cio?.decision || "Hold").toLowerCase().replace(/\s+/g, "-")}`}>{committeeSummary.cio?.decision || "Hold"}</div>
                <p className="company-description">{committeeSummary.cio?.executiveSummary || "Committee summary unavailable."}</p>
                <p className="company-description subtle">Confidence {committeeSummary.cio?.confidence ?? 0}/100 | Agreement {committeeSummary.committeeAgreement ?? 0}%</p>
              </div>
              <div className="brief-block">
                <h4>Votes</h4>
                <div className="widget-list">
                  {(committeeSummary.agents || []).map((agent) => (
                    <div key={agent.agent} className="widget-list-item">
                      <strong>{agent.agent}</strong>
                      <span>{agent.vote}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="brief-block">
                <h4>Reasoning</h4>
                <p className="company-description subtle">Catalysts: {(committeeSummary.cio?.catalysts || []).slice(0, 2).join(" | ") || "N/A"}</p>
                <p className="company-description subtle">Threats: {(committeeSummary.cio?.threats || []).slice(0, 2).join(" | ") || "N/A"}</p>
                {committeeSummary.expertsDisagree ? <p className="company-description subtle">Experts disagree: {committeeSummary.disagreementExplanation}</p> : null}
              </div>
            </div>
          ) : (
            <p className="company-description subtle">Committee debate loading...</p>
          )}
        </article>

        <article className="panel-card glass-card widget-card widget-card--full">
          <div className="widget-title">Watchlist Priority Engine</div>
          <div className="table-wrapper">
            <table className="watchlist-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Opportunity</th>
                  <th>Risk</th>
                  <th>Momentum</th>
                  <th>Institutional</th>
                  <th>Prediction</th>
                  <th>Macro</th>
                  <th>Event</th>
                  <th>AI Score</th>
                </tr>
              </thead>
              <tbody>
                {watchlistRankings.map((item) => (
                  <tr key={item.symbol}>
                    <td>{item.symbol}</td>
                    <td>{item.opportunityScore}</td>
                    <td>{item.riskScore}</td>
                    <td>{item.momentum}</td>
                    <td>{item.institutionalActivity}</td>
                    <td>{item.predictionMarketSignal}</td>
                    <td>{item.macroExposure}</td>
                    <td>{item.eventExposure}</td>
                    <td>{item.overallAiScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
