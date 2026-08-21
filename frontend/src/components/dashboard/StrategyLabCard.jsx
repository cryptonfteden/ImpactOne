import SectionCard from "../SectionCard";
import CompanyLogo from "../CompanyLogo";

export default function StrategyLabCard({ data, error, isLoading, onOpenTicker }) {
  if (isLoading) return <SectionCard title="Entry Flight Deck" subtitle="Verifying weekly 0.886 entry zones" icon="0.886" className="strategy-lab-card opportunity-radar opportunity-radar--fib"><p>Checking verified weekly candles…</p></SectionCard>;
  if (error) return <SectionCard title="Entry Flight Deck" subtitle="Paper trading · your plans remain safe" icon="0.886" className="strategy-lab-card opportunity-radar opportunity-radar--fib"><div className="strategy-lab-card__connection"><b>Demo portfolio is offline</b><span>Reconnect the local data service to resume the simulation.</span></div></SectionCard>;
  const report = data?.latestWeeklyReport;
  const active = (data?.plans || []).filter((plan) => plan.status === "ACTIVE");
  return (
    <SectionCard title="Entry Flight Deck" subtitle="Five paper entries · verified weekly 0.886 touch only" icon="0.886" className="screen-card home-card strategy-lab-card opportunity-radar opportunity-radar--fib">
      <div className="strategy-lab-summary">
        <div><small>Demo capital</small><strong>${Number(data?.portfolio?.totalValue || 0).toLocaleString()}</strong></div>
        <div><small>Open trades</small><strong>{data?.portfolio?.positions?.length || 0}</strong></div>
        <div><small>Weekly watchlist</small><strong>{active.length}</strong></div>
        <div><small>Total return</small><strong className={Number(data?.portfolio?.totalReturn) >= 0 ? "positive" : "negative"}>{Number(data?.portfolio?.totalReturnPct || 0).toFixed(2)}%</strong></div>
      </div>
      <p className="strategy-lab-report">{report?.simpleSummary}</p>
      <div className="strategy-lab-plans">
        {active.slice(0, 8).map((plan) => {
          const livePrice = Number(plan.lastWeeklyCheck?.currentPrice);
          const weeklyLive = Number.isFinite(livePrice) && livePrice > 0;
          return <button key={plan.symbol} type="button" className={plan.armedAt ? "is-armed" : "is-watching"} onClick={() => onOpenTicker?.(plan.symbol)}><header><b><CompanyLogo symbol={plan.symbol} size="small" />{plan.symbol}</b><em>{plan.armedAt ? "ENTRY ZONE" : weeklyLive ? "LIVE WATCH" : "TARGET SAVED"}</em></header><span>{plan.tranches.map((tranche) => <i key={tranche.number} className={tranche.status === "FILLED" ? "filled" : ""} title={`${tranche.offsetPct}% · $${tranche.triggerPrice}`} />)}</span><footer><span><small>Weekly 0.886 target</small><em>{weeklyLive ? `Live $${livePrice.toFixed(2)}` : "Weekly feed unavailable"}</em></span><strong>${Number(plan.targetPrice).toFixed(2)}</strong></footer></button>;
        })}
      </div>
      <small className="company-description">Paper trading only. The first tranche is allowed only when verified weekly price reaches 0.886. Lower tranches average down; upper tranches require a rebound after that first touch.</small>
    </SectionCard>
  );
}
