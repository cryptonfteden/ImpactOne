// Phase X10 — Part 5, Explainability Improvement. Aggregates real
// AnalyticsEvent rows for `recommendation_expanded` / `explanation_collapsed`
// (the real expand/collapse events; `explanation_collapsed` was added this
// phase in Part 1) into real read-vs-skip and reading-time insights. No new
// tracking pipe, no fabricated "average reading time" when no real duration
// was ever recorded.
const { getPrismaClient } = require("../db/prismaClient");

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Real, rule-based insight generation — each insight names the exact real
// numbers that produced it, never a vague AI-sounding claim.
function generateInsights({ totalShown, expandRate, avgReadingTimeMs, stepBreakdown }) {
  const insights = [];
  if (totalShown === 0) {
    insights.push("No explanation interactions recorded yet — insights will appear once users engage with explanations.");
    return insights;
  }
  if (expandRate !== null) {
    if (expandRate < 0.3) {
      insights.push(`Only ${Math.round(expandRate * 100)}% of shown explanations are expanded — consider surfacing the key reasoning inline instead of behind an expand action.`);
    } else if (expandRate > 0.7) {
      insights.push(`${Math.round(expandRate * 100)}% of shown explanations are expanded — users are actively reading explanations, this format is working.`);
    }
  }
  if (avgReadingTimeMs !== null && avgReadingTimeMs < 3000) {
    insights.push(`Average reading time is ${Math.round(avgReadingTimeMs / 1000)}s — explanations may be getting skimmed rather than read; consider shortening them.`);
  }
  const weakestStep = stepBreakdown.filter((step) => step.expandRate !== null).sort((a, b) => a.expandRate - b.expandRate)[0];
  if (weakestStep && weakestStep.expandRate < 0.3) {
    insights.push(`The "${weakestStep.stepKey}" explanation section has the lowest expand rate (${Math.round(weakestStep.expandRate * 100)}%) — least-read section.`);
  }
  return insights;
}

async function getExplainabilityInsights() {
  const prisma = getPrismaClient();
  const [shownCount, expandedEvents, collapsedCount] = await Promise.all([
    prisma.analyticsEvent.count({ where: { eventName: "recommendation_viewed" } }),
    prisma.analyticsEvent.findMany({ where: { eventName: "recommendation_expanded" }, select: { durationMs: true, properties: true } }),
    prisma.analyticsEvent.count({ where: { eventName: "explanation_collapsed" } }),
  ]);

  const expandedCount = expandedEvents.length;
  const expandRate = shownCount ? expandedCount / shownCount : null;
  const collapseRate = expandedCount ? collapsedCount / expandedCount : null;
  const readingTimes = expandedEvents.map((event) => event.durationMs).filter((value) => Number.isFinite(value));
  const avgReadingTimeMs = readingTimes.length ? Math.round(average(readingTimes)) : null;

  const byStep = new Map();
  for (const event of expandedEvents) {
    const stepKey = event.properties?.stepKey;
    if (typeof stepKey !== "string") continue;
    if (!byStep.has(stepKey)) byStep.set(stepKey, 0);
    byStep.set(stepKey, byStep.get(stepKey) + 1);
  }
  const stepBreakdown = Array.from(byStep.entries()).map(([stepKey, expandedForStep]) => ({
    stepKey,
    expandedCount: expandedForStep,
    expandRate: expandedCount ? expandedForStep / expandedCount : null,
  }));

  return {
    generatedAt: new Date().toISOString(),
    recommendationsShown: shownCount,
    explanationsExpanded: expandedCount,
    explanationsCollapsed: collapsedCount,
    expandRate: expandRate === null ? null : Math.round(expandRate * 100) / 100,
    collapseRate: collapseRate === null ? null : Math.round(collapseRate * 100) / 100,
    avgReadingTimeMs,
    stepBreakdown,
    insights: generateInsights({ totalShown: shownCount, expandRate, avgReadingTimeMs, stepBreakdown }),
  };
}

module.exports = { getExplainabilityInsights };
