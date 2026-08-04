const COMPONENT_LABEL = {
  sourceQuality: "Source quality",
  evidenceFreshness: "Evidence freshness",
  portfolioRelevance: "Portfolio relevance",
  evidenceAgreement: "Evidence agreement",
  dataCompleteness: "Data completeness",
  modelConfidence: "Model confidence",
};

/**
 * Sprint 16 Phase D — the six named components behind a recommendation's
 * quality score, so the score is inspectable rather than a single opaque
 * number.
 */
export default function QualityScoreBreakdown({ qualityComponents }) {
  if (!qualityComponents) {
    return null;
  }

  return (
    <div className="widget-list">
      {Object.entries(COMPONENT_LABEL).map(([key, label]) => (
        <div key={key} className="widget-list-item">
          <strong>{label}</strong>
          <span>{Number.isFinite(qualityComponents[key]) ? `${qualityComponents[key]}/100` : "—"}</span>
        </div>
      ))}
    </div>
  );
}
