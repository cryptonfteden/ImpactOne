import SectionCard from "../SectionCard";
import { Button, EmptyState, Skeleton } from "../ui";
import CompanyLogo from "../CompanyLogo";

const ACTION_PILL_CLASS = {
  BUY: "pill opportunity",
  REDUCE: "pill monitor",
  EXIT: "pill risk",
};

const ACTION_LABEL = {
  BUY: "Buy",
  REDUCE: "Reduce",
  EXIT: "Exit",
};

const SYMBOL_SOURCE_LABEL = {
  portfolio: "From your portfolio",
  watchlist: "On your watchlist",
  "market-scan": "Market scan",
};

function qualityPillClass(score) {
  if (!Number.isFinite(score)) return "pill";
  if (score >= 75) return "pill opportunity";
  if (score >= 50) return "pill";
  return "pill risk";
}

/**
 * Sprint 16 Phase B — surfaces the same advisory-only recommendations shown
 * on the dedicated Recommendations screen, so a fresh recommendation is
 * visible without navigating away. Never shows a place-order control.
 */
export default function RecommendationsPreview({ isLoading, error, recommendations = [], onViewAll }) {
  if (isLoading && !recommendations.length) {
    return (
      <SectionCard title="Recommendations" subtitle="Advisory only — never places a trade" className="screen-card">
        <Skeleton variant="card" count={3} />
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Recommendations" subtitle="Advisory only — never places a trade" className="screen-card">
        <p className="company-description negative">Recommendation engine unavailable — {error}.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Recommendations" subtitle="Advisory only — never places a trade" className="screen-card">
      {recommendations.length ? (
        <div className="opportunity-grid">
          {recommendations.slice(0, 3).map((recommendation) => {
            const symbolSource = recommendation.evidence?.symbolSource;
            const qualityScore = Number.isFinite(Number(recommendation.qualityScore)) ? Number(recommendation.qualityScore) : null;
            return (
              <article key={recommendation.id} className="opportunity-item">
                <div className="opportunity-item__top">
                  <strong><CompanyLogo symbol={recommendation.symbol} />{recommendation.symbol}</strong>
                  <span className={ACTION_PILL_CLASS[recommendation.action] || "pill"}>
                    {ACTION_LABEL[recommendation.action] || recommendation.action}
                  </span>
                </div>
                <div className="opportunity-item__actions">
                  {symbolSource ? <span className="pill">{SYMBOL_SOURCE_LABEL[symbolSource] || symbolSource}</span> : null}
                  {qualityScore !== null ? <span className={qualityPillClass(qualityScore)}>Quality {qualityScore}/100</span> : null}
                </div>
                <p className="company-description subtle">Confidence {Number(recommendation.confidenceScore)}/100 · Risk {recommendation.riskLabel}</p>
                <p className="company-description subtle">
                  Upside {recommendation.expectedUpside} · Downside {recommendation.expectedDownside}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState message="No active recommendations right now." />
      )}
      <div className="opportunity-item__actions">
        <Button type="button" className="ghost-button" onClick={onViewAll}>View all recommendations</Button>
      </div>
    </SectionCard>
  );
}
