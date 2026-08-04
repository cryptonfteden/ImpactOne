import { useEffect, useState } from "react";
import {
  morningBriefApi,
  claimsApi,
  portfolioEngineApi,
  recommendationsApi,
  marketApi,
  committeeIntelligenceApi,
  altDataApi,
  priceAlertsApi,
} from "../../services/api";
import { withRequestCache } from "../../services/requestCache";
import { logError } from "../../utils/errorHandling";

// Phase PLATFORM-INTEGRATION-001's precedent (MissionControlHomeScreen.jsx)
// — reusing the exact same real cache key for the exact same real call
// means opening the Flagship Screen after (or before) Mission Control
// within the TTL window reuses one real fetch instead of issuing a
// second.
const OVERNIGHT_CHANGES_CACHE_KEY = "claims:overnight-changes:10";
const MARKET_PROXY_SYMBOL = "SPY";

const EMPTY_PANEL_STATE = { status: "loading", data: null };

function initialPanelState() {
  return {
    aiMarketSummary: EMPTY_PANEL_STATE,
    globalEvents: EMPTY_PANEL_STATE,
    portfolioHealth: EMPTY_PANEL_STATE,
    aiRecommendations: EMPTY_PANEL_STATE,
    watchlist: EMPTY_PANEL_STATE,
    fearGreed: EMPTY_PANEL_STATE,
    agentConsensus: EMPTY_PANEL_STATE,
    macroCalendar: EMPTY_PANEL_STATE,
    breakingNews: EMPTY_PANEL_STATE,
    alerts: EMPTY_PANEL_STATE,
  };
}

/**
 * Phase FLAGSHIP-SCREEN-001 — the one real data hook backing every one
 * of the flagship screen's 10 required panels. Every fetch is real,
 * already-existing, already-tested backend infrastructure — nothing
 * here computes new intelligence or calls a new endpoint. Every panel
 * is fault-isolated (Promise.allSettled): one real failure never blocks
 * or blanks any of the other 9 real panels.
 * @param {string[]} watchlistSymbols
 */
export default function useFlagshipData(watchlistSymbols = []) {
  const [panels, setPanels] = useState(initialPanelState);

  useEffect(() => {
    let cancelled = false;
    const consensusSymbol = watchlistSymbols[0] || MARKET_PROXY_SYMBOL;

    async function load() {
      const [brief, activeClaims, delta, recommendations, quote, consensus, macroEvents, overnight, alerts] =
        await Promise.allSettled([
          morningBriefApi.getToday(),
          claimsApi.listActive({ limit: 8 }),
          portfolioEngineApi.getPerformanceDelta(),
          recommendationsApi.list({ status: "ACTIVE" }),
          marketApi.getQuote(MARKET_PROXY_SYMBOL),
          committeeIntelligenceApi.convene(consensusSymbol),
          altDataApi.getEvents(),
          withRequestCache(OVERNIGHT_CHANGES_CACHE_KEY, () => claimsApi.listOvernightChanges({ limit: 8 })),
          priceAlertsApi.list(),
        ]);

      if (cancelled) return;

      const next = {};

      next.aiMarketSummary =
        brief.status === "fulfilled"
          ? { status: "live", data: brief.value?.items?.[0] || null }
          : (logError("flagship: morning brief load failed", brief.reason), { status: "error", data: null });

      next.globalEvents =
        activeClaims.status === "fulfilled"
          ? { status: "live", data: activeClaims.value?.claims || [] }
          : (logError("flagship: active claims load failed", activeClaims.reason), { status: "error", data: [] });

      next.portfolioHealth =
        delta.status === "fulfilled"
          ? { status: "live", data: delta.value }
          : (logError("flagship: portfolio delta load failed", delta.reason), { status: "error", data: null });

      next.aiRecommendations =
        recommendations.status === "fulfilled"
          ? { status: "live", data: recommendations.value?.recommendations || [] }
          : (logError("flagship: recommendations load failed", recommendations.reason), { status: "error", data: [] });

      next.fearGreed =
        quote.status === "fulfilled"
          ? { status: "live", data: quote.value?.fearGreed || null }
          : (logError("flagship: quote/fearGreed load failed", quote.reason), { status: "error", data: null });

      next.agentConsensus =
        consensus.status === "fulfilled"
          ? { status: "live", data: { symbol: consensusSymbol, ...consensus.value } }
          : (logError("flagship: committee consensus load failed", consensus.reason), { status: "error", data: null });

      next.macroCalendar =
        macroEvents.status === "fulfilled"
          ? { status: "live", data: macroEvents.value?.events || [] }
          : (logError("flagship: macro events load failed", macroEvents.reason), { status: "error", data: [] });

      next.breakingNews =
        overnight.status === "fulfilled"
          ? { status: "live", data: overnight.value?.claims || [] }
          : (logError("flagship: overnight changes load failed", overnight.reason), { status: "error", data: [] });

      next.alerts =
        alerts.status === "fulfilled"
          ? { status: "live", data: alerts.value?.alerts || [] }
          : (logError("flagship: price alerts load failed", alerts.reason), { status: "error", data: [] });

      // Watchlist — real, local list (this app's existing localStorage-
      // backed watchlist, same source MainLayout/Header/Sidebar already
      // read from) plus, when non-empty, real per-symbol intelligence.
      next.watchlist = { status: "live", data: watchlistSymbols };

      setPanels(next);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistSymbols.join(",")]);

  return panels;
}
