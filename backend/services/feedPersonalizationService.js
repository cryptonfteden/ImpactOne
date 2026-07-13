// Sprint 20, Part 5 — layers investor-profile-derived weighting on top of
// the feed's existing relevance/recency/source-quality scoring
// (autonomousMarketService.rankNewsArticles / buildNewsQueryTerms already
// handle "my portfolio" and "my interests" at the query-construction
// stage — this module adds the remaining signals: age, risk profile, and
// investment horizon). Personalization only ever changes *ordering* — it
// never touches an event's impactType, riskLevel, or any other fact, per
// VISION.md's Personalization Principles ("changes weighting, never
// truth"). Where no honest signal exists for a stated input (e.g. no
// dividend/income tagging exists today for "passive income" goals), this
// module deliberately adds no boost rather than fabricating one.

const YOUNG_AGE_THRESHOLD = 35;
const NEAR_RETIREMENT_AGE_THRESHOLD = 55;
const BOOST = 15;
const AGE_BOOST = 5;
const HORIZON_BOOST = 8;
const LEARNING_EXPLANATION_LENGTH_THRESHOLD = 120;

function containsAny(text, keywords) {
  const normalized = String(text || "").toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function riskToleranceWeight(event, riskTolerance) {
  if (riskTolerance === "HIGH" && event.impactType === "opportunity") return BOOST;
  if (riskTolerance === "LOW" && event.impactType === "risk") return BOOST;
  return 0;
}

function horizonWeight(event, investmentHorizon) {
  if (investmentHorizon === "SHORT_TERM" && containsAny(event.timeHorizon, ["day", "week"])) return HORIZON_BOOST;
  if (investmentHorizon === "LONG_TERM" && containsAny(event.timeHorizon, ["year", "6-12 month", "12 month"])) return HORIZON_BOOST;
  return 0;
}

function ageWeight(event, age) {
  if (!Number.isFinite(age)) return 0;
  if (age < YOUNG_AGE_THRESHOLD && event.impactType === "opportunity") return AGE_BOOST;
  if (age >= NEAR_RETIREMENT_AGE_THRESHOLD && event.impactType === "risk") return AGE_BOOST;
  return 0;
}

function goalWeight(event, investmentGoal) {
  if (investmentGoal === "LEARNING" && String(event.whyItMatters || "").length >= LEARNING_EXPLANATION_LENGTH_THRESHOLD) {
    return AGE_BOOST;
  }
  return 0;
}

function computeProfileWeight(event, investorProfile) {
  return (
    riskToleranceWeight(event, investorProfile.riskTolerance) +
    horizonWeight(event, investorProfile.investmentHorizon) +
    ageWeight(event, investorProfile.age) +
    goalWeight(event, investorProfile.investmentGoal)
  );
}

/**
 * Stable re-sort: only reorders by the added profile weight, preserving
 * the feed's existing relative order (relevance/recency/source-quality,
 * already applied upstream) among events with an equal weight.
 */
function rankFeedForInvestor(feedItems, { investorProfile } = {}) {
  if (!investorProfile || !Array.isArray(feedItems) || feedItems.length === 0) {
    return feedItems;
  }

  return feedItems
    .map((event, index) => ({ event, index, profileWeight: computeProfileWeight(event, investorProfile) }))
    .sort((a, b) => b.profileWeight - a.profileWeight || a.index - b.index)
    .map((entry) => entry.event);
}

module.exports = {
  rankFeedForInvestor,
  computeProfileWeight,
};
