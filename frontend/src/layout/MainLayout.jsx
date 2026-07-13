import { Suspense, lazy, useCallback, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "../components/Header";
import ScreenErrorBoundary from "../components/ScreenErrorBoundary";
import useWatchlist from "../hooks/useWatchlist";
import {
  DashboardFeature,
  AnalysisFeature,
  NewsFeature,
  WatchlistFeature,
  AlertsFeature,
  PortfolioFeature,
  SettingsFeature,
  RecommendationsFeature,
  MyProfileFeature,
  HomeFeature,
  ThemesFeature,
} from "../features";

const GlobalIntelligenceFeature = lazy(() => import("../features/intelligence/GlobalIntelligenceFeature"));

const screenMap = {
  Home: HomeFeature,
  Dashboard: DashboardFeature,
  "Daily Feed": NewsFeature,
  "AI Analysis": AnalysisFeature,
  Watchlist: WatchlistFeature,
  "Global Intelligence": GlobalIntelligenceFeature,
  Themes: ThemesFeature,
  Alerts: AlertsFeature,
  Portfolio: PortfolioFeature,
  Recommendations: RecommendationsFeature,
  "My Profile": MyProfileFeature,
  Settings: SettingsFeature,
};

export default function MainLayout() {
  // Sprint 20 — Home is now the default landing screen (four questions
  // only); the existing, richer Dashboard stays reachable from the sidebar.
  const [activeView, setActiveView] = useState("Home");
  const { watchlist } = useWatchlist();

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
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} favorites={watchlist} onSelectFavorite={handleSelectFavorite} />
      <div className="main-panel">
        <Header watchlist={watchlist} onQuickSearch={handleQuickSearch} onNavigate={setActiveView} />
        {(() => {
          const ActiveScreen = screenMap[activeView] || DashboardFeature;
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
    </div>
  );
}