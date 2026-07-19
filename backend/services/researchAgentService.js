// Sprint 37 Priority 11 — Research and Trading Knowledge Agent Foundation.
//
// SAFETY-CRITICAL, explicit mission constraints: this module must not
// place trades, modify portfolios, bypass risk controls, claim a strategy
// works in all regimes, learn from copyrighted books by storing large
// reproduced passages, or present a strategy as proven without testing.
// Enforced here:
//   - No import of portfolioEngineService, autonomousRecommendationEngine,
//     or any order/trade-execution module — verified by this file's own
//     import list and re-checked by a dedicated safety test
//     (safety/researchAgentBoundary.test.js).
//   - registerPrinciple() rejects a summary over MAX_SUMMARY_LENGTH
//     characters — a hard ceiling well below what a reproduced book
//     passage would need, forcing an original, attributable paraphrase.
//   - describeTestStatus() never says "proven" — only ever reports the
//     real count and outcome of recorded backtest results, and explicitly
//     says "not yet tested" when there are none.
//   - regimeRequirements is mandatory on every principle, so a principle
//     can never be presented as regime-agnostic by omission.
const tradingPrincipleRepository = require("./tradingPrincipleRepository");

const MAX_SUMMARY_LENGTH = 600; // a paraphrased principle, not a reproduced passage

function validatePrincipleInput(input = {}) {
  const errors = [];
  if (!input.name || typeof input.name !== "string") errors.push("name is required");
  if (!input.summary || typeof input.summary !== "string") errors.push("summary is required");
  else if (input.summary.length > MAX_SUMMARY_LENGTH) {
    errors.push(`summary must be an attributable paraphrase, not reproduced text — max ${MAX_SUMMARY_LENGTH} characters (got ${input.summary.length})`);
  }
  if (!input.attributedSource || typeof input.attributedSource !== "string") errors.push("attributedSource is required — every principle must credit where it came from");
  if (!input.regimeRequirements || typeof input.regimeRequirements !== "object") errors.push("regimeRequirements is required — a principle can never be presented as regime-agnostic");
  if (!input.entryConditions) errors.push("entryConditions is required");
  if (!input.invalidationConditions) errors.push("invalidationConditions is required");
  if (!input.riskRules) errors.push("riskRules is required");
  if (!input.knownFailureModes) errors.push("knownFailureModes is required");
  return errors;
}

async function registerPrinciple(input) {
  const errors = validatePrincipleInput(input);
  if (errors.length) {
    const error = new Error(`Cannot register principle: ${errors.join("; ")}`);
    error.status = 400;
    throw error;
  }

  return tradingPrincipleRepository.createPrinciple({
    name: input.name,
    summary: input.summary,
    attributedSource: input.attributedSource,
    regimeRequirements: input.regimeRequirements,
    entryConditions: input.entryConditions,
    invalidationConditions: input.invalidationConditions,
    riskRules: input.riskRules,
    knownFailureModes: input.knownFailureModes,
  });
}

async function listPrinciples() {
  return tradingPrincipleRepository.listPrinciples();
}

async function recordBacktestResult(principleId, result = {}) {
  if (!principleId) throw new Error("principleId is required");
  if (!Number.isFinite(result.sampleSize) || result.sampleSize <= 0) throw new Error("sampleSize must be a real positive number — a backtest result needs a real sample");
  if (!result.regimeTested) throw new Error("regimeTested is required — a result is only ever valid for the regime it was actually tested in");

  return tradingPrincipleRepository.recordBacktestResult({
    principleId,
    regimeTested: result.regimeTested,
    sampleSize: result.sampleSize,
    winRate: Number.isFinite(result.winRate) ? result.winRate : null,
    averageReturn: Number.isFinite(result.averageReturn) ? result.averageReturn : null,
    notes: result.notes || "",
  });
}

/**
 * Never says "proven." Reports the real, honest test status: untested,
 * or a real summary of recorded results scoped to the regimes actually
 * tested — explicitly not a claim of universal validity.
 */
async function describeTestStatus(principleId) {
  const results = await tradingPrincipleRepository.listBacktestResultsForPrinciple(principleId);
  if (!results.length) {
    return { status: "NOT_YET_TESTED", regimesTested: [], resultCount: 0, summary: "This principle has not been backtested yet — it is a hypothesis, not a validated strategy." };
  }

  const regimesTested = [...new Set(results.map((result) => result.regimeTested))];
  return {
    status: "TESTED_IN_SPECIFIC_REGIMES",
    regimesTested,
    resultCount: results.length,
    summary: `Tested in ${regimesTested.length} regime(s) across ${results.length} recorded result(s). This is evidence for those specific regimes only — not a claim the principle works in all market conditions.`,
    results,
  };
}

/**
 * Read-only evidence supply to the committee — mirrors exactly how every
 * other intelligence category supplies evidence (a list of relevant
 * items with their own confidence/uncertainty), never a verdict, and this
 * function itself never calls into canonicalVerdict or the committee; the
 * committee, if it chooses to, calls this and decides what to do with it.
 */
async function supplyResearchEvidence({ themes = [] } = {}) {
  const principles = await tradingPrincipleRepository.listPrinciples();
  const relevant = themes.length
    ? principles.filter((principle) => themes.some((theme) => JSON.stringify(principle.regimeRequirements).toLowerCase().includes(theme.toLowerCase())))
    : principles;

  return relevant.map((principle) => ({
    principleId: principle.id,
    name: principle.name,
    summary: principle.summary,
    attributedSource: principle.attributedSource,
    regimeRequirements: principle.regimeRequirements,
    isRecommendation: false,
  }));
}

module.exports = {
  MAX_SUMMARY_LENGTH,
  validatePrincipleInput,
  registerPrinciple,
  listPrinciples,
  recordBacktestResult,
  describeTestStatus,
  supplyResearchEvidence,
};
