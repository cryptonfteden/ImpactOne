import { useState } from "react";
import SectionCard from "../SectionCard";
import { Button, Skeleton } from "../ui";

/**
 * Spec §4.8 Opportunity Module — new names/themes worth attention. "Add to
 * Watchlist" is a real action (useWatchlist); "Open thesis" expands
 * in-place rather than a separate route, since there's no idea-detail
 * screen to send it to.
 */
// alphaDiscovery can surface the same symbol more than once with a
// different driver/thesis, so symbol alone isn't a unique key.
function ideaKey(idea) {
  return `${idea.symbol}-${idea.primaryDriver}`;
}

export default function OpportunityModule({ isLoading, error, ideas = [], watchlist = [], onAddToWatchlist }) {
  const [expandedKey, setExpandedKey] = useState(null);

  if (isLoading) {
    return (
      <SectionCard title="Opportunities" subtitle="Ranked investment ideas" className="screen-card">
        <Skeleton variant="card" count={3} />
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Opportunities" subtitle="Ranked investment ideas" className="screen-card">
        <p className="company-description negative">Discovery data unavailable — {error}.</p>
      </SectionCard>
    );
  }

  if (!ideas.length) {
    return (
      <SectionCard title="Opportunities" subtitle="Ranked investment ideas" className="screen-card">
        <p className="company-description subtle">No strong opportunities detected today. Check back after the next refresh.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Opportunities" subtitle="Ranked investment ideas" className="screen-card">
      <div className="opportunity-grid">
        {ideas.map((idea, index) => {
          // alphaDiscovery can legitimately contain two distinct idea
          // objects (different affectedSectors/timeHorizon) that still
          // share the same symbol + primaryDriver text, so the index is a
          // necessary tiebreaker for the React key specifically.
          const key = ideaKey(idea);
          const isExpanded = expandedKey === key;
          const alreadyTracked = watchlist.includes(idea.symbol);
          return (
            <article key={`${key}-${index}`} className="opportunity-item">
              <div className="opportunity-item__top">
                <strong>{idea.symbol}</strong>
                <span className="score-badge">{idea.convictionScore}/100</span>
              </div>
              <p className="company-description subtle">{idea.primaryDriver}</p>
              {isExpanded ? <p className="company-description">{idea.thesis}</p> : null}
              <p className="company-description subtle">
                {idea.portfolioAction?.action || "Wait"} | Expected upside {idea.portfolioAction?.expectedUpside || "N/A"}
              </p>
              <div className="opportunity-item__actions">
                <Button type="button" className="ghost-button" onClick={() => setExpandedKey(isExpanded ? null : key)}>
                  {isExpanded ? "Hide thesis" : "Open thesis"}
                </Button>
                <Button
                  type="button"
                  className="ghost-button"
                  disabled={alreadyTracked}
                  onClick={() => onAddToWatchlist?.(idea.symbol)}
                >
                  {alreadyTracked ? "In watchlist" : "Add to Watchlist"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}
