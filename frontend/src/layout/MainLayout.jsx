import { useCallback, useState } from "react";
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
} from "../features";

const screenMap = {
  Dashboard: DashboardFeature,
  "Market News": NewsFeature,
  "AI Analysis": AnalysisFeature,
  Watchlist: WatchlistFeature,
  Alerts: AlertsFeature,
  Portfolio: PortfolioFeature,
  Settings: SettingsFeature,
};

export default function MainLayout() {
  const [activeView, setActiveView] = useState("Dashboard");
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
        <Header watchlist={watchlist} onQuickSearch={handleQuickSearch} />
        {(() => {
          const ActiveScreen = screenMap[activeView] || DashboardFeature;
          if (activeView === "AI Analysis") {
            return (
              <ScreenErrorBoundary>
                <ActiveScreen />
              </ScreenErrorBoundary>
            );
          }

          return <ActiveScreen />;
        })()}
      </div>
    </div>
  );
}