const analyticsEventRepository = require("./analyticsEventRepository");

// Sprint 36 Priority 1 — Time To Value measurement. For each anonymous
// browser (grouped by its persistent, random sessionId — see the schema
// comment on AnalyticsEvent), find that browser's very first "first_open"
// and then the first time each other milestone event happened for that
// same browser. The delta between the two is one real, honest data point
// — never estimated or fabricated when a browser never reached a given
// milestone (it's simply excluded from that milestone's sample).
const MILESTONE_EVENTS = [
  "first_useful_information",
  "recommendation_viewed",
  "recommendation_understood",
  "morning_brief_read",
  "onboarding_completed",
  "returning_user",
];

function median(sortedNumbers) {
  const mid = Math.floor(sortedNumbers.length / 2);
  if (sortedNumbers.length % 2 === 0) {
    return (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2;
  }
  return sortedNumbers[mid];
}

function groupBySession(events) {
  const bySession = new Map();
  for (const event of events) {
    if (!bySession.has(event.sessionId)) bySession.set(event.sessionId, []);
    bySession.get(event.sessionId).push(event);
  }
  return bySession;
}

async function computeTimeToValueMetrics() {
  const events = await analyticsEventRepository.listEventsWithSession();
  const bySession = groupBySession(events);

  const deltasByMilestone = Object.fromEntries(MILESTONE_EVENTS.map((name) => [name, []]));

  for (const sessionEvents of bySession.values()) {
    const firstOpen = sessionEvents.find((event) => event.eventName === "first_open");
    if (!firstOpen) continue;
    const firstOpenMs = new Date(firstOpen.createdAt).getTime();

    for (const milestone of MILESTONE_EVENTS) {
      const firstOccurrence = sessionEvents.find((event) => event.eventName === milestone);
      if (!firstOccurrence) continue;
      const deltaMs = new Date(firstOccurrence.createdAt).getTime() - firstOpenMs;
      if (deltaMs >= 0) {
        deltasByMilestone[milestone].push(deltaMs);
      }
    }
  }

  const metrics = {};
  for (const milestone of MILESTONE_EVENTS) {
    const deltas = deltasByMilestone[milestone].slice().sort((a, b) => a - b);
    metrics[milestone] = {
      sampleSize: deltas.length,
      medianSeconds: deltas.length ? Math.round(median(deltas) / 1000) : null,
      averageSeconds: deltas.length ? Math.round(deltas.reduce((sum, value) => sum + value, 0) / deltas.length / 1000) : null,
    };
  }

  return { totalSessions: bySession.size, metrics };
}

module.exports = { computeTimeToValueMetrics };
