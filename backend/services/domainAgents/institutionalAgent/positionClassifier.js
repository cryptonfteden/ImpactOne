// Phase INSTITUTIONAL-AGENT-001 — the one shared classification every
// analyzer below builds on: given one real manager's real current- and
// prior-quarter position (from institutionalDataProvider.js), classify
// it as a real NEW/CLOSED/INCREASED/DECREASED/UNCHANGED position, or
// honestly UNKNOWN when the real data needed for a comparison isn't
// available (this manager's fetch failed, or only one quarter's real
// data could be resolved).
/**
 * @param {{ checked: boolean, currentQuarter: object|null, priorQuarter: object|null }} managerPosition
 * @returns {"NEW"|"CLOSED"|"INCREASED"|"DECREASED"|"UNCHANGED"|"NONE"|"UNKNOWN"}
 *   "NONE" means real data confirms this manager holds nothing in either quarter.
 */
function classifyPosition({ checked, currentQuarter, priorQuarter }) {
  if (!checked || !currentQuarter || !priorQuarter) return "UNKNOWN";

  const currentShares = currentQuarter.shares;
  const priorShares = priorQuarter.shares;

  if (currentShares === 0 && priorShares === 0) return "NONE";
  if (priorShares === 0 && currentShares > 0) return "NEW";
  if (priorShares > 0 && currentShares === 0) return "CLOSED";
  if (currentShares > priorShares) return "INCREASED";
  if (currentShares < priorShares) return "DECREASED";
  return "UNCHANGED";
}

module.exports = { classifyPosition };
