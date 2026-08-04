import { useEffect, useMemo, useState } from "react";
import MarketContextStrip from "./dashboard/MarketContextStrip";
import DailyBriefHero from "./dashboard/DailyBriefHero";
import PriorityIntelligenceCards from "./dashboard/PriorityIntelligenceCards";
import PortfolioRiskPanel from "./dashboard/PortfolioRiskPanel";
import WatchlistPriorityPanel from "./dashboard/WatchlistPriorityPanel";
import AskImpactOnePanel from "./dashboard/AskImpactOnePanel";
import OpportunityModule from "./dashboard/OpportunityModule";
import RecommendationsPreview from "./dashboard/RecommendationsPreview";
import DailyBriefArchive from "./dashboard/DailyBriefArchive";
import DashboardFooter from "./dashboard/DashboardFooter";
import useWatchlist from "../hooks/useWatchlist";
import usePortfolioEngine from "../hooks/usePortfolioEngine";
import useRecommendations from "../hooks/useRecommendations";
import { altDataApi, intelligenceApi, marketApi, watchlistApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { computeDiversification, computeRiskScore, rankPriorityCards, sortMoversByChange } from "../utils/dashboardMetrics";
import { startVisibilityAwarePolling } from "../utils/pollWhileVisible";

const DEFAULT_SCENARIOS = ["Oil spike", "Fed rate hike", "BTC ETF approval", "Israel conflict"];
const INDEX_PROXIES = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq" },
  { symbol: "IWM", label: "Russell" },
];

function selectTicker(symbol) {
  window.dispatchEvent(new CustomEvent("impactone:select-ticker", { detail: symbol }));
}

export default function DashboardHome({ onNavigate }) {
  const { watchlist, addTicker } = useWatchlist();
  const { summary: portfolioSummary, isLoading: isPortfolioLoading, error: portfolioError } = usePortfolioEngine();
  const { recommendations, isLoading: isRecommendationsLoading, error: recommendationsError } = useRecommendations();

  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState("");
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);

  const [watchlistRows, setWatchlistRows] = useState([]);
  const [watchlistError, setWatchlistError] = useState("");
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(true);

  const [indexQuotes, setIndexQuotes] = useState([]);
  const [sparklinePoints, setSparklinePoints] = useState([]);

  const [altSummary, setAltSummary] = useState(null);

  const [archive, setArchive] = useState([]);
  const [archiveError, setArchiveError] = useState("");
  const [isArchiveLoading, setIsArchiveLoading] = useState(true);

  // Daily brief + priority feed + alpha discovery + alerts share one payload.
  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const payload = await intelligenceApi.overview({
          watchlist: watchlist.length ? watchlist : ["AAPL", "NVDA", "TSLA"],
          scenarios: DEFAULT_SCENARIOS,
          sessionType: "morning",
        });
        if (!cancelled) {
          setOverview(payload);
          setOverviewError("");
        }
      } catch (error) {
        logError("Dashboard overview load failed", error);
        if (!cancelled) {
          setOverviewError(error?.message || "Unable to load intelligence overview.");
        }
      } finally {
        if (!cancelled) {
          setIsOverviewLoading(false);
        }
      }
    }

    loadOverview();
    const stopPolling = startVisibilityAwarePolling(loadOverview, 60000);
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [watchlist]);

  // Watchlist rows (price/change/AI rating) for the movers/priority panel.
  useEffect(() => {
    let cancelled = false;

    async function loadWatchlist() {
      if (!watchlist.length) {
        setWatchlistRows([]);
        setWatchlistError("");
        setIsWatchlistLoading(false);
        return;
      }

      setIsWatchlistLoading(true);
      try {
        const data = await watchlistApi.getIntelligence(watchlist);
        if (!cancelled) {
          setWatchlistRows(data.watchlist || []);
          setWatchlistError("");
        }
      } catch (error) {
        logError("Dashboard watchlist load failed", error);
        if (!cancelled) {
          setWatchlistRows([]);
          setWatchlistError(error?.message || "Unable to load watchlist.");
        }
      } finally {
        if (!cancelled) {
          setIsWatchlistLoading(false);
        }
      }
    }

    loadWatchlist();
  }, [watchlist]);

  // Index proxies for the Market Context Strip + hero sparkline (SPY chart).
  useEffect(() => {
    let cancelled = false;

    async function loadIndices() {
      const results = await Promise.all(
        INDEX_PROXIES.map((index) => marketApi.getQuote(index.symbol).catch(() => null))
      );
      if (cancelled) {
        return;
      }

      setIndexQuotes(
        INDEX_PROXIES.map((index, position) => ({
          symbol: index.symbol,
          label: index.label,
          changePercent: results[position]?.quote?.changePercent || 0,
        }))
      );
      setSparklinePoints(results[0]?.chart || []);
    }

    loadIndices();
  }, []);

  // Macro regime for the risk panel + market strip context line.
  useEffect(() => {
    let cancelled = false;

    async function loadAlt() {
      const anchor = watchlist[0] || "AAPL";
      const summary = await altDataApi.getSummary(anchor).catch(() => null);
      if (!cancelled) {
        setAltSummary(summary);
      }
    }

    loadAlt();
  }, [watchlist]);

  // Daily brief archive preview.
  useEffect(() => {
    let cancelled = false;

    async function loadArchive() {
      try {
        const data = await intelligenceApi.dailyBriefArchive({ limit: 7 });
        if (!cancelled) {
          setArchive(data.briefs || []);
          setArchiveError("");
        }
      } catch (error) {
        logError("Dashboard archive load failed", error);
        if (!cancelled) {
          setArchiveError(error?.message || "Unable to load the brief archive.");
        }
      } finally {
        if (!cancelled) {
          setIsArchiveLoading(false);
        }
      }
    }

    loadArchive();
  }, []);

  const dailyBrief = overview?.dailyBrief || null;
  const feed = overview?.feed || [];
  const alerts = overview?.alerts || [];
  const watchlistRankings = overview?.watchlistRankings || [];
  const alphaDiscovery = overview?.alphaDiscovery || null;
  const macroRegime = overview?.globalMap?.macroRegime || altSummary?.signals?.macroRegime || null;

  const priorityCards = useMemo(
    () => rankPriorityCards({ feed, alerts, watchlist }, 5).map((item) => ({ id: item.id, ...item })),
    [feed, alerts, watchlist]
  );

  const movers = useMemo(() => sortMoversByChange(watchlistRows, 5), [watchlistRows]);

  const watchlistPriorityRows = useMemo(() => {
    const byScore = new Map(watchlistRankings.map((item) => [item.symbol, item]));
    return watchlistRows
      .map((row) => {
        const ranking = byScore.get(row.symbol);
        return {
          symbol: row.symbol,
          change: row.change,
          overallAiScore: ranking?.overallAiScore ?? row.aiScore ?? 0,
          primaryDriver: ranking?.primaryDriver || row.aiRating,
          explanation: ranking?.explanation,
        };
      })
      .sort((a, b) => Number(b.overallAiScore || 0) - Number(a.overallAiScore || 0));
  }, [watchlistRows, watchlistRankings]);

  const diversification = useMemo(
    () => computeDiversification(portfolioSummary?.allocation?.bySector || []),
    [portfolioSummary]
  );

  const riskScore = useMemo(() => computeRiskScore({
    positionsValue: portfolioSummary?.positionsValue || 0,
    totalValue: portfolioSummary?.totalValue || 0,
    largestSectorWeightPct: diversification.largestWeightPct,
    macroRegime,
  }), [portfolioSummary, diversification, macroRegime]);

  const topRiskPositions = useMemo(() => {
    return [...(portfolioSummary?.positions || [])]
      .sort((a, b) => Number(b.marketValue || 0) - Number(a.marketValue || 0))
      .slice(0, 3);
  }, [portfolioSummary]);

  const riskSuggestions = useMemo(() => {
    const suggestions = [];
    if (diversification.largestWeightPct >= 40) {
      suggestions.push(`Consider trimming ${diversification.largestSector} — it's ${diversification.largestWeightPct}% of the portfolio.`);
    }
    if (macroRegime?.recessionRisk === "high") {
      suggestions.push("Recession risk is elevated — review defensive allocation.");
    }
    return suggestions;
  }, [diversification, macroRegime]);

  const chatContext = useMemo(() => ({
    watchlist,
    topEvent: feed[0]?.headline || null,
    portfolioTotalValue: portfolioSummary?.totalValue || null,
  }), [watchlist, feed, portfolioSummary]);

  const scrollToPriority = () => {
    document.getElementById("priority-intelligence")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="dashboard-content premium-dashboard mvp-dashboard">
      <MarketContextStrip
        isLoading={isOverviewLoading && !overview}
        error={overviewError}
        marketStatus="Market: Open"
        indices={indexQuotes}
        macroLine={macroRegime ? `Risk mode: ${macroRegime.riskMode}` : null}
        keyEvent={overview?.decisionCenter?.mostImportantMacroEvent?.headline}
      />

      <DailyBriefHero
        isLoading={isOverviewLoading && !overview}
        error={overviewError}
        summary={dailyBrief?.aiSummary?.executiveSummary}
        confidenceScore={dailyBrief?.aiSummary?.confidenceScore}
        bullets={[...(dailyBrief?.topRisks || []).slice(0, 2), ...(dailyBrief?.topOpportunities || []).slice(0, 1)]}
        sparklinePoints={sparklinePoints}
        onPrimaryAction={scrollToPriority}
        onSecondaryAction={() => onNavigate?.("Global Intelligence")}
      />

      <div id="priority-intelligence">
        <PriorityIntelligenceCards
          isLoading={isOverviewLoading && !overview}
          error={overviewError}
          cards={priorityCards}
        />
      </div>

      <div className="screen-grid">
        <PortfolioRiskPanel
          isLoading={isPortfolioLoading && !portfolioSummary}
          error={portfolioError}
          hasPositions={Boolean(portfolioSummary?.positions?.length)}
          totalValue={portfolioSummary?.totalValue}
          cashBalance={portfolioSummary?.cashBalance}
          riskScore={riskScore}
          diversification={diversification}
          allocationBySector={portfolioSummary?.allocation?.bySector || []}
          topRiskPositions={topRiskPositions}
          suggestions={riskSuggestions}
        />

        <WatchlistPriorityPanel
          isLoading={isWatchlistLoading}
          error={watchlistError}
          rows={watchlistPriorityRows}
          onOpenTicker={(symbol) => { onNavigate?.("AI Analysis"); selectTicker(symbol); }}
          onAddStarter={addTicker}
        />
      </div>

      <AskImpactOnePanel context={chatContext} />

      <OpportunityModule
        isLoading={isOverviewLoading && !overview}
        error={overviewError}
        ideas={alphaDiscovery?.top10InvestmentIdeas || []}
        watchlist={watchlist}
        onAddToWatchlist={addTicker}
      />

      <RecommendationsPreview
        isLoading={isRecommendationsLoading}
        error={recommendationsError}
        recommendations={recommendations}
        onViewAll={() => onNavigate?.("Recommendations")}
      />

      <DailyBriefArchive isLoading={isArchiveLoading} error={archiveError} entries={archive} />

      {movers.length ? (
        <section className="screen-grid">
          <article className="panel-card glass-card widget-card widget-card--wide">
            <div className="widget-title">Top Movers</div>
            <div className="mover-grid">
              {movers.map((mover) => (
                <div key={mover.symbol} className="mover-card">
                  <strong>{mover.symbol}</strong>
                  <span className={Number(mover.change || 0) >= 0 ? "positive" : "negative"}>
                    {Number(mover.change || 0) >= 0 ? "+" : ""}{Number(mover.change || 0).toFixed(2)}%
                  </span>
                  <small>{mover.aiRating || "Hold"}</small>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      <DashboardFooter
        marketStatus="Market: Open"
        lastUpdated={overview?.generatedAt}
        onNavigate={onNavigate}
      />
    </main>
  );
}
