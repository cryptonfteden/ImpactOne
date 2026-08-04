// Sprint 20 — pure, deterministic compound-interest math. No network calls,
// no backend dependency: every value here is instantly recomputable client-
// side as the user adjusts the simulator's sliders. Every result is an
// illustration based on the assumed annualReturnPct input, never a promise.

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

/**
 * Standard monthly-contribution compound growth: each month, the existing
 * balance grows by the monthly rate, then that month's contribution is
 * added. Returns a full year-by-year trajectory (for the timeline chart)
 * plus the final summary figures.
 */
export function computeFutureValue({ monthlyContribution = 0, annualReturnPct = 0, years = 0 }) {
  const monthlyRate = Number(annualReturnPct || 0) / 100 / 12;
  const months = Math.max(0, Math.round(Number(years || 0) * 12));
  const contribution = Number(monthlyContribution || 0);

  let balance = 0;
  let totalContributed = 0;
  const yearlyBalances = [{ year: 0, balance: 0, contributed: 0 }];

  for (let month = 1; month <= months; month += 1) {
    balance = balance * (1 + monthlyRate) + contribution;
    totalContributed += contribution;
    if (month % 12 === 0) {
      yearlyBalances.push({ year: month / 12, balance: round2(balance), contributed: round2(totalContributed) });
    }
  }

  return {
    futureValue: round2(balance),
    totalContributed: round2(totalContributed),
    totalGrowth: round2(balance - totalContributed),
    yearlyBalances,
  };
}
