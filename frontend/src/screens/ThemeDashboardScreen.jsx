import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { LoadingSpinner } from "../components/ui";
import { themeApi } from "../services/api";
import { logError } from "../utils/errorHandling";

function ConfidenceTrendSparkline({ points }) {
  if (!points?.length || points.length < 2) {
    return <p className="company-description subtle">Confidence trend will appear here as history accumulates.</p>;
  }

  const width = 280;
  const height = 60;
  const padding = 6;
  const values = points.map((point) => point.confidenceScore);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const coords = points.map((point, index) => ({
    x: padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2),
    y: height - padding - ((point.confidenceScore - min) / Math.max(max - min, 1)) * (height - padding * 2),
  }));
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="timeline-chart__svg" style={{ height: 60 }} role="img" aria-label="Confidence trend">
      <path d={path} className="timeline-chart__balance-line" />
    </svg>
  );
}

// Sprint 29 Priority 3 — Theme Evolution. Renders what's new/strengthened/
// weakened/disappeared/why using only fields computeThemeEvolution already
// returns; honestly shows "not enough history yet" rather than a fabricated
// trend when hasComparison is false.
function ThemeEvolution({ evolution }) {
  if (!evolution) return null;

  return (
    <div className="explanation-section">
      <p className="explanation-section__title">Theme evolution</p>
      {evolution.whatsNew.length ? (
        <p className="company-description subtle">What's new: {evolution.whatsNew.join("; ")}</p>
      ) : (
        <p className="company-description subtle">What's new: nothing new detected today.</p>
      )}
      {evolution.hasComparison ? (
        <>
          <p className="company-description subtle">
            {evolution.strengthened ? "Strengthened" : evolution.weakened ? "Weakened" : "Unchanged"}: confidence {evolution.previousConfidence} → {evolution.currentConfidence}
            {Number.isFinite(evolution.confidenceDelta) ? ` (${evolution.confidenceDelta >= 0 ? "+" : ""}${evolution.confidenceDelta})` : ""}
          </p>
          {evolution.disappeared ? (
            <p className="company-description subtle negative">Disappeared: this theme had active evidence previously and shows none today.</p>
          ) : null}
        </>
      ) : (
        <p className="company-description subtle">Not enough history yet to show strengthened/weakened/disappeared — check back after another day of tracking.</p>
      )}
      <p className="company-description subtle">Why: {evolution.why}</p>
    </div>
  );
}

function ThemeDetail({ theme, evolution }) {
  return (
    <div className="explanation-section">
      <p className="company-description subtle">
        Maturity: {theme.maturity} · Confidence {theme.confidenceScore}/100
      </p>
      <p className="company-description">{theme.thesis}</p>

      <ThemeEvolution evolution={evolution} />

      {theme.supportingEvidence?.length ? (
        <div className="explanation-section">
          <p className="explanation-section__title">Supporting evidence</p>
          {theme.supportingEvidence.map((item, index) => (
            <p key={index} className="company-description subtle">
              {item.headline} — {item.whyItMatters}
            </p>
          ))}
        </div>
      ) : null}

      {theme.counterarguments?.length ? (
        <div className="explanation-section">
          <p className="explanation-section__title">Counterarguments</p>
          <p className="company-description subtle">{theme.counterarguments.join("; ")}</p>
        </div>
      ) : null}

      <div className="explanation-section">
        <p className="explanation-section__title">Companies</p>
        <p className="company-description subtle">{theme.companies.join(", ") || "None tracked yet."}</p>
        <p className="explanation-section__title">ETFs</p>
        <p className="company-description subtle">{theme.etfs.length ? theme.etfs.join(", ") : "No dedicated ETF tracked yet."}</p>
      </div>

      <div className="explanation-section">
        <p className="explanation-section__title">Confidence trend</p>
        <ConfidenceTrendSparkline points={theme.confidenceTrend} />
      </div>
    </div>
  );
}

/**
 * Sprint 20, Part 6 — Theme Dashboard. A grid of 7 compact tiles that
 * expand in place (accordion, no extra navigation) into full detail. No
 * buy/execute affordance anywhere on this screen — advisory-only.
 */
export default function ThemeDashboardScreen() {
  const [themes, setThemes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedKey, setExpandedKey] = useState(null);
  const [detailByKey, setDetailByKey] = useState({});
  const [evolutionByKey, setEvolutionByKey] = useState({});
  const [detailLoading, setDetailLoading] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await themeApi.list();
        if (!cancelled) {
          setThemes(data.themes || []);
          setError("");
        }
      } catch (loadError) {
        logError("theme list load failed", loadError);
        if (!cancelled) {
          setError("We couldn't load themes right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (themeKey) => {
    if (expandedKey === themeKey) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(themeKey);
    // Sprint 30 Priority 1 — User Memory. Fire-and-forget, only on a real
    // expand (never on collapse or on re-opening an already-fetched theme
    // more than the actual click count).
    themeApi.recordView(themeKey).catch((viewError) => logError("theme view record failed", viewError));
    if (!detailByKey[themeKey]) {
      setDetailLoading(themeKey);
      try {
        const [detail, evolution] = await Promise.all([
          themeApi.get(themeKey),
          themeApi.getEvolution(themeKey).catch((evolutionError) => {
            logError("theme evolution load failed", evolutionError);
            return null;
          }),
        ]);
        setDetailByKey((current) => ({ ...current, [themeKey]: detail }));
        setEvolutionByKey((current) => ({ ...current, [themeKey]: evolution }));
      } catch (loadError) {
        logError("theme detail load failed", loadError);
      } finally {
        setDetailLoading(null);
      }
    }
  };

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Themes</p>
          <h1>Where the world is investing</h1>
          <p className="subtext">Advisory only — explore theses, evidence, and exposure. Nothing here places a trade.</p>
        </div>
      </section>

      {isLoading ? (
        <LoadingSpinner label="Loading themes" />
      ) : error ? (
        <p className="company-description negative">{error}</p>
      ) : (
        <div className="opportunity-grid">
          {themes.map((theme) => (
            <SectionCard key={theme.themeKey} title={theme.label} className="screen-card" icon="◆">
              <button type="button" className="ghost-button" onClick={() => handleToggle(theme.themeKey)}>
                {expandedKey === theme.themeKey ? "Hide details" : "Show details"}
              </button>
              {expandedKey === theme.themeKey ? (
                detailLoading === theme.themeKey ? (
                  <LoadingSpinner label={`Loading ${theme.label}`} />
                ) : detailByKey[theme.themeKey] ? (
                  <ThemeDetail theme={detailByKey[theme.themeKey]} evolution={evolutionByKey[theme.themeKey]} />
                ) : null
              ) : null}
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
