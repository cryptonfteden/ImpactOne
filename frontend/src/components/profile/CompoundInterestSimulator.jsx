import { useMemo, useState } from "react";
import { computeFutureValue } from "../../utils/compoundInterest";
import { getCurrencyForCountry } from "../../utils/currency";
import FutureTimelineChart from "./FutureTimelineChart";

/**
 * Sprint 20, Part 2 — entirely client-side: every value recomputes
 * instantly as the user adjusts a slider, with zero network round-trips.
 * suggestedAnnualReturnPct is only ever a starting point for the slider,
 * never a fixed value — the user can move it to see how the assumption
 * changes the illustration.
 */
export default function CompoundInterestSimulator({ monthlyInvestmentAmount, suggestedAnnualReturnPct, country }) {
  const [monthlyContribution, setMonthlyContribution] = useState(Number(monthlyInvestmentAmount) || 100);
  const [annualReturnPct, setAnnualReturnPct] = useState(Number(suggestedAnnualReturnPct) || 6);
  const [years, setYears] = useState(20);

  const currencySymbol = getCurrencyForCountry(country);
  const result = useMemo(
    () => computeFutureValue({ monthlyContribution, annualReturnPct, years }),
    [monthlyContribution, annualReturnPct, years]
  );

  return (
    <div className="simulator">
      <div className="simulator__controls">
        <label className="simulator__control">
          <span>Monthly contribution</span>
          <input
            type="range"
            min="0"
            max="5000"
            step="50"
            value={monthlyContribution}
            onChange={(event) => setMonthlyContribution(Number(event.target.value))}
          />
          <strong>
            {currencySymbol}
            {monthlyContribution.toLocaleString()}/mo
          </strong>
        </label>

        <label className="simulator__control">
          <span>Assumed annual return (adjustable)</span>
          <input
            type="range"
            min="0"
            max="15"
            step="0.5"
            value={annualReturnPct}
            onChange={(event) => setAnnualReturnPct(Number(event.target.value))}
          />
          <strong>{annualReturnPct}%/yr</strong>
        </label>

        <label className="simulator__control">
          <span>Years</span>
          <input type="range" min="1" max="40" step="1" value={years} onChange={(event) => setYears(Number(event.target.value))} />
          <strong>{years} years</strong>
        </label>
      </div>

      <div className="simulator__result">
        <p className="simulator__result-label">Illustrated future value</p>
        <p className="simulator__result-value">
          {currencySymbol}
          {result.futureValue.toLocaleString()}
        </p>
        <p className="company-description subtle">
          {currencySymbol}
          {result.totalContributed.toLocaleString()} contributed + {currencySymbol}
          {result.totalGrowth.toLocaleString()} illustrated growth
        </p>
      </div>

      <FutureTimelineChart yearlyBalances={result.yearlyBalances} currencySymbol={currencySymbol} />

      <p className="onboarding-error simulator__disclaimer">
        Illustration only — not a promise. Based on a configurable assumed {annualReturnPct}% annual return; actual
        returns will vary and could be negative in any given year.
      </p>
    </div>
  );
}
