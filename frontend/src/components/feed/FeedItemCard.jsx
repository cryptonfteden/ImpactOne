import { memo } from "react";

function formatTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

// Sprint 40 — Feed: freshness as a relative-age badge, not just a raw
// timestamp (per the mission's explicit requirement and the Sprint 39
// audit finding that only a raw timestamp existed). A real computation
// off item.publishedAt, honestly null when there's no timestamp at all.
function computeFreshnessLabel(publishedAt) {
  if (!publishedAt) return null;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return null;
  const ageMs = Date.now() - date.getTime();
  if (ageMs < 0) return "Just now";
  const ageMinutes = Math.floor(ageMs / 60000);
  if (ageMinutes < 1) return "Just now";
  if (ageMinutes < 60) return `${ageMinutes}m ago`;
  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return `${ageHours}h ago`;
  return `${Math.floor(ageHours / 24)}d ago`;
}

// Sprint 40 — time-to-read: an honest word-count-based estimate (~200
// wpm), never a fabricated fixed number. Only counts text this card
// actually renders (whyItMatters + reasoning), so the estimate matches
// what a reader really has to read, not the raw API payload.
const WORDS_PER_MINUTE = 200;
function estimateReadTimeMinutes(item) {
  const text = [item.whyItMatters, item.explainability?.reasoning].filter(Boolean).join(" ");
  if (!text.trim()) return null;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

// Sprint 40 — actionability: derived only from fields this item already
// carries (impactType, confidence), never a new fabricated call. A
// "neutral" item or a low-confidence directional item is honestly not
// presented as something to act on.
const ACTIONABILITY_CONFIDENCE_THRESHOLD = 70;
function computeActionability(item) {
  if (!item.impactType || item.impactType === "neutral") {
    return { label: "FYI", detail: "No direct action indicated." };
  }
  if (Number.isFinite(item.confidence) && item.confidence >= ACTIONABILITY_CONFIDENCE_THRESHOLD) {
    return { label: "Act now", detail: `High-confidence, direct ${item.impactType} signal.` };
  }
  return { label: "Monitor", detail: `Plausible ${item.impactType}, not yet high-confidence.` };
}

const IMPACT_PILL_CLASS = {
  opportunity: "pill opportunity",
  risk: "pill risk",
  neutral: "pill monitor",
};

// Sprint 24 — the same 7 theme keys the Theme Dashboard tracks
// (themeIntelligenceService.THEME_DEFINITIONS); a feed item's eventType is
// only shown as a theme tag when it's genuinely one of these, never a
// fabricated theme link for an unrelated event type.
const THEME_LABELS = {
  ai: "AI",
  quantum: "Quantum",
  defense: "Defense",
  energy: "Energy",
  space: "Space",
  cybersecurity: "Cyber",
  healthcare: "Healthcare",
};

/**
 * Sprint 20, Part 4 — one Daily Feed item, showing every required field:
 * headline, AI summary, importance, confidence, affected sectors/companies,
 * time horizon, potential portfolio impact, sources, and a reasoning
 * trace. "Decision Trace" here is the event's own already-computed
 * explainability block (evidence/reasoning/counterarguments/invalidation
 * signals) — a real per-event reasoning trace, not a fabricated formal
 * DecisionTrace (those exist only for actual Recommendations, linked
 * separately from the Recommendations screen).
 */
// Sprint 36 Priority 5 — Performance polish. Feed renders up to 12 of
// these; memo() avoids re-rendering every card when the screen's own
// state changes for unrelated reasons (this component takes no callback
// props, so there's no stale-closure risk to worry about here).
const ACTIONABILITY_PILL_CLASS = {
  "Act now": "pill opportunity",
  Monitor: "pill monitor",
  FYI: "pill",
};

function FeedItemCard({ item }) {
  const explainability = item.explainability || {};
  const themeLabel = THEME_LABELS[item.eventType];
  const freshnessLabel = computeFreshnessLabel(item.publishedAt);
  const readTimeMinutes = estimateReadTimeMinutes(item);
  const actionability = computeActionability(item);
  // Sprint 33 Priority 5 — mobile Feed needs a concise collapsed state;
  // sectors/companies/portfolio-impact/reasoning/evidence all move behind
  // one progressive-disclosure toggle instead of always rendering, so a
  // 12-item feed isn't a full-height wall on a narrow screen by default.
  const hasExpandableDetail = Boolean(
    item.affectedSectors?.length ||
    item.affectedAssets?.length ||
    item.portfolioImpactPrediction ||
    explainability.reasoning ||
    explainability.evidence?.length
  );

  return (
    <article className="news-item news-item--premium feed-item-card">
      <div className="opportunity-item__top">
        <h4>{item.headline}</h4>
        {item.impactType ? <span className={IMPACT_PILL_CLASS[item.impactType] || "pill"}>{item.impactType}</span> : null}
        {themeLabel ? <span className="pill monitor">{themeLabel}</span> : null}
        <span className={ACTIONABILITY_PILL_CLASS[actionability.label]} title={actionability.detail}>{actionability.label}</span>
      </div>

      <p className="company-description">{item.whyItMatters}</p>

      <div className="feed-item-card__stats">
        <span>Importance {item.importanceScore ?? "—"}/100</span>
        <span>Confidence {item.confidence ?? "—"}/100</span>
        {item.timeHorizon ? <span>Horizon: {item.timeHorizon}</span> : null}
        {freshnessLabel ? <span>{freshnessLabel}</span> : null}
        {readTimeMinutes ? <span>{readTimeMinutes} min read</span> : null}
      </div>

      {item.sourceUrl ? (
        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="matched-event__source">
          {item.sourceName || "Source"}
          {formatTimestamp(item.publishedAt) ? ` · ${formatTimestamp(item.publishedAt)}` : ""}
        </a>
      ) : item.sourceName ? (
        <p className="company-description subtle">{item.sourceName}</p>
      ) : null}

      {hasExpandableDetail ? (
        <details className="feed-item-card__trace">
          <summary>Evidence, reasoning &amp; portfolio impact</summary>
          {item.affectedSectors?.length ? (
            <p className="company-description subtle">Affected sectors: {item.affectedSectors.join(", ")}</p>
          ) : null}
          {item.affectedAssets?.length ? (
            <p className="company-description subtle">Affected companies: {item.affectedAssets.join(", ")}</p>
          ) : null}
          {item.portfolioImpactPrediction ? (
            <p className="company-description subtle">Potential portfolio impact: {item.portfolioImpactPrediction}</p>
          ) : null}
          {explainability.reasoning ? <p className="company-description subtle">{explainability.reasoning}</p> : null}
          {explainability.evidence?.length ? (
            <ul className="stack-list">
              {explainability.evidence.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          ) : null}
          {explainability.counterarguments?.length ? (
            <p className="company-description subtle">Counter-evidence: {explainability.counterarguments.join("; ")}</p>
          ) : null}
          {explainability.invalidationSignals?.length ? (
            <p className="company-description subtle">Would prove this wrong: {explainability.invalidationSignals.join("; ")}</p>
          ) : null}
        </details>
      ) : null}
    </article>
  );
}

export default memo(FeedItemCard);
