const navItems = ["Dashboard", "Market News", "AI Analysis", "Watchlist", "Alerts", "Portfolio"];

export default function Sidebar({ activeView, onNavigate, favorites = [], onSelectFavorite }) {
  return (
    <aside className="sidebar">
      <div className="logo">ImpactOne</div>

      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        {navItems.map((item) => {
          const isActive = activeView === item;

          return (
            <button
              key={item}
              type="button"
              className={`sidebar-link ${isActive ? "active" : ""}`.trim()}
              onClick={() => onNavigate(item)}
            >
              {item}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-section__title">Watchlist</div>
        {favorites.length ? (
          <div className="favorites-list">
            {favorites.map((ticker) => (
              <button
                key={ticker}
                type="button"
                className="favorite-item"
                onClick={() => onSelectFavorite(ticker)}
              >
                {ticker}
              </button>
            ))}
          </div>
        ) : (
          <p className="sidebar-empty">No favorites yet.</p>
        )}
      </div>
    </aside>
  );
}