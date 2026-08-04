// Phase AI-CORE-001 — Claim Intelligence Layer. Confidence (evidence
// quality) and probability (likelihood of the predicted outcome) are
// computed from DELIBERATELY DIFFERENT real inputs (mission §5: "They
// are not interchangeable") — confidence never feeds into probability's
// formula or vice versa. Both are pure, deterministic functions of the
// evidence ledger; both are honestly null when there's nothing real to
// compute from.
const { clamp } = require("../../utils/portfolioRiskMetrics");
const { MAX_SINGLE_EVIDENCE_WEIGHT, MAX_CONFIDENCE_DELTA_PER_UPDATE, MAX_PROBABILITY_DELTA_PER_UPDATE } = require("./claimDimensions");

// Fixed, hand-set component weights for confidence — disclosed, not
// hidden, pending real calibration data, same honesty precedent as
// scoringVocabulary.js's QUALITY_WEIGHTS note and the Options Agent's
// optionsAnomalyConfidence.js §6 disclosure.
const CONFIDENCE_COMPONENT_WEIGHTS = {
  sourceReliability: 0.3,
  freshness: 0.15,
  independence: 0.15,
  breadth: 0.15,
  agreement: 0.25,
};

/**
 * Caps any single weight at `maxWeight`, redistributing the excess
 * proportionally — identical algorithm to
 * marketSentimentRollup.capAndRedistributeWeights, reimplemented here
 * (not imported) so this engine-specific module stays self-contained,
 * matching the precedent that each engine owns its own weighting logic.
 */
function capAndRedistributeWeights(rawWeights, maxWeight) {
  const weights = [...rawWeights];
  const locked = weights.map(() => false);
  for (let iteration = 0; iteration < weights.length; iteration += 1) {
    const unlockedIdx = weights.map((_, index) => index).filter((index) => !locked[index]);
    if (!unlockedIdx.length) break;
    const lockedSum = weights.reduce((sum, weight, index) => (locked[index] ? sum + weight : sum), 0);
    const budget = 1 - lockedSum;
    const unlockedSum = unlockedIdx.reduce((sum, index) => sum + weights[index], 0);
    let anyNewlyCapped = false;
    for (const index of unlockedIdx) {
      const share = unlockedSum > 0 ? weights[index] / unlockedSum : 1 / unlockedIdx.length;
      const proposed = share * budget;
      if (proposed > maxWeight + 1e-9) {
        weights[index] = maxWeight;
        locked[index] = true;
        anyNewlyCapped = true;
      }
    }
    if (!anyNewlyCapped) {
      const finalUnlockedIdx = weights.map((_, index) => index).filter((index) => !locked[index]);
      const finalLockedSum = weights.reduce((sum, weight, index) => (locked[index] ? sum + weight : sum), 0);
      const finalBudget = 1 - finalLockedSum;
      const finalUnlockedSum = finalUnlockedIdx.reduce((sum, index) => sum + weights[index], 0);
      for (const index of finalUnlockedIdx) {
        weights[index] = finalUnlockedSum > 0 ? (weights[index] / finalUnlockedSum) * finalBudget : finalBudget / finalUnlockedIdx.length;
      }
      break;
    }
  }
  return weights;
}

// Simple, disclosed linear decay — fully fresh at 0h, fully stale by 50h.
// Not a fitted model; a documented, honest simplification (same
// discipline as every other decay function in this platform).
function evidenceFreshnessScore(ageMs) {
  if (!Number.isFinite(ageMs)) return null;
  const ageHours = ageMs / (60 * 60 * 1000);
  return clamp(Math.round(100 - ageHours * 2), 0, 100);
}

/**
 * Confidence — how much real, fresh, independent, agreeing evidence
 * backs this claim. Inputs: source-reported reliability (each entry's
 * own confidence), freshness, independence (distinct independenceGroup
 * count / total entries), breadth (distinct contributing engines),
 * agreement (SUPPORTS vs CONTRADICTS ratio), and a real counter-evidence
 * penalty. `null` components are honestly excluded from the weighted
 * average (never defaulted to a mid-range guess) — dominance-capped so
 * no single component (and, via evidence-level weighting upstream, no
 * single evidence entry) can alone determine the result.
 */
function aggregateConfidence(evidenceEntries = []) {
  const supports = evidenceEntries.filter((entry) => entry.stance === "SUPPORTS");
  const contradicts = evidenceEntries.filter((entry) => entry.stance === "CONTRADICTS");
  const invalidates = evidenceEntries.filter((entry) => entry.stance === "INVALIDATES");

  const withConfidence = evidenceEntries.filter((entry) => Number.isFinite(entry.confidence));
  const sourceReliability = withConfidence.length ? withConfidence.reduce((sum, entry) => sum + entry.confidence, 0) / withConfidence.length : null;

  const freshnessScores = evidenceEntries.map((entry) => evidenceFreshnessScore(entry.freshness?.ageMs)).filter((value) => Number.isFinite(value));
  const freshness = freshnessScores.length ? freshnessScores.reduce((sum, value) => sum + value, 0) / freshnessScores.length : null;

  const independenceGroups = new Set(evidenceEntries.map((entry) => entry.independenceGroup));
  const independence = evidenceEntries.length ? (independenceGroups.size / evidenceEntries.length) * 100 : null;

  const distinctAgents = new Set(evidenceEntries.map((entry) => entry.sourceEngine));
  const breadth = evidenceEntries.length ? clamp(distinctAgents.size * 40, 0, 100) : null;

  const directionalCount = supports.length + contradicts.length;
  const agreement = directionalCount > 0 ? (supports.length / directionalCount) * 100 : null;

  const components = { sourceReliability, freshness, independence, breadth, agreement };
  const availableKeys = Object.keys(components).filter((key) => Number.isFinite(components[key]));

  if (!availableKeys.length) {
    return { confidence: null, components, counterEvidencePenalty: 0 };
  }

  const totalWeight = availableKeys.reduce((sum, key) => sum + CONFIDENCE_COMPONENT_WEIGHTS[key], 0);
  const rawWeights = availableKeys.map((key) => CONFIDENCE_COMPONENT_WEIGHTS[key] / totalWeight);
  const finalWeights = capAndRedistributeWeights(rawWeights, MAX_SINGLE_EVIDENCE_WEIGHT);

  const counterEvidencePenalty = clamp(contradicts.length * 5 + invalidates.length * 15, 0, 60);
  const weightedSum = availableKeys.reduce((sum, key, index) => sum + components[key] * finalWeights[index], 0);
  const confidence = clamp(Math.round(weightedSum - counterEvidencePenalty), 0, 100);

  return { confidence, components, counterEvidencePenalty };
}

/**
 * Probability — the likelihood of the predicted direction, computed
 * ONLY from real directional evidence agreement (and, when supplied, a
 * real historical calibration figure) — NEVER from confidence's inputs
 * (source reliability/freshness/independence/breadth are about evidence
 * QUALITY, not outcome LIKELIHOOD). Honestly null with zero directional
 * evidence.
 */
function aggregateProbability(evidenceEntries = [], { historicalCalibration = null } = {}) {
  const directional = evidenceEntries.filter((entry) => entry.stance === "SUPPORTS" || entry.stance === "CONTRADICTS");
  if (!directional.length) {
    return { probability: null, sampleSize: 0 };
  }
  const supportsCount = directional.filter((entry) => entry.stance === "SUPPORTS").length;
  const rawAgreementPct = (supportsCount / directional.length) * 100;

  const probability = Number.isFinite(historicalCalibration) ? clamp(Math.round(rawAgreementPct * 0.7 + historicalCalibration * 0.3), 0, 100) : clamp(Math.round(rawAgreementPct), 0, 100);

  return { probability, sampleSize: directional.length };
}

/**
 * Bounded update (mission §5): a first-time value (no prior) is applied
 * as-is; a subsequent update is clamped to move at most
 * `maxDelta` from the prior value — one new evidence entry, however
 * strong, cannot swing a claim from 20 to 90 confidence in a single step.
 */
function applyBoundedUpdate(previousValue, newValue, maxDelta) {
  if (!Number.isFinite(newValue)) return null;
  if (!Number.isFinite(previousValue)) return newValue;
  return clamp(newValue, previousValue - maxDelta, previousValue + maxDelta);
}

function applyBoundedConfidenceUpdate(previous, next) {
  return applyBoundedUpdate(previous, next, MAX_CONFIDENCE_DELTA_PER_UPDATE);
}

function applyBoundedProbabilityUpdate(previous, next) {
  return applyBoundedUpdate(previous, next, MAX_PROBABILITY_DELTA_PER_UPDATE);
}

/**
 * Uncertainty — reuses scoringVocabulary.js's existing definition
 * ("how much genuine disagreement exists... distinct from confidence")
 * applied to this claim's own evidence: 100 minus evidence agreement,
 * honestly null when there's no directional evidence to measure
 * disagreement over.
 */
function computeUncertainty(agreementPct) {
  if (!Number.isFinite(agreementPct)) return null;
  return clamp(Math.round(100 - agreementPct), 0, 100);
}

module.exports = {
  CONFIDENCE_COMPONENT_WEIGHTS,
  capAndRedistributeWeights,
  evidenceFreshnessScore,
  aggregateConfidence,
  aggregateProbability,
  applyBoundedUpdate,
  applyBoundedConfidenceUpdate,
  applyBoundedProbabilityUpdate,
  computeUncertainty,
};
