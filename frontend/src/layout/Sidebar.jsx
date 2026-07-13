import { memo } from "react";
import { Button } from "../components/ui";

const navItems = ["Dashboard", "Global Intelligence", "AI Analysis", "Watchlist", "Portfolio", "Recommendations", "Market News", "Alerts", "My Profile", "Settings"];

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
          <p className="sidebar-empty">No favorites yet.</p>
        )}
      </div>
    </aside>
  );
}

export default memo(Sidebar);