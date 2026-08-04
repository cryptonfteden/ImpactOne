// Phase INSTITUTIONAL-AGENT-001 — "New institutional positions" /
// "Closed institutional positions" → "New Positions" / "Closed
// Positions". Real managers (from the disclosed cohort) whose real
// prior-quarter position was zero and real current-quarter position is
// positive (NEW), or the reverse (CLOSED) — using the same real
// classification `positionClassifier.js` establishes.
const { classifyPosition } = require("./positionClassifier");

/**
 * @param {Array<object>} managerPositions - from institutionalDataProvider
 * @returns {{ newPositions: Array<object>, closedPositions: Array<object> }}
 */
function analyzeNewClosedPositions(managerPositions) {
  const newPositions = [];
  const closedPositions = [];

  for (const position of managerPositions) {
    const classification = classifyPosition(position);
    if (classification === "NEW") {
      newPositions.push({ managerName: position.managerName, shares: position.currentQuarter.shares, value: position.currentQuarter.value });
    } else if (classification === "CLOSED") {
      closedPositions.push({ managerName: position.managerName, priorShares: position.priorQuarter.shares, priorValue: position.priorQuarter.value });
    }
  }

  return { newPositions, closedPositions };
}

module.exports = { analyzeNewClosedPositions };
