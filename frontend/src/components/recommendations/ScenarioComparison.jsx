const CASE_LABEL = {
  bull: "Bull",
  base: "Base",
  bear: "Bear",
};

function formatProbability(probability) {
  if (!Number.isFinite(probability)) {
    return null;
  }
  return `${Math.round(probability * 100)}%`;
}

/**
 * Sprint 16 Phase D — bull/base/bear comparison for a single recommendation.
 * Each scenario carries a narrative, probability, price/portfolio impact,
 * catalysts, risks, and what would invalidate that specific case.
 */
export default function ScenarioComparison({ scenarios = [] }) {
  if (!scenarios.length) {
    return null;
  }

  return (
    <div className="scenario-grid">
      {scenarios.map((scenario) => (
        <div key={scenario.case} className={`scenario-card scenario-card--${scenario.case}`}>
          <div className="scenario-card__title">
            <strong>{CASE_LABEL[scenario.case] || scenario.case}</strong>
            <span>{formatProbability(scenario.probability)}</span>
          </div>
          <p className="company-description subtle">{scenario.narrative}</p>
          <p className="company-description subtle">
            Impact: {scenario.priceImpact}
            {scenario.portfolioImpact ? ` · ${scenario.portfolioImpact}` : ""}
          </p>
          {scenario.catalysts?.length ? (
            <p className="company-description subtle">Catalysts: {scenario.catalysts.join("; ")}</p>
          ) : null}
          {scenario.risks?.length ? (
            <p className="company-description subtle">Risks: {scenario.risks.join("; ")}</p>
          ) : null}
          {scenario.invalidationTrigger ? (
            <p className="company-description subtle">Invalidated if: {scenario.invalidationTrigger}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
