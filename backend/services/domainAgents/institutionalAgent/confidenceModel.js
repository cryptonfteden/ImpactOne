// Phase INSTITUTIONAL-AGENT-001 — overall "Confidence" (0-100), a
// disclosed, hand-set weighted formula (never a naive average): data
// availability (30 pts), real coverage — how many of the disclosed
// cohort's managers were actually successfully checked (up to 25 pts)
// and how many had a real, comparable prior quarter (up to 20 pts) —
// real conviction/consensus among managers who changed their real
// position (up to 15 pts), and a fixed, disclosed penalty (10 pts)
// for this agent's inherent scope limitation: a curated cohort, never
// the full universe of real 13F filers.
const BASE_AVAILABLE = 30;
const MAX_COVERAGE_BONUS = 25;
const MAX_COMPARABLE_BONUS = 20;
const MAX_CONVICTION_BONUS = 15;
const STRUCTURAL_SCOPE_PENALTY = 10;

/**
 * @param {{ dataAvailable: boolean, totalManagers: number, checkedCount: number, comparableManagerCount: number, convictionScore: number }} params
 * @returns {{ confidence: number, components: object }}
 */
function computeConfidence({ dataAvailable, totalManagers, checkedCount, comparableManagerCount, convictionScore }) {
  if (!dataAvailable) {
    return { confidence: 0, components: { base: 0, coverageBonus: 0, comparableBonus: 0, convictionBonus: 0, structuralPenalty: 0 } };
  }

  const base = BASE_AVAILABLE;
  const coverageBonus = totalManagers > 0 ? Math.round((checkedCount / totalManagers) * MAX_COVERAGE_BONUS) : 0;
  const comparableBonus = totalManagers > 0 ? Math.round((comparableManagerCount / totalManagers) * MAX_COMPARABLE_BONUS) : 0;
  const convictionBonus = Math.round((convictionScore / 100) * MAX_CONVICTION_BONUS);
  const structuralPenalty = STRUCTURAL_SCOPE_PENALTY;

  const confidence = Math.round(Math.max(0, Math.min(100, base + coverageBonus + comparableBonus + convictionBonus - structuralPenalty)));

  return { confidence, components: { base, coverageBonus, comparableBonus, convictionBonus, structuralPenalty } };
}

module.exports = { computeConfidence };
