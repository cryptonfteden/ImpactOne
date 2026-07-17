function formatTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
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
export default function FeedItemCard({ item }) {
  const explainability = item.explainability || {};
  const themeLabel = THEME_LABELS[item.eventType];
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
      </div>

      <p className="company-description">{item.whyItMatters}</p>

      <div className="feed-item-card__stats">
        <span>Importance {item.importanceScore ?? "—"}/100</span>
        <span>Confidence {item.confidence ?? "—"}/100</span>
        {item.timeHorizon ? <span>Horizon: {item.timeHorizon}</span> : null}
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
