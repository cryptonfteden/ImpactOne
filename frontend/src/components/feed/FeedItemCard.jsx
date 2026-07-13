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

  return (
    <article className="news-item news-item--premium feed-item-card">
      <div className="opportunity-item__top">
        <h4>{item.headline}</h4>
        {item.impactType ? <span className={IMPACT_PILL_CLASS[item.impactType] || "pill"}>{item.impactType}</span> : null}
      </div>

      <p className="company-description">{item.whyItMatters}</p>

      <div className="feed-item-card__stats">
        <span>Importance {item.importanceScore ?? "—"}/100</span>
        <span>Confidence {item.confidence ?? "—"}/100</span>
        {item.timeHorizon ? <span>Horizon: {item.timeHorizon}</span> : null}
      </div>

      {item.affectedSectors?.length ? (
        <p className="company-description subtle">Affected sectors: {item.affectedSectors.join(", ")}</p>
      ) : null}
      {item.affectedAssets?.length ? (
        <p className="company-description subtle">Affected companies: {item.affectedAssets.join(", ")}</p>
      ) : null}
      {item.portfolioImpactPrediction ? (
        <p className="company-description subtle">Potential portfolio impact: {item.portfolioImpactPrediction}</p>
      ) : null}

      {item.sourceUrl ? (
        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="matched-event__source">
          {item.sourceName || "Source"}
          {formatTimestamp(item.publishedAt) ? ` · ${formatTimestamp(item.publishedAt)}` : ""}
        </a>
      ) : item.sourceName ? (
        <p className="company-description subtle">{item.sourceName}</p>
      ) : null}

      {explainability.reasoning || explainability.evidence?.length ? (
        <details className="feed-item-card__trace">
          <summary>Why this analysis</summary>
          {explainability.reasoning ? <p className="company-description subtle">{explainability.reasoning}</p> : null}
          {explainability.evidence?.length ? (
            <ul className="stack-list">
              {explainability.evidence.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          ) : null}
          {explainability.counterarguments?.length ? (
            <p className="company-description subtle">Counterarguments: {explainability.counterarguments.join("; ")}</p>
          ) : null}
        </details>
      ) : null}
    </article>
  );
}
