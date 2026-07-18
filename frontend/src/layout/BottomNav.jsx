import { memo } from "react";
import { Button } from "../components/ui";
import { useI18n } from "../i18n/I18nProvider";

// Sprint 33 Priority 1 — mobile information architecture. Exactly 5 primary
// destinations, thumb-reachable at the bottom of the screen. Every other
// screen (Themes, AI Analysis, Alerts, Settings, Intelligence Console,
// Global Intelligence, Watchlist) stays fully reachable — moved behind
// Profile's "More" links (see InvestorProfileScreen.jsx) rather than deleted.
//
// Sprint 35 — `key` is the internal routing identifier MainLayout's
// screenMap and Sidebar already key off of; it stays English/stable on
// purpose (it is not user-facing text). `labelKey` is the translatable
// display string, resolved through t() at render time.
const PRIMARY_DESTINATIONS = [
  { key: "Home", labelKey: "nav.home", icon: "◆" },
  { key: "Daily Feed", labelKey: "nav.feed", icon: "▤" },
  { key: "Portfolio", labelKey: "nav.portfolio", icon: "◈" },
  { key: "Recommendations", labelKey: "nav.forYou", icon: "◎" },
  { key: "My Profile", labelKey: "nav.profile", icon: "◑" },
];

function BottomNav({ activeView, onNavigate }) {
  const { t } = useI18n();

  return (
    <nav className="bottom-nav" aria-label={t("nav.primaryNavigation")}>
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
            <span className="bottom-nav__label">{t(item.labelKey)}</span>
          </Button>
        );
      })}
    </nav>
  );
}

export default memo(BottomNav);
