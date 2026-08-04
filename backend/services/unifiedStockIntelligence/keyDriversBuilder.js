// Phase UNIFIED-STOCK-INTELLIGENCE-001 — "Explain which agents
// contributed most, why." Ranks the weighted aggregation engine's own
// real per-agent contribution scores — no new math, just ranking and a
// real, checkable explanation string per entry.
function describeContribution(contribution) {
  const directionWord = contribution.direction === "BULLISH" ? "bullish" : contribution.direction === "BEARISH" ? "bearish" : "neutral";
  return `${contribution.agentId} contributed a ${directionWord} signal at ${contribution.confidence}% confidence, weighted by its priority (${contribution.priority}).`;
}

/**
 * @param {Array<{agentId, direction, confidence, priority, contributionScore}>} contributions
 * @returns {Array<{agentId, contributionScore, explanation: string}>} sorted by |contributionScore| descending
 */
function buildKeyDrivers(contributions) {
  return [...contributions]
    .sort((a, b) => Math.abs(b.contributionScore) - Math.abs(a.contributionScore))
    .map((contribution) => ({
      agentId: contribution.agentId,
      direction: contribution.direction,
      confidence: contribution.confidence,
      priority: contribution.priority,
      contributionScore: contribution.contributionScore,
      explanation: describeContribution(contribution),
    }));
}

module.exports = { buildKeyDrivers, describeContribution };
