import { memo } from "react";
import { Button } from "../components/ui";

const navItems = ["Home", "Dashboard", "Global Intelligence", "AI Analysis", "Watchlist", "Portfolio", "Recommendations", "Daily Feed", "Themes", "Alerts", "My Profile", "Settings"];

// Sprint 23A — developer-only; only present in the nav when explicitly
// enabled at build time (same VITE_* flag precedent as
// PortfolioScreen.jsx's VITE_PORTFOLIO_ENGINE). Never shown in a normal build.
if (import.meta.env.VITE_DEV_CONSOLE === "true") {
  navItems.push("Intelligence Console");
}

function Sidebar({ activeView, onNavigate, favorites = [], onSelectFavorite }) {
  return (
    <aside className="sidebar">
      <div className="logo">ImpactOne</div>

      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        {navItems.map((item) => {
          const isActive = activeView === item;

          return (
            <Button
              key={item}
              type="button"
              className={`sidebar-link ${isActive ? "active" : ""}`.trim()}
              onClick={() => onNavigate(item)}
            >
              {item}
            </Button>
          );
        })}
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-section__title">Watchlist</div>
        {favorites.length ? (
          <div className="favorites-list">
            {favorites.map((ticker) => (
              <Button
                key={ticker}
                type="button"
                className="favorite-item"
                onClick={() => onSelectFavorite(ticker)}
              >
                {ticker}
              </Button>
            ))}
          </div>
        ) : (
          <p className="sidebar-empty">Empty because you haven't added a ticker to your watchlist yet.</p>
        )}
      </div>
    </aside>
  );
}

export default memo(Sidebar);