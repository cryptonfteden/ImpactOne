// Sprint 39 — Explainability Layer orchestrator.
//
// Recommendation Engine -> Decision Trace -> Committee Debate -> Evidence
// Matrix -> Providers. This is the only file in this subsystem that reads
// both the (immutable, Sprint 16/18A) DecisionTrace and re-convenes the
// (Sprint 38) evidence-matrix committee. Every field returned traces back
// to a real stored or freshly-computed value — nothing here is invented.
// Never imports autonomousRecommendationEngine, canonicalVerdict, or any
// portfolio/order/trade module — this is read-only explanation, not a
// second recommendation path.
const autonomousRecommendationRepository = require("../autonomousRecommendationRepository");
const intelligenceCommitteeService = require("../intelligenceCommittee/intelligenceCommitteeService");
const { buildProvenance } = require("./provenanceService");
const { classifyDisagreement } = require("./disagreementEngine");
const { checkConsistency } = require("./consistencyCheckService");
const { explainRecommendation } = require("./recommendationExplanationService");
const { buildSevenQuestions } = require("./sevenQuestionsService");
// Sprint 42 — Intelligence Quality Platform: Explainability History. Users
// must be able to inspect the original recommendation/committee/evidence/
// confidence alongside the final real outcome and the real lifecycle —
// both read-only, both never rewriting the immutable DecisionTrace above.
const worldMemoryRepository = require("../worldMemoryRepository");
const recommendationLifecycleService = require("../qualityPlatform/recommendationLifecycleService");

/**
 * Sprint 39 Priority 1/2/3/4/5/6/8 — assembles the full explainability
 * bundle for one recommendation. Throws (never fabricates a trace) if the
 * recommendation or its DecisionTrace doesn't exist — "no orphan
 * recommendation" is enforced structurally here, not just documented.
 */
async function explainRecommendationById(recommendationId) {
  const recommendation = await autonomousRecommendationRepository.getById(recommendationId);
  if (!recommendation) {
    const error = new Error(`No recommendation found for id ${recommendationId}`);
    error.status = 404;
    throw error;
  }

  const decisionTrace = await autonomousRecommendationRepository.getDecisionTraceByRecommendationId(recommendationId);
  if (!decisionTrace) {
    const error = new Error(`Recommendation ${recommendationId} has no DecisionTrace — refusing to fabricate one`);
    error.status = 404;
    throw error;
  }

  // A fresh, honestly-labeled re-convening of the Sprint 38 committee for
  // this symbol — NOT a replay of the historical committeeDebate stored on
  // the trace (that snapshot is immutable and shown separately, unaltered).
  const liveCommittee = await intelligenceCommitteeService.convene(recommendation.symbol);

  const disagreement = classifyDisagreement(liveCommittee.committee);
  const consistency = checkConsistency({ recommendationAction: recommendation.action, committeeSummary: liveCommittee.committee });
  const explanation = explainRecommendation({ recommendation, committeeSummary: liveCommittee.committee });
  const provenance = buildProvenance(liveCommittee.evidenceMatrix);

  // Sprint 42 — real, honestly-nullable final outcome and lifecycle;
  // neither is ever fabricated when grading/lifecycle logging hasn't
  // happened yet for this recommendation.
  const [finalOutcome, lifecycle] = await Promise.all([
    worldMemoryRepository.getOutcomeForRecommendation(recommendationId),
    recommendationLifecycleService.getLifecycle(recommendationId),
  ]);

  const bundle = {
    recommendationId: recommendation.id,
    symbol: recommendation.symbol,
    timestamp: decisionTrace.createdAt,
    decisionTrace: {
      inputEvidence: decisionTrace.inputEvidence,
      rankingResult: decisionTrace.rankingResult,
      confidenceCalculation: decisionTrace.confidenceCalculation,
      finalOutput: decisionTrace.finalOutput,
      historicalCommitteeDebate: decisionTrace.committeeDebate, // the unified committee's own immutable snapshot from creation time (Sprint 41)
      evidenceReferences: decisionTrace.evidenceReferences,
    },
    // Sprint 42 — Explainability History. Never rewritten: finalOutcome is
    // whatever the (immutable, append-only) Outcome table says, or null if
    // grading hasn't happened yet; lifecycle is the real, ordered
    // transition history, or an empty list if none has been recorded yet.
    finalOutcome: finalOutcome || null,
    lifecycle,
    liveCommittee: {
      generatedAt: liveCommittee.generatedAt,
      evidenceMatrixGeneratedAt: liveCommittee.evidenceMatrixGeneratedAt,
      members: liveCommittee.committee.members,
      strongestSupportingEvidence: liveCommittee.committee.strongestSupportingEvidence,
      strongestContradictoryEvidence: liveCommittee.committee.strongestContradictoryEvidence,
      missingEvidence: liveCommittee.committee.missingEvidence,
      staleEvidence: liveCommittee.committee.staleEvidence,
      unavailableEvidence: liveCommittee.evidenceMatrix.categories.filter((row) => row.stance === "UNAVAILABLE").map((row) => ({ category: row.category, reason: row.reason })),
    },
    cio: liveCommittee.cio,
    disagreement,
    consistency,
    explanation,
    provenance,
    confidence: recommendation.confidenceScore,
    uncertainty: decisionTrace.confidenceCalculation?.uncertainty ?? null,
    isVerdict: false, // this is an explanation of a past verdict, never a new one
  };

  // Phase X7 — Part 2. Every recommendation must answer the mission's
  // seven required questions — derived here from the real fields already
  // assembled above, never a second explanation path.
  bundle.sevenQuestions = buildSevenQuestions(bundle);

  return bundle;
}

module.exports = { explainRecommendationById };
