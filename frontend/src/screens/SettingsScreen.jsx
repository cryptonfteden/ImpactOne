import SectionCard from "../components/SectionCard";
import { useI18n } from "../i18n/I18nProvider";
import { BETA_USER_ID_STORAGE_KEY, BETA_USER_LABEL_STORAGE_KEY } from "../hooks/useBetaIdentity";
import { SEEN_STORAGE_KEY } from "./onboarding/BetaInviteGate";
import { trackEvent } from "../utils/analytics";

// Phase X4 — Part 1 logout. Clears the persisted identity and reloads,
// so useBetaIdentity re-initializes cleanly to NEEDS_CODE on next mount
// rather than trying to reconcile in-place hook state across the app.
function logoutOfBeta() {
  trackEvent("logout");
  try {
    window.localStorage.removeItem(BETA_USER_ID_STORAGE_KEY);
    window.localStorage.removeItem(BETA_USER_LABEL_STORAGE_KEY);
    window.localStorage.removeItem(SEEN_STORAGE_KEY);
  } catch {
    // best-effort only
  }
  window.location.reload();
}

function readBetaLabel() {
  try {
    return window.localStorage.getItem(BETA_USER_LABEL_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export default function SettingsScreen() {
  const { t, locale, setLocale, availableLocales } = useI18n();
  const betaLabel = readBetaLabel();

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>{t("settings.title")}</h1>
          <p className="subtext">
            Configure your preferred market defaults, notification cadence, and interface density.
          </p>
        </div>
      </section>

      <div className="screen-grid">
        <SectionCard title={t("settings.language")} subtitle={t("settings.languageDescription")} className="screen-card">
          <select
            className="language-select"
            value={locale}
            onChange={(event) => {
              setLocale(event.target.value);
              trackEvent("settings_changed", { settingKey: "language" });
            }}
            aria-label={t("settings.language")}
          >
            {availableLocales.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </SectionCard>

        <SectionCard title="Appearance" subtitle="Theme and layout — not yet configurable" className="screen-card">
          <p className="company-description subtle">
            These are the current defaults for this beta. Per-user customization isn't available yet.
          </p>
          <ul className="stack-list">
            <li>Premium Dark theme is enabled by default.</li>
            <li>Typography and spacing are optimized for financial dashboards.</li>
            <li>Mobile and desktop layouts are responsive.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Notifications" subtitle="Alert delivery — not yet configurable" className="screen-card">
          <p className="company-description subtle">
            These are the current defaults for this beta. Per-user customization isn't available yet.
          </p>
          <ul className="stack-list">
            <li>Breakout alerts: Enabled</li>
            <li>Risk alerts: Enabled</li>
            <li>Digest schedule: Market close</li>
          </ul>
        </SectionCard>

        <SectionCard title="Beta identity" subtitle={betaLabel ? `Signed in as ${betaLabel}` : "Not signed in with an invite code"} className="screen-card">
          <p className="company-description subtle">
            {betaLabel
              ? "Logging out clears this device's beta identity. You'll need your invite code again to see your portfolio and recommendations."
              : "You're using ImpactOne without a beta invite code. Nothing to log out of."}
          </p>
          {betaLabel ? (
            <button type="button" className="onboarding-skip-button" onClick={logoutOfBeta}>
              Log out
            </button>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
}
