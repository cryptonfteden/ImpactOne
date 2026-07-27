import { Suspense, useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { screenMap, GlobalIntelligenceFeature } from "./screenRegistry";
import { HomeFeature } from "../features";
import Header from "../components/Header";
import OfflineBanner from "../components/OfflineBanner";
import UpdateBanner from "../components/UpdateBanner";
import WelcomeOverlay from "../components/WelcomeOverlay";
import ScreenErrorBoundary from "../components/ScreenErrorBoundary";
import StockSidePanel from "../components/StockSidePanel";
import { OPEN_SYMBOL_PANEL_EVENT } from "../utils/symbolPanel";
import { NAVIGATE_WORKSPACE_EVENT, NAVIGATE_DECISION_CENTER_EVENT, OPEN_WORKSPACE_DETAIL_EVENT } from "../utils/navigation";
import useWatchlist from "../hooks/useWatchlist";
import { trackEvent } from "../utils/analytics";
import FeedbackWidget from "../components/FeedbackWidget";
import { performanceMetricsApi } from "../services/api";
import { PlatformProvider } from "../context/PlatformContext";

// Phase X9 — Part 1, Product Analytics. Every screen this app actually
// navigates to fires the generic `screen_viewed` event (real, closed
// `screen` dimension — see analyticsService.js's KNOWN_SCREENS); the five
// screens the mission names individually ALSO fire their own specific
// named event alongside it — both are real, both queryable, neither
// duplicates the other's storage (one row per navigation, two labels).
const SCREEN_SPECIFIC_EVENT = {
  "Decision Center": "decision_center_viewed",
  Portfolio: "portfolio_viewed",
  "Market Dashboard": "market_dashboard_viewed",
  "AI Analysis": "ai_analysis_opened",
};

export default function MainLayout() {
  // Sprint 20 — Home is now the default landing screen (four questions
  // only); the existing, richer Dashboard stays reachable from the sidebar.
  const [activeView, setActiveViewRaw] = useState("Home");
  const { watchlist } = useWatchlist();

  const setActiveView = useCallback((view) => {
    // Phase X9 — Part 6, Performance Monitoring. Real time from "the
    // click that requested this screen" to "the browser actually
    // painted it" — two real animation frames is the standard, reliable
    // way to wait for a real paint to have happened (the first frame
    // just schedules the new render; the second confirms it painted).
    const navStart = performance.now();
    setActiveViewRaw(view);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        performanceMetricsApi.recordClientTiming("screenLoad", performance.now() - navStart).catch(() => {});
      });
    });
    trackEvent("screen_viewed", {}, { screen: view });
    if (SCREEN_SPECIFIC_EVENT[view]) {
      trackEvent(SCREEN_SPECIFIC_EVENT[view], {}, { screen: view });
    }
  }, []);
  // Phase X2 — Chart Panel. Any screen can open the panel in place (no
  // navigation) by dispatching this event — the same established pattern
  // as "impactone:select-ticker" — rather than prop-drilling an open
  // handler through every current and future screen.
  const [panelSymbol, setPanelSymbol] = useState(null);

  useEffect(() => {
    function handleOpenPanel(event) {
      setPanelSymbol(event.detail);
    }
    window.addEventListener(OPEN_SYMBOL_PANEL_EVENT, handleOpenPanel);
    return () => window.removeEventListener(OPEN_SYMBOL_PANEL_EVENT, handleOpenPanel);
  }, []);

  // Phase X4 — Notification Center deep-links into Workspace/Decision.
  // Chart deep-links reuse the panel event above unchanged (works from
  // any screen already); these two require an actual screen switch.
  useEffect(() => {
    function handleNavigateWorkspace(event) {
      setActiveView("Watchlist Folders");
      window.dispatchEvent(new CustomEvent(OPEN_WORKSPACE_DETAIL_EVENT, { detail: event.detail }));
    }
    function handleNavigateDecisionCenter() {
      setActiveView("Decision Center");
    }
    window.addEventListener(NAVIGATE_WORKSPACE_EVENT, handleNavigateWorkspace);
    window.addEventListener(NAVIGATE_DECISION_CENTER_EVENT, handleNavigateDecisionCenter);
    return () => {
      window.removeEventListener(NAVIGATE_WORKSPACE_EVENT, handleNavigateWorkspace);
      window.removeEventListener(NAVIGATE_DECISION_CENTER_EVENT, handleNavigateDecisionCenter);
    };
  }, []);

  const handleSelectFavorite = useCallback((ticker) => {
    setActiveView("AI Analysis");
    window.dispatchEvent(new CustomEvent("impactone:select-ticker", { detail: ticker }));
  }, []);

  const handleQuickSearch = useCallback((ticker) => {
    const normalized = String(ticker || "").trim().toUpperCase();
    if (!normalized) {
      return;
    }

    setActiveView("AI Analysis");
    window.dispatchEvent(new CustomEvent("impactone:select-ticker", { detail: normalized }));
  }, []);

  return (
    <PlatformProvider navigate={setActiveView}>
    <div className="app-shell">
      <WelcomeOverlay />
      <Sidebar activeView={activeView} onNavigate={setActiveView} favorites={watchlist} onSelectFavorite={handleSelectFavorite} />
      <div className="main-panel">
        <Header watchlist={watchlist} onQuickSearch={handleQuickSearch} onNavigate={setActiveView} />
        <OfflineBanner />
        <UpdateBanner />
        {(() => {
          const ActiveScreen = screenMap[activeView] || HomeFeature;
          if (activeView === "AI Analysis") {
            return (
              <ScreenErrorBoundary>
                <ActiveScreen onNavigate={setActiveView} />
              </ScreenErrorBoundary>
            );
          }

          if (activeView === "Global Intelligence") {
            return (
              <Suspense fallback={<div className="screen-page"><p className="company-description">Loading global intelligence...</p></div>}>
                <ActiveScreen onNavigate={setActiveView} />
              </Suspense>
            );
          }

          return <ActiveScreen onNavigate={setActiveView} />;
        })()}
      </div>
      <BottomNav activeView={activeView} onNavigate={setActiveView} />
      {panelSymbol ? <StockSidePanel symbol={panelSymbol} onClose={() => setPanelSymbol(null)} /> : null}
      <FeedbackWidget currentScreen={activeView} />
    </div>
    </PlatformProvider>
  );
}