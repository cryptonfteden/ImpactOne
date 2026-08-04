// Phase X2 — Alert Type Architecture. Prepares the extension point named
// in the mission WITHOUT implementing any new alert type — only the two
// that already exist (PRICE_ABOVE / PRICE_BELOW, Phase H3) are
// registered with real evaluators. Every other entry below is a
// documented placeholder: registered by name so callers can reference it,
// but with no evaluator, so attempting to actually use one throws a
// clear "not yet implemented" error rather than silently misbehaving.
//
// An alert type's contract:
//   evaluate({ alert, currentPrice, context }) -> boolean
//     Pure function: given the alert row and whatever real, already-
//     fetched data it needs, returns whether the condition is met right
//     now. Must never fabricate data — if the data it needs isn't
//     available, it must return false (never a guessed true).
//   describeMessage({ alert, triggerValue }) -> string
//     Builds the real notification message from real, already-verified
//     trigger data (see notificationService.notifyAlertTriggered's own
//     convention).

const PRICE_ALERT_TYPES = {
  PRICE_ABOVE: {
    label: "Price rises above target",
    implemented: true,
    evaluate: ({ alert, currentPrice }) => Number.isFinite(currentPrice) && currentPrice > Number(alert.targetPrice),
  },
  PRICE_BELOW: {
    label: "Price falls below target",
    implemented: true,
    evaluate: ({ alert, currentPrice }) => Number.isFinite(currentPrice) && currentPrice < Number(alert.targetPrice),
  },

  // Phase X2 — architecture only, per explicit mission instruction. Each
  // entry documents exactly what real data source it will need once
  // implemented, so a future phase can wire it in without redesigning
  // this registry.
  AI_RECOMMENDATION_CHANGED: {
    label: "AI recommendation changed",
    implemented: false,
    dataDependency: "Would compare a symbol's current active Recommendation.action against its value at alert-check time — needs a persisted 'last seen action' per alert, not yet modeled.",
  },
  OPPORTUNITY_SCORE_CHANGED: {
    label: "Opportunity Score changed",
    implemented: false,
    dataDependency: "Would compare opportunityScoreService.getOpportunityScore(symbol).score against a persisted prior value — needs the same 'last seen value' pattern as above.",
  },
  LARGE_SHORT_INTEREST_CHANGE: {
    label: "Large short interest change",
    implemented: false,
    dataDependency: "Blocked on a real short-interest data source, which does not exist anywhere in this codebase today (see MARKET_POSITIONING_SPEC.md) — cannot be implemented honestly until one is configured.",
  },
  LARGE_LONG_INTEREST_CHANGE: {
    label: "Large long interest change",
    implemented: false,
    dataDependency: "Same blocker as LARGE_SHORT_INTEREST_CHANGE — 'long interest' has no real data source or even a standard definition yet.",
  },
  EARNINGS: {
    label: "Earnings event",
    implemented: false,
    dataDependency: "The existing earningsProvider.js (backend/services/providers/) already ingests real earnings-calendar events — this would read from CanonicalEvent rather than needing a new data source, once wired.",
  },
  NEWS_IMPACT: {
    label: "High-impact news",
    implemented: false,
    dataDependency: "Would read a symbol's matched CanonicalEvent rows above an importance/confidence threshold — same real event pipeline Daily Feed already uses.",
  },
};

function getAlertType(typeName) {
  return PRICE_ALERT_TYPES[typeName] || null;
}

function requireImplemented(typeName) {
  const type = getAlertType(typeName);
  if (!type) {
    const error = new Error(`Unknown alert type: ${typeName}`);
    error.statusCode = 400;
    throw error;
  }
  if (!type.implemented) {
    const error = new Error(`Alert type "${typeName}" is architecture-only and not yet implemented this phase.`);
    error.statusCode = 501;
    throw error;
  }
  return type;
}

function listAlertTypes() {
  return Object.entries(PRICE_ALERT_TYPES).map(([typeName, type]) => ({
    type: typeName,
    label: type.label,
    implemented: type.implemented,
    dataDependency: type.dataDependency || null,
  }));
}

module.exports = { PRICE_ALERT_TYPES, getAlertType, requireImplemented, listAlertTypes };
