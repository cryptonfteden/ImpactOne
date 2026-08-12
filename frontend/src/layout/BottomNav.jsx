import { memo } from "react";
import { Button } from "../components/ui";
import { useI18n } from "../i18n/I18nProvider";

// The center position is reserved for Home: the fastest, most natural
// recovery point from every mobile destination. Other destinations stay one tap away.
const PRIMARY_DESTINATIONS = [
  { key: "Daily Feed", labelKey: "nav.feed", icon: "feed" },
  { key: "Portfolio", labelKey: "nav.portfolio", icon: "portfolio" },
  { key: "Home", labelKey: "nav.home", icon: "home", primary: true },
  { key: "Market Chart", labelKey: "nav.chart", icon: "chart" },
  { key: "Recommendations", labelKey: "nav.forYou", icon: "forYou" },
];

export const BOTTOM_NAV_KEYS = PRIMARY_DESTINATIONS.map((item) => item.key);

function NavIcon({ name }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z" /><path d="M9 21v-7h6v7" /></>,
    feed: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    portfolio: <><path d="m12 3 8 8-8 8-8-8 8-8Z" /><path d="m8 11 4 4 4-4" /></>,
    chart: <><path d="M4 20V4M4 20h16" /><path d="M8 16v-5M8 9v-2M12 16v-8M12 6V4M16 17v-4M16 11V8" /></>,
    forYou: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

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
            className={`bottom-nav__item ${item.primary ? "bottom-nav__item--home" : ""} ${isActive ? "active" : ""}`.trim()}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(item.key)}
          >
            <span className="bottom-nav__icon">
              {item.primary ? <img src="/brand/impactone-app-icon.png" alt="" className="bottom-nav__home-mark" /> : <NavIcon name={item.icon} />}
            </span>
            <span className="bottom-nav__label">{t(item.labelKey)}</span>
          </Button>
        );
      })}
    </nav>
  );
}

export default memo(BottomNav);
