import { useState } from "react";
import SectionCard from "../SectionCard";
import { Button, Skeleton } from "../ui";
import { SafeList, SafeValue } from "../SafeValue";

function Sparkline({ points = [] }) {
  if (!points.length) {
    return null;
  }

  const width = 160;
  const height = 48;
  const values = points.map((point) => Number(point.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const path = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((Number(point.value) - min) / Math.max(max - min, 1)) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="brief-sparkline" role="img" aria-label="Recent market trend">
      <path d={path} className="brief-sparkline__line" />
    </svg>
  );
}

/**
 * Spec §4.3 Daily Brief Hero — the dashboard's main answer to "what
 * changed and why it matters." Must be visible without scrolling and
 * offer action without leaving the page (acceptance criteria).
 */
export default function DailyBriefHero({
  isLoading,
  error,
  summary,
  confidenceScore,
  bullets = [],
  sparklinePoints = [],
  onPrimaryAction,
  onSecondaryAction,
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <SectionCard title="Today's Market Setup" subtitle="Daily brief" className="screen-card hero-panel--featured">
        <Skeleton variant="text" count={3} />
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Today's Market Setup" subtitle="Daily brief" className="screen-card hero-panel--featured">
        <p className="company-description negative">Brief generation failed — {error}. Showing the last available read where possible.</p>
        <Button type="button" className="ghost-button" onClick={onPrimaryAction}>Retry</Button>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Today's Market Setup" subtitle="Daily brief" className="screen-card hero-panel--featured">
      <div className="daily-brief-hero">
        <div className="daily-brief-hero__main">
          <div className="daily-brief-hero__meta">
            <span className="score-badge">Confidence {Number(confidenceScore || 0)}/100</span>
            <Button type="button" className="ghost-button" onClick={() => setIsExpanded((value) => !value)}>
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
          {isExpanded ? (
            <>
              <p className="company-description"><SafeValue value={summary || "Your daily brief will appear here after the next refresh."} /></p>
              <h4>Why this matters</h4>
              <SafeList value={bullets} fallback="No standout drivers detected yet." />
            </>
          ) : null}
          <div className="daily-brief-hero__actions">
            <Button type="button" onClick={onPrimaryAction}>View Priority Actions</Button>
            <Button type="button" className="ghost-button" onClick={onSecondaryAction}>Open Global Intelligence</Button>
          </div>
        </div>
        <div className="daily-brief-hero__chart">
          <Sparkline points={sparklinePoints} />
        </div>
      </div>
    </SectionCard>
  );
}
