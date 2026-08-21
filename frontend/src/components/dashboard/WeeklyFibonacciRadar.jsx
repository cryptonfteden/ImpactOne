import SectionCard from "../SectionCard";
import { EmptyState, Skeleton } from "../ui";
import CompanyLogo from "../CompanyLogo";

const price = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function isVerifiedApproval(item) {
  const blockers = Array.isArray(item?.committee?.blockers) ? item.committee.blockers : [];
  return item?.committee?.approved === true && item?.weekly?.signalEligible === true && blockers.length === 0;
}

function freshness(value) {
  if (!value) return "Update time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Update time unavailable" : `Updated ${date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
}

export default function WeeklyFibonacciRadar({ isLoading, error, report, onOpenTicker }) {
  const opportunities = report?.opportunities || [];
  const approved = (report?.approvedOpportunities || opportunities).filter(isVerifiedApproval);
  const shown = approved.slice(0, 4);
  const coverage = report?.coverage || {};

  return (
    <SectionCard title="Weekly 0.886 Radar" subtitle="Verified setups approved by the agent committee" icon="⌁" className="screen-card home-card weekly-fib-radar opportunity-radar opportunity-radar--fib">
      <div className="weekly-fib-radar__meta">
        <span><b>{coverage.configuredUniverse || 0}</b> official US stocks</span>
        <span><b>{coverage.scanned || 0}</b> scanned · {coverage.progressPct || 0}%</span>
        <span><b>{coverage.weeklyDataAvailable || 0}</b> with weekly data</span>
        <span><b>{coverage.nearPoint886 || 0}</b> near 0.886</span>
        <span><b>{coverage.approved || 0}</b> approved</span>
        <span><b>{coverage.rejectedByCommittee || 0}</b> rejected</span>
        <span><b>Source</b> {report?.universe?.source || "connecting"}</span>
        <span>{freshness(report?.generatedAt)}</span>
        <em>Weekly only</em>
      </div>
      <div className="weekly-fib-radar__coverage" role="progressbar" aria-label="Full US stock market scan coverage" aria-valuemin="0" aria-valuemax="100" aria-valuenow={coverage.progressPct || 0}>
        <i style={{ width: `${coverage.progressPct || 0}%` }} />
        <small>{coverage.cycleComplete ? "Full market cycle complete" : `${coverage.remaining || 0} stocks remaining · scan continues automatically`}</small>
      </div>
      {isLoading && !report ? <Skeleton variant="card" count={2} /> : null}
      {error ? <p className="company-description negative">Weekly Fibonacci scan unavailable — {error}</p> : null}
      {!isLoading && !error && !shown.length ? <EmptyState message={`No approved stock has passed the weekly 0.886 strategy and full agent committee in the ${coverage.scanned || 0} stocks checked so far. ${coverage.cycleComplete ? "The full official US stock universe was covered." : `The remaining ${coverage.remaining || 0} stocks are being scanned automatically.`}`} /> : null}
      {shown.length ? <div className="weekly-fib-radar__grid">{shown.map((item) => {
        const weekly = item.weekly || {};
        const committee = item.committee || {};
        const votes = committee.votes || {};
        const score = Number(committee.score || 0);
        return (
          <button type="button" key={item.symbol} className="weekly-fib-radar__card is-approved" onClick={() => onOpenTicker?.(item.symbol)}>
            <span className="weekly-fib-radar__orbit" style={{ "--score": `${score}%` }}><b>{score}</b><small>/100</small></span>
            <span className="weekly-fib-radar__content">
              <span className="weekly-fib-radar__title"><CompanyLogo symbol={item.symbol} /><span><strong>{item.symbol}</strong><small>{weekly.status}</small></span><em>{committee.label}</em></span>
              <span className="weekly-fib-radar__prices"><span><small>NOW</small><b>{price.format(weekly.currentPrice)}</b></span><span><small>0.886 POINT</small><b>{price.format(weekly.targetPrice)}</b></span><span><small>DISTANCE</small><b>{Number(weekly.distancePct).toFixed(2)}%</b></span></span>
              <span className="weekly-fib-radar__track"><i style={{ width: `${Math.max(3, 100 - Math.min(100, Math.abs(Number(weekly.distancePct || 0)) * 12))}%` }} /></span>
              <span className="weekly-fib-radar__votes">{votes.bullish || 0} bullish · {votes.neutral || 0} neutral · {votes.bearish || 0} bearish <b>{committee.coveragePct || 0}% coverage</b></span>
              <span className="opportunity-radar__provenance"><b>{report?.universe?.source || "Verified US equity directory"}</b><span>Completed weekly candles</span><span>{freshness(item.generatedAt || report?.generatedAt)}</span></span>
            </span>
          </button>
        );
      })}</div> : null}
      <p className="insider-radar__method"><b>Verified gate:</b> completed weekly candles · chronological low → later high · first approach from above within 5% · no prior weekly close below 0.886 · full committee approval.</p>
    </SectionCard>
  );
}
