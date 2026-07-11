import { useMemo, useState } from "react";
import SectionCard from "../SectionCard";
import { Button, Skeleton } from "../ui";

const CARD_TYPE_LABEL = {
  alert: "Alert",
  opportunity: "Opportunity",
  risk: "Risk",
  catalyst: "Catalyst",
};

/**
 * Spec §4.4 Priority Intelligence Cards — the 3-5 items the user should
 * review next. Save/Dismiss/Snooze are session-only (no backend
 * persistence — not implied by the acceptance criteria).
 */
export default function PriorityIntelligenceCards({ isLoading, error, cards = [] }) {
  const [dismissedIds, setDismissedIds] = useState(() => new Set());

  const visibleCards = useMemo(
    () => cards.filter((card) => !dismissedIds.has(card.id)),
    [cards, dismissedIds]
  );

  const dismiss = (id) => {
    setDismissedIds((current) => new Set(current).add(id));
  };

  if (isLoading) {
    return (
      <SectionCard title="Priority Intelligence" subtitle="What to review next" className="screen-card">
        <Skeleton variant="card" count={3} />
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Priority Intelligence" subtitle="What to review next" className="screen-card">
        <p className="company-description negative">Ranking unavailable — {error}. Showing unranked items.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Priority Intelligence" subtitle="What to review next" className="screen-card">
      {visibleCards.length ? (
        <div className="priority-card-grid">
          {visibleCards.map((card) => (
            <article key={card.id} className={`priority-card priority-card--${card.cardType}`}>
              <div className="priority-card__top">
                <span className={`pill ${card.cardType === "opportunity" ? "opportunity" : card.cardType === "risk" ? "risk" : "monitor"}`}>
                  {CARD_TYPE_LABEL[card.cardType] || "Alert"}
                </span>
                <span className="company-description subtle">{card.relevanceScore}/100</span>
              </div>
              <h4>{card.headline}</h4>
              <p className="company-description">{card.whyItMatters}</p>
              <div className="priority-card__footer">
                <Button type="button" className="ghost-button" onClick={() => dismiss(card.id)}>Dismiss</Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="company-description subtle">No high-priority items right now.</p>
      )}
    </SectionCard>
  );
}
