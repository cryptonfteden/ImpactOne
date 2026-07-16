import { memo } from "react";
import { Button } from "../components/ui";

// Sprint 33 Priority 1 — mobile information architecture. Exactly 5 primary
// destinations, thumb-reachable at the bottom of the screen. Every other
// screen (Themes, AI Analysis, Alerts, Settings, Intelligence Console,
// Global Intelligence, Watchlist) stays fully reachable — moved behind
// Profile's "More" links (see InvestorProfileScreen.jsx) rather than deleted.
const PRIMARY_DESTINATIONS = [
  { key: "Home", label: "Home", icon: "◆" },
  { key: "Daily Feed", label: "Feed", icon: "▤" },
  { key: "Portfolio", label: "Portfolio", icon: "◈" },
  { key: "Recommendations", label: "For you", icon: "◎" },
  { key: "My Profile", label: "Profile", icon: "◑" },
];

function BottomNav({ activeView, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {PRIMARY_DESTINATIONS.map((item) => {
        const isActive = activeView === item.key;
        return (
          <Button
            key={item.key}
            type="button"
            className={`bottom-nav__item ${isActive ? "active" : ""}`.trim()}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(item.key)}
          >
            <span className="bottom-nav__icon" aria-hidden="true">{item.icon}</span>
            <span className="bottom-nav__label">{item.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}

export default memo(BottomNav);
