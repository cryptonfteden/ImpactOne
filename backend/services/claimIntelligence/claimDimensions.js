// Phase AI-CORE-001 — Claim Intelligence Layer. Registries and tunable
// constants — all real, disclosed decisions, not arbitrary magic numbers
// hidden inline.

// Originally scoped to just these two engines (mission §11) — a Bus
// event from any other engineId was ignored by claimFormationService,
// not silently absorbed into a claim it was never vetted to feed.
// Phase CLAIM-INTELLIGENCE-INTEGRATION-001 extends this to every real
// Domain Intelligence Agent (agentOrchestrator/registry.js's
// ALL_AGENTS, 14 real agents) — the mission's own "Connect every
// Intelligence Agent to the Claim Intelligence pipeline." This is an
// additive extension of the existing allowlist, not a redesign: the
// same ingestBusEvent()/buildEvidenceCandidateFromBusEvent() logic
// below is reused unchanged for every engine now in this list.
const INTEGRATED_ENGINES = [
  "options",
  "sentiment",
  "technical",
  "symbol-sentiment",
  "news",
  "short-interest",
  "earnings",
  "valuation",
  "fibonacci",
  "insider",
  "etf-flow",
  "institutional",
  "macro",
  "analyst-consensus",
];

// A claim newly created from a single evidence entry must never start
// above DRAFT (mission §3: "never converts a single raw signal directly
// into unjustified certainty"). Promotion to ACTIVE requires at least
// this many independent evidence entries.
const MIN_EVIDENCE_BREADTH_FOR_ACTIVE = 2;

// No single evidence entry may account for more than this share of a
// claim's confidence — mirrors the Sentiment Engine's
// MAX_SINGLE_DIMENSION_WEIGHT precedent (marketSentimentDimensions.js),
// applied here to evidence entries instead of sentiment dimensions.
const MAX_SINGLE_EVIDENCE_WEIGHT = 0.4;

// A single new evidence entry may move confidence/probability by at most
// this many points in one update — "bounded updates" (mission §5): one
// new signal, however strong, cannot swing a claim from 20 to 90 in one
// step.
const MAX_CONFIDENCE_DELTA_PER_UPDATE = 20;
const MAX_PROBABILITY_DELTA_PER_UPDATE = 20;

// Real thresholds for lifecycle transitions (claimLifecycle.js) — see
// CLAIM_LIFECYCLE.md §3 for the full, disclosed reasoning per threshold.
const STRENGTHENING_DELTA_THRESHOLD = 8; // confidence rose by at least this much since the last transition
const WEAKENING_DELTA_THRESHOLD = 8; // confidence fell by at least this much
const CONTESTED_AGREEMENT_THRESHOLD = 55; // evidenceAgreement below this % means real, structural disagreement

const METHODOLOGY_VERSION = "claim-intelligence-v1";

function isIntegratedEngine(engineId) {
  return INTEGRATED_ENGINES.includes(engineId);
}

module.exports = {
  INTEGRATED_ENGINES,
  MIN_EVIDENCE_BREADTH_FOR_ACTIVE,
  MAX_SINGLE_EVIDENCE_WEIGHT,
  MAX_CONFIDENCE_DELTA_PER_UPDATE,
  MAX_PROBABILITY_DELTA_PER_UPDATE,
  STRENGTHENING_DELTA_THRESHOLD,
  WEAKENING_DELTA_THRESHOLD,
  CONTESTED_AGREEMENT_THRESHOLD,
  METHODOLOGY_VERSION,
  isIntegratedEngine,
};
