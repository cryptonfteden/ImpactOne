// Sprint 39 Priority 7 — What-If Engine.
//
// Internal only. Recomputes the committee with one evidence category
// removed and reports whether the committee's overall lean changed —
// never exposes a hidden numeric weight, only a before/after comparison
// of the same agreement/disagreement structure Sprint 38 already builds.
const intelligenceCommitteeService = require("../intelligenceCommittee/intelligenceCommitteeService");
const { classifyDisagreement } = require("./disagreementEngine");

function overallLean(committeeSummary) {
  if (committeeSummary.agreement.status === "AGREEMENT") return committeeSummary.agreement.direction;
  if (committeeSummary.disagreement.status === "DISAGREEMENT") return "SPLIT";
  return "NO_CLEAR_LEAN";
}

async function runWhatIf(symbol, excludeCategory) {
  if (!excludeCategory) throw new Error("excludeCategory is required for a what-if run");

  const [baseline, whatIf] = await Promise.all([
    intelligenceCommitteeService.convene(symbol),
    intelligenceCommitteeService.convene(symbol, { excludeCategory }),
  ]);

  const baselineLean = overallLean(baseline.committee);
  const whatIfLean = overallLean(whatIf.committee);

  return {
    symbol,
    excludedCategory: excludeCategory,
    baseline: { lean: baselineLean, disagreementLevel: classifyDisagreement(baseline.committee).level },
    whatIf: { lean: whatIfLean, disagreementLevel: classifyDisagreement(whatIf.committee).level },
    verdictChanged: baselineLean !== whatIfLean,
    isVerdict: false,
  };
}

module.exports = { runWhatIf };
