// Phase AI-ENGINE-003 — Platform Intelligence Bus. In-process
// publish/subscribe registry — the same "no queue/broker, one in-process
// mechanism" posture the rest of this platform's schedulers already use
// (providerScheduler.js's own header comment names a real queue as a
// future, not current, extension point; this module follows the same
// discipline). No persistence: a subscription is a live, in-memory
// registration for the lifetime of the process, exactly matching "no
// scheduler, no external broker" being out of scope for this phase.
//
// Ordering guarantee: intelligenceBusService.publishEvent awaits
// dispatchToSubscribers() for each event before returning, and the
// service's own callers publish events one at a time (awaited) — so a
// given subscriber's handler is always invoked in the exact order its
// matching events were published. This module does not itself queue or
// reorder anything; it is a synchronous-per-publish dispatcher.
const { KNOWN_CONSUMERS } = require("./intelligenceBusRegistry");

const subscribers = new Map(); // subscriptionId -> { consumerName, filter, handler }
let nextSubscriptionId = 1;

function matchesFilter(event, filter = {}) {
  if (filter.engineId && event.engineId !== filter.engineId) return false;
  if (filter.eventType && event.eventType !== filter.eventType) return false;
  if (filter.symbol && !(event.symbols || []).includes(filter.symbol)) return false;
  return true;
}

/**
 * Registers a consumer's interest. `consumerName` should be one of
 * KNOWN_CONSUMERS (soft-validated, not enforced — see
 * INTELLIGENCE_SUBSCRIPTION_MODEL.md for why an unknown consumer name is
 * logged/flagged rather than rejected: a new, real consumer arriving
 * before this registry is updated must never be blocked from reading the
 * Bus). Returns an unsubscribe function.
 */
function subscribe(consumerName, filter, handler) {
  if (typeof handler !== "function") {
    throw new Error("subscribe() requires a handler function.");
  }
  const id = nextSubscriptionId;
  nextSubscriptionId += 1;
  subscribers.set(id, { consumerName, filter: filter || {}, handler, isKnownConsumer: KNOWN_CONSUMERS.includes(consumerName) });
  return () => subscribers.delete(id);
}

function listSubscriptions() {
  return [...subscribers.values()].map(({ consumerName, filter, isKnownConsumer }) => ({ consumerName, filter, isKnownConsumer }));
}

/**
 * Delivers one event to every currently-matching subscriber, in
 * subscriber-registration order. A single subscriber handler throwing
 * never blocks delivery to the others — the Bus's job is reliable
 * fan-out, not to let one consumer's bug break every other consumer.
 */
async function dispatchToSubscribers(event) {
  const deliveries = [];
  for (const [id, subscription] of subscribers) {
    if (!matchesFilter(event, subscription.filter)) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      await subscription.handler(event);
      deliveries.push({ subscriptionId: id, consumerName: subscription.consumerName, delivered: true });
    } catch (error) {
      deliveries.push({ subscriptionId: id, consumerName: subscription.consumerName, delivered: false, error: error.message });
    }
  }
  return deliveries;
}

/**
 * Test/operational utility — clears every registration. Never called by
 * production code paths (no consumer should be able to clear another
 * consumer's subscription); exists only so tests get a clean subscriber
 * registry per test without relying on process restarts.
 */
function _resetForTests() {
  subscribers.clear();
  nextSubscriptionId = 1;
}

module.exports = { subscribe, listSubscriptions, dispatchToSubscribers, matchesFilter, _resetForTests };
