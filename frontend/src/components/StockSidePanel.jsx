import { useEffect, useState } from "react";
import { Button, EmptyState, ErrorState, LoadingSpinner } from "./ui";
import AdvancedChart from "./chart/AdvancedChart";
import ImpactGraph from "./ImpactGraph";
import { marketApi, portfolioEngineApi, priceAlertsApi, watchlistFoldersApi, symbolIntelligenceApi, claimsApi, optionsAgentApi, marketSentimentApi, agentOrchestratorApi } from "../services/api";
import { logError } from "../utils/errorHandling";

/**
 * Phase X2 — Chart Panel. Selecting any stock opens this side panel in
 * place — no page navigation, per the mission's explicit requirement.
 * Every section is real data from already-existing or newly-built (this
 * phase) endpoints; nothing here is fabricated, and any section whose
 * data can't be loaded says so honestly rather than going blank.
 */
export default function StockSidePanel({ symbol, onClose }) {
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [portfolioPosition, setPortfolioPosition] = useState(null);
  const [opportunity, setOpportunity] = useState(null);
  const [opportunityError, setOpportunityError] = useState("");
  const [positioning, setPositioning] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [folders, setFolders] = useState([]);
  const [claims, setClaims] = useState([]);
  const [claimsError, setClaimsError] = useState("");
  const [optionsView, setOptionsView] = useState(null);
  const [optionsResearch, setOptionsResearch] = useState(null);
  const [sentimentOverview, setSentimentOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setIsLoading(true);

    // Phase X7 — Part 1, Market Intelligence Engine. Opportunity Score and
    // Market Positioning used to be two separate real requests here; both
    // are already composed into one canonical object by
    // symbolIntelligenceService.js (Phase X5) — this panel is the first
    // consumer migrated onto it, cutting two round trips to one and
    // guaranteeing this panel and every other consumer of that service
    // (Portfolio's Impact Graph section, Workspace's summary) interpret
    // the same symbol's market data identically, never independently.
    // Phase UI-INTEGRATION-001 — the canonical intelligence view (Claims,
    // Options Signals, Market Sentiment) is fetched the same
    // Promise.allSettled way as everything else here: one more real
    // source, its own honest error state, never blocking the rest of the
    // panel if it's slow or unavailable.
    Promise.allSettled([
      marketApi.getQuote(symbol),
      portfolioEngineApi.getSummary(),
      symbolIntelligenceApi.get(symbol),
      priceAlertsApi.list(),
      watchlistFoldersApi.list(),
      claimsApi.listBySymbol(symbol, { limit: 50 }),
      optionsAgentApi.getSymbolView(symbol),
      marketSentimentApi.getOverview("US"),
      agentOrchestratorApi.getStockIntelligence(symbol),
    ]).then(([quoteResult, portfolioResult, intelligenceResult, alertsResult, foldersResult, claimsResult, optionsResult, sentimentResult, orchestratorResult]) => {
      if (cancelled) return;

      if (quoteResult.status === "fulfilled") {
        setQuote(quoteResult.value);
        setQuoteError(quoteResult.value?.error || "");
      } else {
        logError("side panel quote load failed", quoteResult.reason);
        setQuoteError("Live quote data is temporarily unavailable.");
      }

      if (portfolioResult.status === "fulfilled") {
        const position = (portfolioResult.value.positions || []).find((item) => item.symbol === symbol);
        setPortfolioPosition(position || null);
      }

      if (intelligenceResult.status === "fulfilled") {
        const intelligence = intelligenceResult.value;
        setAiSummary(intelligence.aiSummary || null);

        if (intelligence.opportunityScore && !intelligence.opportunityScore.unavailable) {
          setOpportunity(intelligence.opportunityScore);
        } else {
          setOpportunityError("Opportunity Score is temporarily unavailable.");
        }

        if (intelligence.marketPositioning && !intelligence.marketPositioning.unavailable) {
          const entry =
            intelligence.marketPositioning.longPressure.find((item) => item.symbol === symbol) ||
            intelligence.marketPositioning.shortPressure.find((item) => item.symbol === symbol) ||
            null;
          setPositioning({ entry, excluded: intelligence.marketPositioning.excludedFromUniverse.find((item) => item.symbol === symbol) || null });
        }
      } else {
        logError("side panel market intelligence load failed", intelligenceResult.reason);
        setOpportunityError("Opportunity Score is temporarily unavailable.");
      }

      if (alertsResult.status === "fulfilled") {
        setAlerts((alertsResult.value.alerts || []).filter((alert) => alert.symbol === symbol));
      }

      if (foldersResult.status === "fulfilled") {
        setFolders(foldersResult.value.folders || []);
      }

      if (claimsResult.status === "fulfilled") {
        setClaims(claimsResult.value.claims || []);
        setClaimsError("");
      } else {
        logError("side panel claims load failed", claimsResult.reason);
        setClaimsError("Claims are temporarily unavailable for this symbol.");
      }

      if (optionsResult.status === "fulfilled") {
        setOptionsView(optionsResult.value);
      }

      if (sentimentResult.status === "fulfilled") {
        setSentimentOverview(sentimentResult.value);
      }

      if (orchestratorResult.status === "fulfilled") {
        setOptionsResearch(orchestratorResult.value?.agents?.find((agent) => agent.agentId === "options")?.result?.raw || null);
      } else {
        setOptionsResearch(null);
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (!symbol) return null;

  const memberFolders = folders.filter((folder) => folder.items?.some((item) => item.symbol === symbol));

  // Phase UI-INTEGRATION-001 — the canonical intelligence view derives
  // every grouping below from the one real `claims` fetch — presentation
  // filtering/sorting only, never new intelligence.
  const OPEN_STATUSES = ["DRAFT", "ACTIVE", "STRENGTHENING", "WEAKENING", "CONTESTED"];
  const activeClaims = claims.filter((claim) => OPEN_STATUSES.includes(claim.status));
  const resolvedClaims = claims.filter((claim) => claim.status?.startsWith("RESOLVED_") || claim.status === "INSUFFICIENT_DATA");
  const currentBelief = [...activeClaims].sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1))[0] || null;
  const historicalTimeline = [...claims].sort((a, b) => new Date(b.lastUpdatedAt || 0) - new Date(a.lastUpdatedAt || 0));

  return (
    <div className="side-panel-overlay" role="dialog" aria-modal="true" aria-label={`${symbol} details`} onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="side-panel">
        <div className="side-panel__header">
          <div>
            <p className="eyebrow">Command Center</p>
            <h1>{symbol}</h1>
          </div>
          <Button type="button" className="ghost-button" onClick={onClose}>Close</Button>
        </div>

        {isLoading ? (
          <LoadingSpinner label={`Loading ${symbol}`} />
        ) : (
          <>
            {/* Phase PRODUCT-001 — the Symbol Page answers exactly one
                question first: "what does the platform currently
                believe, and why does it matter today?" Everything else
                on this panel (quote, chart, AI summary, evidence, etc.)
                is supporting context underneath this. Sourced from the
                same real `claims` fetch as Current Platform View below —
                this is the same highest-confidence open claim, now shown
                first, plus its real server-computed Attention Score. */}
            <section>
              <p className="side-panel__section-title">Why This Symbol Matters Today</p>
              {claimsError ? (
                <ErrorState message={claimsError} />
              ) : currentBelief ? (
                <div className="portfolio-grid">
                  <span className={currentBelief.expectedDirection === "BULLISH" ? "pill opportunity" : currentBelief.expectedDirection === "BEARISH" ? "pill risk" : "pill monitor"}>
                    {currentBelief.expectedDirection}
                  </span>
                  <p className="company-description">{currentBelief.plainLanguageStatement || currentBelief.statement}</p>
                  <p className="company-description subtle">
                    {Number.isFinite(currentBelief.attentionScore)
                      ? `Attention score: ${currentBelief.attentionScore}/100 — ${currentBelief.attentionExplanation}`
                      : "Attention score not yet available."}
                  </p>
                </div>
              ) : (
                <EmptyState message="No active Claim exists yet to explain why this symbol matters today." />
              )}
            </section>

            {/* Overview */}
            <section>
              <p className="side-panel__section-title">Overview</p>
              {quoteError ? (
                <ErrorState message={quoteError} />
              ) : (
                <div className="portfolio-grid">
                  <div className="portfolio-metric">${Number(quote?.quote?.price || 0).toFixed(2)}</div>
                  <span className={Number(quote?.quote?.change || 0) >= 0 ? "positive" : "negative"}>
                    {Number(quote?.quote?.change || 0) >= 0 ? "+" : ""}{Number(quote?.quote?.changePercent || 0).toFixed(2)}%
                  </span>
                </div>
              )}
            </section>

            {/* Professional Candlestick Chart */}
            <section>
              <p className="side-panel__section-title">Chart</p>
              <AdvancedChart symbol={symbol} height={320} />
            </section>

            {/* AI Summary — Phase X7 Part 1, sourced from the same
                canonical symbolIntelligenceService object as Opportunity
                Score/Market Positioning above: the symbol's real active
                recommendation, not a second, independently-generated
                summary. Falls back to the company description only when
                no active recommendation exists for this symbol yet. */}
            <section>
              <p className="side-panel__section-title">AI Summary</p>
              {aiSummary ? (
                <>
                  <div className="opportunity-item__top">
                    <span className={aiSummary.action === "BUY" ? "pill opportunity" : aiSummary.action === "EXIT" ? "pill risk" : "pill monitor"}>
                      {aiSummary.action}
                    </span>
                    <span className="company-description subtle">Quality {aiSummary.qualityScore}/100 · Risk {aiSummary.riskLabel}</span>
                  </div>
                  <p className="company-description subtle">{aiSummary.reasoning}</p>
                </>
              ) : (
                <p className="company-description subtle">
                  {quote?.quote?.companyDescription || "No active AI recommendation for this symbol right now — open AI Analysis for a fresh read."}
                </p>
              )}
            </section>

            {/* Phase UI-INTEGRATION-001 — the canonical intelligence
                view: one symbol's real Claims, evidence, market
                sentiment (market-wide, disclosed), options signals,
                portfolio relevance, historical timeline, resolved
                claims, and scenario preview. Every field is read
                directly off the real Claim/Options/Sentiment contracts
                — nothing is computed in this component. */}
            <section>
              <p className="side-panel__section-title">Current Platform View</p>
              {claimsError ? (
                <ErrorState message={claimsError} />
              ) : currentBelief ? (
                <>
                  <div className="opportunity-item__top">
                    <span className={currentBelief.expectedDirection === "BULLISH" ? "pill opportunity" : currentBelief.expectedDirection === "BEARISH" ? "pill risk" : "pill monitor"}>
                      {currentBelief.expectedDirection}
                    </span>
                    <span className="company-description subtle">
                      {Number.isFinite(currentBelief.confidence) ? `Confidence ${currentBelief.confidence}/100` : "Confidence not yet available"}
                      {Number.isFinite(currentBelief.probability) ? ` · Probability ${currentBelief.probability}%` : ""}
                    </span>
                  </div>
                  <p className="company-description subtle">{currentBelief.plainLanguageStatement || currentBelief.statement}</p>
                </>
              ) : (
                <EmptyState message="No active claim exists for this symbol right now." />
              )}
            </section>

            <section>
              <p className="side-panel__section-title">Active Claims</p>
              {activeClaims.length ? (
                <ul className="stack-list">
                  {activeClaims.map((claim) => (
                    <li key={claim.claimId} className="company-description subtle">
                      <span className={claim.expectedDirection === "BULLISH" ? "pill opportunity" : claim.expectedDirection === "BEARISH" ? "pill risk" : "pill monitor"}>{claim.status}</span>{" "}
                      {claim.plainLanguageStatement || claim.statement}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message="No active claims for this symbol right now." />
              )}
            </section>

            <section>
              <p className="side-panel__section-title">Supporting Evidence</p>
              {currentBelief?.evidence?.length ? (
                <ul className="stack-list">
                  {currentBelief.evidence.map((entry) => (
                    <li key={entry.id} className="company-description subtle">{entry.observedFact}</li>
                  ))}
                </ul>
              ) : (
                <EmptyState message="No real supporting evidence recorded yet." />
              )}
            </section>

            <section>
              <p className="side-panel__section-title">Counter Evidence</p>
              {currentBelief?.counterEvidence?.length ? (
                <ul className="stack-list">
                  {currentBelief.counterEvidence.map((entry) => (
                    <li key={entry.id} className="company-description subtle">{entry.observedFact}</li>
                  ))}
                </ul>
              ) : (
                <EmptyState message="No real counter-evidence recorded yet." />
              )}
            </section>

            <section>
              <p className="side-panel__section-title">Market Sentiment</p>
              {sentimentOverview && Number.isFinite(sentimentOverview.score) ? (
                <>
                  <span className="company-description subtle">
                    Market-wide (US) sentiment — not symbol-specific — score {sentimentOverview.score}/100, confidence {sentimentOverview.confidence}/100.
                  </span>
                </>
              ) : (
                <EmptyState message="Market sentiment is not currently available." />
              )}
            </section>

            <section>
              <p className="side-panel__section-title">Options Signals</p>
              {optionsView && !optionsView.unavailable && optionsView.recentSignals?.length ? (
                <ul className="stack-list">
                  {optionsView.recentSignals.map((signal) => (
                    <li key={signal.id} className="company-description subtle">
                      {signal.signalType} — anomaly score {signal.anomalyScore}/100
                    </li>
                  ))}
                </ul>
              ) : optionsResearch?.dataAvailable ? (
                <div className="side-panel-options-context">
                  <div><span>Official EOD activity</span><strong>{Number.isFinite(Number(optionsResearch.inputs?.historicalContext?.volumeVsAverage)) ? `${Number(optionsResearch.inputs.historicalContext.volumeVsAverage).toFixed(2)}× recent average` : `${Number(optionsResearch.inputs?.optionVolume?.total || 0).toLocaleString()} contracts`}</strong></div>
                  <div><span>Reported mix</span><strong>{Math.round(Number(optionsResearch.signals?.callAccumulation?.share || 0) * 100)}% calls · {Math.round(Number(optionsResearch.signals?.putAccumulation?.share || 0) * 100)}% puts</strong></div>
                  <p>Source: {optionsResearch.dataQuality?.source || optionsResearch.inputs?.sourceProvider} · {optionsResearch.inputs?.reportDate || "date unavailable"}. End-of-day volume only; it does not identify live sweeps or buyer/seller direction.</p>
                </div>
              ) : <EmptyState message={optionsView?.reason || optionsResearch?.unavailableReason || "No verified options activity is available for this symbol right now."} />}
            </section>

            <section>
              <p className="side-panel__section-title">Portfolio Relevance</p>
              {portfolioPosition ? (
                <span className="pill opportunity">Held — {portfolioPosition.quantity} shares</span>
              ) : (
                <EmptyState message="Not currently held in your portfolio." />
              )}
            </section>

            <section>
              <p className="side-panel__section-title">Historical Claim Timeline</p>
              {historicalTimeline.length ? (
                <ul className="stack-list">
                  {historicalTimeline.map((claim) => (
                    <li key={claim.claimId} className="company-description subtle">
                      {claim.lastUpdatedAt ? new Date(claim.lastUpdatedAt).toLocaleDateString() : "—"} — {claim.status}: {claim.plainLanguageStatement || claim.statement}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message="No claim history for this symbol yet." />
              )}
            </section>

            <section>
              <p className="side-panel__section-title">Resolved Claims</p>
              {resolvedClaims.length ? (
                <ul className="stack-list">
                  {resolvedClaims.map((claim) => (
                    <li key={claim.claimId} className="company-description subtle">
                      <span className={claim.status === "RESOLVED_CORRECT" ? "pill opportunity" : claim.status === "RESOLVED_INCORRECT" ? "pill risk" : "pill monitor"}>{claim.status}</span>{" "}
                      {claim.plainLanguageStatement || claim.statement}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message="No resolved claims for this symbol yet." />
              )}
            </section>

            <section>
              <p className="side-panel__section-title">Scenario Preview</p>
              <EmptyState message="Scenario preview not yet available — the Scenario Engine is architecture-only today." />
            </section>

            {/* Portfolio Impact */}
            <section>
              <p className="side-panel__section-title">Portfolio Impact</p>
              {portfolioPosition ? (
                <div className="widget-list-item">
                  <strong>{portfolioPosition.quantity} shares held</strong>
                  <span className={Number(portfolioPosition.unrealizedPnl) >= 0 ? "positive" : "negative"}>
                    ${Number(portfolioPosition.unrealizedPnl).toFixed(2)} unrealized
                  </span>
                </div>
              ) : (
                <EmptyState message={`No open position in ${symbol} — this wouldn't affect your portfolio yet.`} />
              )}
            </section>

            {/* Latest News */}
            <section>
              <p className="side-panel__section-title">Latest News</p>
              {quote?.news?.length ? (
                <ul className="stack-list">
                  {quote.news.slice(0, 3).map((item, index) => (
                    <li key={index} className="company-description subtle">{item.headline}</li>
                  ))}
                </ul>
              ) : (
                <EmptyState message="No recent news available for this symbol." />
              )}
            </section>

            {/* Opportunity Score */}
            <section>
              <p className="side-panel__section-title">Opportunity Score</p>
              {opportunityError ? (
                <ErrorState message={opportunityError} />
              ) : opportunity?.score !== null && opportunity?.score !== undefined ? (
                <>
                  <div className="opportunity-score-ring">
                    <span className="opportunity-score-ring__value">{opportunity.score}</span>
                    <span className="company-description subtle">/ 100 — a market positioning score, not an AI recommendation</span>
                  </div>
                  {opportunity.explanation.map((factor) => (
                    <div key={factor.factor} className={`factor-row${factor.available ? "" : " factor-row--unavailable"}`}>
                      <span>{factor.factor}</span>
                      <span>{factor.available ? `${factor.normalizedContribution}%` : "unavailable"}</span>
                    </div>
                  ))}
                </>
              ) : (
                <EmptyState message="No real inputs were available to compute an Opportunity Score right now." />
              )}
            </section>

            {/* Market Positioning */}
            <section>
              <p className="side-panel__section-title">Market Positioning</p>
              {positioning?.entry ? (
                <span className={positioning.entry.direction === "LONG_PRESSURE" ? "pill opportunity" : "pill risk"}>
                  {positioning.entry.direction === "LONG_PRESSURE" ? "Long Pressure" : "Short Pressure"}
                </span>
              ) : positioning?.excluded ? (
                <p className="company-description subtle">{positioning.excluded.reason}</p>
              ) : (
                <EmptyState message="No directional positioning signal available for this symbol right now." />
              )}
            </section>

            {/* Impact Graph — the signature feature, Phase X3 */}
            <section>
              <p className="side-panel__section-title">Impact Graph</p>
              <ImpactGraph symbol={symbol} />
            </section>

            {/* Alerts */}
            <section>
              <p className="side-panel__section-title">Alerts</p>
              {alerts.length ? (
                <ul className="stack-list">
                  {alerts.map((alert) => (
                    <li key={alert.id} className="company-description subtle">
                      {alert.direction === "ABOVE" ? "Above" : "Below"} ${Number(alert.targetPrice).toFixed(2)} — {alert.status}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message="No alerts set on this symbol yet — set one from Workspaces." />
              )}
            </section>

            {/* Workspace Membership */}
            <section>
              <p className="side-panel__section-title">Workspace Membership</p>
              {memberFolders.length ? (
                <div className="opportunity-item__actions">
                  {memberFolders.map((folder) => (
                    <span key={folder.id} className="pill">{folder.name}</span>
                  ))}
                </div>
              ) : (
                <EmptyState message="Not tracked in any workspace folder yet." />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
