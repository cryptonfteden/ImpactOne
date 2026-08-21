import SectionCard from "../SectionCard";
import { EmptyState, Skeleton } from "../ui";
import CompanyLogo from "../CompanyLogo";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const price = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function freshness(value) {
  if (!value) return "Update time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Update time unavailable" : `Updated ${date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
}

export default function InsiderOpportunityRadar({ isLoading, error, report, onOpenTicker }) {
  const opportunities = report?.opportunities || [];
  const approved = opportunities.filter((item) => item.committee?.approved);
  const shown = [...(approved.length ? approved : opportunities)]
    .sort((left, right) => Number(right.unusualActivity?.score || 0) - Number(left.unusualActivity?.score || 0)
      || Number(right.committee?.score || 0) - Number(left.committee?.score || 0))
    .slice(0, 4);

  return (
    <SectionCard title="Insider Pulse" subtitle="Notable SEC-verified buys" icon="◎" className="screen-card home-card insider-radar opportunity-radar opportunity-radar--insider">
      {isLoading && !report ? <Skeleton variant="card" count={2} /> : null}
      {error ? <p className="company-description negative">Insider scan unavailable — {error}</p> : null}
      {!isLoading && !error && !shown.length ? <EmptyState message="No verified insider purchase cleared the committee threshold today." /> : null}
      {shown.length ? (
        <div className="insider-radar__grid">
          {shown.map((item) => {
            const score = Number(item.committee?.score || 0);
            const votes = item.committee?.votes || {};
            return (
              <div className="insider-radar__item" key={item.symbol}>
              <button type="button" className={`insider-radar__card ${item.committee?.approved ? "is-approved" : "is-review"}`} onClick={() => onOpenTicker?.(item.symbol)}>
                <span className="insider-radar__score" style={{ "--score": `${score}%` }}><b>{score}</b><small>/100</small></span>
                <span className="insider-radar__body">
                  <span className="insider-radar__top"><CompanyLogo symbol={item.symbol} name={item.company} /><span><strong>{item.symbol}</strong><small>{item.company}</small></span><em>{item.committee?.label || "REVIEW"}</em></span>
                  {item.reversalSignal?.status && item.reversalSignal.status !== "NOT TRIGGERED" ? <span className="insider-radar__reversal"><b>{item.reversalSignal.status}</b><small>{item.reversalSignal.drawdownPct ?? "—"}% drawdown · {item.reversalSignal.distanceTo886Pct ?? "—"}% from 0.886</small></span> : null}
                  <span className="insider-radar__metrics"><span><small>Bought</small><b>{money.format(Number(item.insider?.totalValue || 0))}</b></span><span><small>Average</small><b>{Number.isFinite(Number(item.insider?.averagePrice)) ? price.format(item.insider.averagePrice) : "—"}</b></span><span><small>Insiders</small><b>{item.insider?.distinctBuyers || 0}</b></span></span>
                  <span className="insider-radar__bar"><i style={{ width: `${score}%` }} /></span>
                  <span className="insider-radar__votes">{votes.bullish || 0} bullish · {votes.neutral || 0} neutral · {votes.bearish || 0} bearish <b>{item.committee?.coveragePct || 0}% coverage</b></span>
                  <span className="insider-radar__votes">SEC verified · {item.dataQuality?.latestVerifiedPurchaseDate || "date unavailable"} · {item.dataQuality?.filingsFetched || 0} filing(s)</span>
                  <span className="opportunity-radar__provenance"><b>SEC EDGAR · Form 4 · code P</b><span>{freshness(item.generatedAt || report?.generatedAt)}</span></span>
                </span>
              </button>
              {item.filingUrl ? <a className="insider-radar__filing" href={item.filingUrl} target="_blank" rel="noreferrer">Open verified SEC filing ↗</a> : null}
              </div>
            );
          })}
        </div>
      ) : null}
      <p className="insider-radar__method"><b>Verified gate:</b> SEC Form 4 open-market purchase (code P) · positive price and shares · recent filing · weekly 0.886 context. Missing evidence blocks approval.</p>
    </SectionCard>
  );
}
