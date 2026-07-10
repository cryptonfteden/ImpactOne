import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "../components/Header";
import ScreenErrorBoundary from "../components/ScreenErrorBoundary";
import useWatchlist from "../hooks/useWatchlist";
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
  const { watchlist } = useWatchlist();

  const handleSelectFavorite = (ticker) => {
    setActiveView("AI Analysis");
    window.dispatchEvent(new CustomEvent("impactone:select-ticker", { detail: ticker }));
  };

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} favorites={watchlist} onSelectFavorite={handleSelectFavorite} />
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