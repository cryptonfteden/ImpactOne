import SectionCard from "../SectionCard";
import { Skeleton } from "../ui";
import { riskLevelLabel } from "../../utils/dashboardMetrics";

/**
 * Spec §4.5 Portfolio Risk Panel — what the user's holdings are exposed to
 * right now, tied to actionable suggestions (acceptance criteria).
 */
export default function PortfolioRiskPanel({
  isLoading,
  error,
  hasPositions,
  totalValue,
  cashBalance,
  riskScore,
  diversification,
  allocationBySector = [],
  topRiskPositions = [],
  suggestions = [],
}) {
  if (isLoading) {
    return (
      <SectionCard title="Portfolio Risk" subtitle="Exposure right now" className="screen-card">
        <Skeleton variant="line" count={4} />
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Portfolio Risk" subtitle="Exposure right now" className="screen-card">
        <p className="company-description negative">Portfolio sync failed — {error}. Showing last known data where available.</p>
      </SectionCard>
    );
  }

  if (!hasPositions) {
    return (
      <SectionCard title="Portfolio Risk" subtitle="Exposure right now" className="screen-card">
        <p className="company-description subtle">Connect holdings to see personalized risk. Open the Portfolio screen to place your first paper trade.</p>
      </SectionCard>
    );
  }

  const riskLabel = riskLevelLabel(riskScore);

  return (
    <SectionCard title="Portfolio Risk" subtitle="Exposure right now" className="screen-card">
      <div className="portfolio-risk-summary">
        <div>
          <div className="portfolio-metric">${Number(totalValue || 0).toLocaleString()}</div>
          <div className="portfolio-metric__label">Total value | Cash ${Number(cashBalance || 0).toLocaleString()}</div>
        </div>
        <div>
          <span className={`pill ${riskLabel === "High" ? "risk" : riskLabel === "Low" ? "opportunity" : "monitor"}`}>{riskLabel} risk</span>
          <div className="portfolio-metric__label">Risk score {riskScore}/100</div>
        </div>
      </div>

      {diversification?.largestSector ? (
        <p className="company-description">
          You are {diversification.largestWeightPct}% concentrated in {diversification.largestSector}. Diversification score: {diversification.diversificationScore}/100.
        </p>
      ) : null}

      <div className="sector-exposure-meter">
        {allocationBySector.map((sector) => (
          <div key={sector.name} className="meter-row">
            <span>{sector.name}</span>
            <div className="meter">
              <div className="meter-fill meter-fill--confidence" style={{ width: `${sector.pct}%` }} />
            </div>
            <span className="meter-value">{sector.pct}%</span>
          </div>
        ))}
      </div>

      {topRiskPositions.length ? (
        <>
          <h4>Top concentration</h4>
          <div className="widget-list">
            {topRiskPositions.map((position) => (
              <div key={position.symbol} className="widget-list-item">
                <strong>{position.symbol}</strong>
                <span>${Number(position.marketValue || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {suggestions.length ? (
        <>
          <h4>Suggested actions</h4>
          <ul className="stack-list">
            {suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
          </ul>
        </>
      ) : null}
    </SectionCard>
  );
}
