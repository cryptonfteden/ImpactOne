import SectionCard from "../SectionCard";
import { Skeleton } from "../ui";

/**
 * Spec §4.9 Daily Brief Archive Preview — continuity and historical
 * context. Backed by real persisted snapshots (Sprint 15's
 * DailyBriefSnapshot model); empty by design until a few days of usage
 * accumulate, per the spec's own empty-state rule.
 */
export default function DailyBriefArchive({ isLoading, error, entries = [] }) {
  if (isLoading) {
    return (
      <SectionCard title="Daily Brief Archive" subtitle="Recent history" className="screen-card">
        <Skeleton variant="line" count={3} />
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Daily Brief Archive" subtitle="Recent history" className="screen-card">
        <p className="company-description negative">Archive retrieval failed — {error}. Showing the latest available brief only.</p>
      </SectionCard>
    );
  }

  if (!entries.length) {
    return (
      <SectionCard title="Daily Brief Archive" subtitle="Recent history" className="screen-card">
        <p className="company-description subtle">Your archive will appear here after a few days.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Daily Brief Archive" subtitle="Recent history" className="screen-card">
      <div className="timeline">
        {entries.map((entry) => (
          <div key={entry.date} className="timeline-item">
            <div className="timeline-dot" />
            <div>
              <div className="timeline-time">{entry.date} &middot; confidence {entry.confidenceScore}/100</div>
              <strong>{entry.topEvent || "No dominant event"}</strong>
              <p className="company-description subtle">{entry.executiveSummary}</p>
              <p className="company-description subtle">{entry.comparedToPrevious}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
