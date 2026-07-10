import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "../components/Header";
import ScreenErrorBoundary from "../components/ScreenErrorBoundary";
import DashboardScreen from "../screens/DashboardScreen";
import AiAnalysisScreen from "../screens/AiAnalysisScreen";
import MarketNewsScreen from "../screens/MarketNewsScreen";
import WatchlistScreen from "../screens/WatchlistScreen";
import AlertsScreen from "../screens/AlertsScreen";
import PortfolioScreen from "../screens/PortfolioScreen";

const screenMap = {
  Dashboard: DashboardScreen,
  "Market News": MarketNewsScreen,
  "AI Analysis": AiAnalysisScreen,
  Watchlist: WatchlistScreen,
  Alerts: AlertsScreen,
  Portfolio: PortfolioScreen,
};

export default function MainLayout() {
  const [activeView, setActiveView] = useState("Dashboard");
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
    if (typeof window !== "undefined") {
      localStorage.setItem("impactone-favorites", JSON.stringify(favorites));
    }
  }, [favorites]);

  const handleSelectFavorite = (ticker) => {
    setActiveView("AI Analysis");
    window.dispatchEvent(new CustomEvent("impactone:select-ticker", { detail: ticker }));
  };

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} favorites={favorites} onSelectFavorite={handleSelectFavorite} />
      <div className="main-panel">
        <Header />
        {(() => {
          const ActiveScreen = screenMap[activeView] || DashboardScreen;
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