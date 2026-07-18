import SectionCard from "../components/SectionCard";
import { useI18n } from "../i18n/I18nProvider";

export default function SettingsScreen() {
  const { t, locale, setLocale, availableLocales } = useI18n();

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
            onChange={(event) => setLocale(event.target.value)}
            aria-label={t("settings.language")}
          >
            {availableLocales.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </SectionCard>

        <SectionCard title="Appearance" subtitle="Theme and layout" className="screen-card">
          <ul className="stack-list">
            <li>Premium Dark theme is enabled by default.</li>
            <li>Typography and spacing are optimized for financial dashboards.</li>
            <li>Mobile and desktop layouts are responsive.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Notifications" subtitle="Alert delivery" className="screen-card">
          <ul className="stack-list">
            <li>Breakout alerts: Enabled</li>
            <li>Risk alerts: Enabled</li>
            <li>Digest schedule: Market close</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
