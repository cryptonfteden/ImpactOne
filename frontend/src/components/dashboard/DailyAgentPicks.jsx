import SectionCard from "../SectionCard";
import { EmptyState, LoadingSpinner } from "../ui";
import CompanyLogo from "../CompanyLogo";

function PickRow({ pick, status = "VERIFIED", onOpenTicker }) {
  return <button className={status === "VERIFIED" ? "is-verified" : "is-review"} type="button" onClick={() => onOpenTicker?.(pick.symbol)}><CompanyLogo symbol={pick.symbol} /><span><b>{pick.symbol} <i>{status}</i></b><small>{pick.signal}</small></span><strong>{pick.score}</strong></button>;
}

function CategoryBody({ group, onOpenTicker }) {
  const rows = [...(group.picks || []).map((pick) => ({ ...pick, status: "VERIFIED" })), ...(group.candidates || []).map((pick) => ({ ...pick, status: pick.status || "REVIEW" }))];
  if (group.stories?.length) return <div className="daily-official-stories">{group.stories.map((story) => <article key={story.id || story.sourceUrl}>
    <header><span>OFFICIAL</span><strong>{story.score}/100</strong></header>
    <h4>{story.headline}</h4>
    <p>{story.whyItMatters}</p>
    <footer><small>{story.sourceName} · {story.publishedAt ? new Date(story.publishedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Latest release"}</small>{story.sourceUrl ? <a href={story.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a> : null}</footer>
  </article>)}</div>;
  if (group.id !== "short-flow") return rows.map((pick) => <PickRow key={`${pick.status}-${pick.symbol}`} pick={pick} status={pick.status} onOpenTicker={onOpenTicker} />);
  const shortRows = rows.filter((pick) => pick.direction === "BEARISH_FLOW");
  const marketRows = rows.filter((pick) => pick.direction !== "BEARISH_FLOW");
  return <div className="daily-agent-flow-split">
    <section className="is-short"><h4>Short Pressure</h4>{shortRows.length ? shortRows.map((pick) => <PickRow key={`short-${pick.symbol}`} pick={pick} status={pick.status} onOpenTicker={onOpenTicker} />) : <span>No unusual short flow</span>}</section>
    <section className="is-market"><h4>Non-short Flow</h4>{marketRows.length ? marketRows.map((pick) => <PickRow key={`market-${pick.symbol}`} pick={pick} status={pick.status} onOpenTicker={onOpenTicker} />) : <span>No verified market-flow leader</span>}</section>
  </div>;
}

export default function DailyAgentPicks({ isLoading, error, report, onOpenTicker }) {
  if (isLoading) return <SectionCard title="Signal Radar" subtitle="1–3 source-linked signals per specialist" icon="✦" className="screen-card home-card"><LoadingSpinner label="Building today's agent lists…" /></SectionCard>;
  if (error) return <SectionCard title="Signal Radar" subtitle="1–3 source-linked signals per specialist" icon="✦" className="screen-card home-card"><EmptyState title="Daily board unavailable" description={error} /></SectionCard>;
  const categories = report?.categories || [];
  const gold = report?.goldPicks || [];
  const goldOpportunities = report?.goldOpportunities || gold.map((pick) => ({ ...pick, state: "CONFIRMED", independentConfirmationCount: Math.max(0, (pick.coverage || 1) - 1) }));
  return <SectionCard title="Signal Radar" subtitle="Approved picks and review candidates stay clearly separated" icon="✦" className="screen-card home-card daily-agent-board">
    <div className="daily-agent-board__gold">
      <header><b>STRATEGY HORIZON</b><span>Radar → Watch → Confirmed · Fibonacci remains the primary gate</span></header>
      {goldOpportunities.length ? goldOpportunities.map((pick) => <button className={`gold-state gold-state--${pick.state?.toLowerCase()}`} key={pick.symbol} type="button" onClick={() => onOpenTicker?.(pick.symbol)}><CompanyLogo symbol={pick.symbol} size="large" /><b>{pick.symbol}</b><strong>{pick.score}/100</strong><small>{pick.state} · {pick.previousState && pick.previousState !== pick.state ? `${pick.previousState} → ` : ""}{pick.independentConfirmationCount || 0} confirmations</small></button>) : <p>No verified weekly setup is currently inside the 5% strategy zone.</p>}
    </div>
    <div className="daily-agent-board__groups">{categories.map((group) => <article key={group.id}>
      <header><div><b>{group.title}</b><small>{group.source}</small></div><em>{group.stories?.length || group.count} verified{group.candidates?.length ? ` · ${group.candidates.length} review` : ""}</em></header>
      <CategoryBody group={group} onOpenTicker={onOpenTicker} />
      {!group.picks?.length && !group.candidates?.length && !group.stories?.length ? <p><b>{group.unavailableReason?.toLowerCase().includes("not connected") ? "Source not connected" : "No verified signal today"}</b><span>{group.unavailableReason}</span></p> : null}
    </article>)}</div>
  </SectionCard>;
}
