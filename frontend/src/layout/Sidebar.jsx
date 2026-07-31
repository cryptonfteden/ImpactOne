import { memo, useState } from "react";
import { Button } from "../components/ui";

// Phase X5 — Part 1 (Single Product Entry). The flat 14-item list this
// replaced read as "several products in a trenchcoat": two competing
// watchlist paths (Watchlist vs. Watchlist Folders), no distinction
// between the everyday workflow and rarely-used tools, and no visual
// grouping at all. Grouped into three tiers instead:
//   - PRIMARY: the one obvious path through a normal session (today's
//     brief, what needs a decision, positions, workspaces).
//   - ADVANCED: real, still fully reachable tools that aren't part of
//     the daily loop — collapsed by default so the primary path reads
//     clearly, not deleted.
//   - ACCOUNT: profile/settings, pinned separately since neither is a
//     "workflow."
// "Watchlist" (the legacy flat, localStorage-driven list) is dropped as
// a nav destination — Watchlist Folders ("Workspaces") is the real,
// backend-persisted, connected replacement (Phase X3 Workspace 2.0,
// X4 pin/alerts/impact summary). The sidebar's own favorites quick-list
// below (a different, complementary surface) is unaffected. The
// underlying WatchlistScreen.jsx/route are unchanged and still pass
// their own tests — same "unreachable, not deleted" precedent as
// Sprint 40's Dashboard removal.
const PRIMARY_ITEMS = [
  { key: "Home", label: "Today" },
  // Phase FLAGSHIP-SCREEN-001 — the single flagship screen: everything
  // that matters, on one cinematic, Earth-centered screen. Pinned first
  // among the immersive entries per the mission's own framing as "the
  // foundation of every future screen."
  { key: "Flagship", label: "Flagship" },
  // Phase IMPACTONE-3D-WORKSPACE-001 — the immersive 3D command center;
  // pinned in Primary since it's the mission's own flagship entry point,
  // not a rarely-used tool.
  { key: "3D Workspace", label: "3D Workspace" },
  { key: "Market Dashboard", label: "Market Dashboard" },
  { key: "Decision Center", label: "Decision Center" },
  { key: "Portfolio", label: "Portfolio" },
  { key: "Watchlist Folders", label: "Workspaces" },
];

const ADVANCED_ITEMS = [
  { key: "Mission Control", label: "Mission Control" },
  { key: "Intelligence Workspace", label: "Intelligence Workspace" },
  { key: "Portfolio Workspace", label: "Portfolio Workspace" },
  { key: "News Intelligence", label: "News Intelligence" },
  { key: "Watchlist Workspace", label: "Watchlist Workspace" },
  { key: "AI Analysis Workspace", label: "AI Analysis Workspace" },
  { key: "Market Intelligence Workspace", label: "Market Intelligence Workspace" },
  { key: "Personal Intelligence Workspace", label: "Personal Intelligence Workspace" },
  { key: "Decision Timeline", label: "Decision Timeline" },
  { key: "Market Positioning", label: "Market Positioning" },
  { key: "Global Intelligence", label: "Global Intelligence" },
  { key: "AI Analysis", label: "AI Analysis" },
  { key: "Recommendations", label: "Recommendations" },
  { key: "Daily Feed", label: "Daily Feed" },
  { key: "Themes", label: "Themes" },
  { key: "Alerts", label: "Alerts" },
];

if (import.meta.env.VITE_DEV_CONSOLE === "true") {
  ADVANCED_ITEMS.push({ key: "Intelligence Console", label: "Intelligence Console" });
  // Phase X6 — Part 4, Health Dashboard. Internal diagnostics only —
  // same gate as Intelligence Console, never shown to a real investor.
  ADVANCED_ITEMS.push({ key: "Health Dashboard", label: "Health Dashboard" });
  // Phase X9 — Part 5, Admin Dashboard. Same internal-only gate.
  ADVANCED_ITEMS.push({ key: "Admin Dashboard", label: "Admin Dashboard" });
  // Phase X10 — Part 7, AI Performance Dashboard. Same internal-only gate.
  ADVANCED_ITEMS.push({ key: "AI Performance Dashboard", label: "AI Performance Dashboard" });
}

const ACCOUNT_ITEMS = [
  { key: "My Profile", label: "My Profile" },
  { key: "Settings", label: "Settings" },
];

// Phase X6 — Part 1, Startup Validation. Every real key this sidebar can
// navigate to, exported so runStartupValidation can confirm each one has
// a matching screenMap entry — a real, automated check against nav dead
// ends, not just a promise in a comment.
export const SIDEBAR_NAV_KEYS = [...PRIMARY_ITEMS, ...ADVANCED_ITEMS, ...ACCOUNT_ITEMS].map((item) => item.key);

function NavLink({ item, activeView, onNavigate }) {
  const isActive = activeView === item.key;
  return (
    <Button
      type="button"
      className={`sidebar-link ${isActive ? "active" : ""}`.trim()}
      onClick={() => onNavigate(item.key)}
    >
      {item.label}
    </Button>
  );
}

function Sidebar({ activeView, onNavigate, favorites = [], onSelectFavorite }) {
  // Advanced tools are collapsed by default (reduces sidebar complexity per
  // the mission) but auto-expand if the user is already on one of them —
  // e.g. arriving via a deep link — so the sidebar never hides where you
  // actually are.
  const isOnAdvancedItem = ADVANCED_ITEMS.some((item) => item.key === activeView);
  const [advancedOpen, setAdvancedOpen] = useState(isOnAdvancedItem);

  return (
    <aside className="sidebar">
      <div className="logo">ImpactOne</div>

      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        {PRIMARY_ITEMS.map((item) => (
          <NavLink key={item.key} item={item} activeView={activeView} onNavigate={onNavigate} />
        ))}

        <Button
          type="button"
          className="sidebar-link sidebar-link--group-toggle"
          onClick={() => setAdvancedOpen((value) => !value)}
          aria-expanded={advancedOpen}
        >
          More tools {advancedOpen ? "▾" : "▸"}
        </Button>
        {advancedOpen
          ? ADVANCED_ITEMS.map((item) => <NavLink key={item.key} item={item} activeView={activeView} onNavigate={onNavigate} />)
          : null}

        <div className="sidebar-nav__divider" role="separator" />
        {ACCOUNT_ITEMS.map((item) => (
          <NavLink key={item.key} item={item} activeView={activeView} onNavigate={onNavigate} />
        ))}
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
