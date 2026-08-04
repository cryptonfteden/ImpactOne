// Phase INSTITUTIONAL-AGENT-001 — "Smart money participation" /
// "Institutional conviction" → participation rate + "Conviction
// Score". Participation is the real fraction of the disclosed cohort
// that actually holds the stock right now; conviction is the real
// fraction of managers with a real, comparable direction (increased or
// decreased) who agree with each other — real consensus, not
// magnitude (that's what Accumulation/Distribution Score already
// measure). Both honestly report 0 with no real comparable data,
// never a fabricated middle value.
const { classifyPosition } = require("./positionClassifier");

/**
 * @param {Array<object>} managerPositions - from institutionalDataProvider
 * @returns {{ participationRate: number, convictionScore: number, holdingCount: number, checkedCount: number }}
 */
function analyzeConviction(managerPositions) {
  const checked = managerPositions.filter((position) => position.checked);
  const holding = checked.filter((position) => position.currentQuarter && position.currentQuarter.shares > 0);
  const participationRate = checked.length > 0 ? Math.round((holding.length / checked.length) * 100) : 0;

  const directional = managerPositions
    .map((position) => classifyPosition(position))
    .filter((classification) => classification === "INCREASED" || classification === "DECREASED");

  if (!directional.length) {
    return { participationRate, convictionScore: 0, holdingCount: holding.length, checkedCount: checked.length };
  }

  const increasedCount = directional.filter((classification) => classification === "INCREASED").length;
  const decreasedCount = directional.length - increasedCount;
  const majorityCount = Math.max(increasedCount, decreasedCount);
  const convictionScore = Math.round((majorityCount / directional.length) * 100);

  return { participationRate, convictionScore, holdingCount: holding.length, checkedCount: checked.length };
}

module.exports = { analyzeConviction };
