// Sprint 42 — Recommendation Lifecycle Engine.
//
// Every recommendation moves through a real, timestamped sequence of
// states: GENERATED, PUBLISHED, VIEWED, PAPER_TRADED, ACTIVE, EXPIRED,
// SUCCEEDED, FAILED, CANCELLED. Each transition is a real event, recorded
// once, never overwritten — this module never updates or deletes a past
// event, and never fabricates a transition that didn't actually happen
// (e.g. it will never claim VIEWED unless a caller genuinely reports one).
const recommendationLifecycleRepository = require("./recommendationLifecycleRepository");

const VALID_STATES = ["GENERATED", "PUBLISHED", "VIEWED", "PAPER_TRADED", "ACTIVE", "EXPIRED", "SUCCEEDED", "FAILED", "CANCELLED"];

// States that can only ever happen once per recommendation — recording a
// second GENERATED/PUBLISHED for the same recommendation would misrepresent
// its real history, so this is enforced here rather than left to callers.
const SINGLE_OCCURRENCE_STATES = new Set(["GENERATED", "PUBLISHED"]);

async function recordTransition({ recommendationId, state, metadata } = {}) {
  if (!recommendationId) throw new Error("recommendationId is required to record a lifecycle transition");
  if (!VALID_STATES.includes(state)) throw new Error(`Unknown lifecycle state: ${state}`);

  if (SINGLE_OCCURRENCE_STATES.has(state)) {
    const existing = await recommendationLifecycleRepository.listForRecommendation(recommendationId);
    if (existing.some((event) => event.state === state)) {
      throw new Error(`Recommendation ${recommendationId} already has a ${state} lifecycle event — it can only happen once`);
    }
  }

  return recommendationLifecycleRepository.recordTransition({ recommendationId, state, metadata: metadata || null });
}

/**
 * Never throws — lifecycle recording is always best-effort from a caller's
 * perspective (a recommendation must still be creatable/viewable even if
 * lifecycle logging has a transient failure), matching this codebase's
 * existing resilience pattern (World Memory writes, buildCommitteeDebate).
 */
async function recordTransitionSafely(args) {
  try {
    return await recordTransition(args);
  } catch (error) {
    return null;
  }
}

async function getLifecycle(recommendationId) {
  const events = await recommendationLifecycleRepository.listForRecommendation(recommendationId);
  return {
    recommendationId,
    events: events.map((event) => ({ state: event.state, occurredAt: event.occurredAt, metadata: event.metadata })),
    currentState: events.length ? events[events.length - 1].state : null,
  };
}

module.exports = { VALID_STATES, recordTransition, recordTransitionSafely, getLifecycle };
