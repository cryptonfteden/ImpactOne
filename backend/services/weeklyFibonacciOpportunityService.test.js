const test = require("node:test");
const assert = require("node:assert/strict");
const { selectWeeklyLowToHighSwing, analyzeWeeklySetup, buildDecisionScore } = require("./weeklyFibonacciOpportunityService");

function dailySeriesFromWeekly(weekly) {
  return weekly.map((bar, index) => ({ date: new Date(Date.UTC(2025, 0, 3 + index * 7)).toISOString().slice(0, 10), ...bar }));
}

test("selectWeeklyLowToHighSwing requires chronological low, later high, and a later pullback candle", () => {
  const bars = [
    { date: "2025-01-03", low: 100, high: 110 },
    { date: "2025-01-10", low: 105, high: 200 },
    { date: "2025-01-17", low: 115, high: 150 },
  ];
  const swing = selectWeeklyLowToHighSwing(bars);
  assert.equal(swing.swingLow, 100);
  assert.equal(swing.swingHigh, 200);
  assert.equal(swing.weeksSinceHigh, 1);
});

test("analyzeWeeklySetup uses only weekly bars and detects the 0.886 approach zone", () => {
  const weekly = Array.from({ length: 22 }, (_, index) => ({ open: 100, high: 112, low: 100, close: 108, volume: 1000 }));
  weekly[1] = { open: 105, high: 110, low: 100, close: 108, volume: 1000 };
  weekly[10] = { open: 180, high: 200, low: 175, close: 190, volume: 2000 };
  for (let index = 11; index < 21; index += 1) {
    const close = 150 - (index - 11) * 3;
    weekly[index] = { open: close + 2, high: close + 4, low: close - 2, close, volume: 1500 };
  }
  // 0.886 for 100 -> 200 is 111.4. The latest close is 3.2% above it.
  weekly[21] = { open: 117, high: 118, low: 113, close: 115, volume: 1800 };
  const setup = analyzeWeeklySetup("TEST", dailySeriesFromWeekly(weekly));
  assert.equal(setup.candleTimeframe, "1W");
  assert.equal(setup.targetRatio, 0.886);
  assert.equal(setup.targetPrice, 111.4);
  assert.equal(setup.inApproachZone, true);
  assert.ok(setup.distancePct > 3 && setup.distancePct < 4);
  assert.equal(setup.movingTowardTarget, true);
  assert.equal(setup.crossedTargetBeforeLatest, false);
});

test("the 0-5% gate rejects a near-0.886 stock with directional warnings", () => {
  const weekly = Array.from({ length: 22 }, () => ({ open: 120, high: 124, low: 116, close: 120, volume: 1000 }));
  weekly[1] = { open: 105, high: 110, low: 100, close: 108, volume: 1000 };
  weekly[10] = { open: 180, high: 200, low: 175, close: 190, volume: 2000 };
  weekly[20] = { open: 108, high: 112, low: 107, close: 109, volume: 1200 };
  weekly[21] = { open: 112, high: 118, low: 111, close: 115, volume: 1200 };
  const setup = analyzeWeeklySetup("TEST", dailySeriesFromWeekly(weekly));
  assert.equal(setup.inApproachZone, true);
  assert.equal(setup.signalEligible, false);
  assert.equal(setup.crossedTargetBeforeLatest, true);
  assert.ok(setup.strategyWarnings.some((item) => item.includes("crossed below")));
  assert.ok(setup.strategyWarnings.some((item) => item.includes("not moving down")));
});

test("committee can approve an eligible weekly setup but a strong bearish objection blocks it", () => {
  const setup = { inApproachZone: true, signalEligible: true, technicalScore: 88 };
  const committee = {
    summary: { total: 6 },
    agents: [
      { agentId: "earnings", status: "fulfilled", direction: "BULLISH", confidence: 85 },
      { agentId: "news", status: "fulfilled", direction: "BUY", confidence: 80 },
      { agentId: "technical", status: "fulfilled", direction: "NEUTRAL", confidence: 74 },
      { agentId: "analyst-consensus", status: "fulfilled", direction: "NEUTRAL", confidence: 70 },
    ],
  };
  assert.equal(buildDecisionScore(setup, committee).approved, true);
  committee.agents.push({ agentId: "institutional", status: "fulfilled", direction: "BEARISH", confidence: 82 });
  const blocked = buildDecisionScore(setup, committee);
  assert.equal(blocked.approved, false);
  assert.ok(blocked.blockers.some((item) => item.includes("Strategic veto")));
});

test("committee coverage excludes fulfilled agents that explicitly lack decision-grade evidence", () => {
  const setup = { inApproachZone: true, signalEligible: true, technicalScore: 90 };
  const committee = {
    agents: [
      { status: "fulfilled", priority: 10, direction: "BULLISH", confidence: 90, result: { raw: { signalEligible: true } } },
      { status: "fulfilled", priority: 9, direction: null, confidence: 0, result: { raw: { signalEligible: false } } },
      { status: "fulfilled", priority: 8, direction: null, confidence: 0, result: { raw: { signalEligible: false } } },
    ],
  };
  const decision = buildDecisionScore(setup, committee);
  assert.equal(decision.eligibleAgentCount, 1);
  assert.equal(decision.excludedAgentCount, 2);
  assert.equal(decision.coveragePct, 37);
  assert.equal(decision.approved, false);
  assert.ok(decision.blockers.some((item) => item.includes("coverage")));
});

test("committee cannot approve a setup that violates the weekly strategy gate", () => {
  const setup = {
    inApproachZone: true,
    signalEligible: false,
    technicalScore: 96,
    strategyWarnings: ["A prior completed weekly close crossed below 0.886."],
  };
  const committee = {
    agents: Array.from({ length: 6 }, () => ({
      status: "fulfilled",
      priority: 10,
      direction: "BULLISH",
      confidence: 95,
      result: { raw: { signalEligible: true } },
    })),
  };
  const decision = buildDecisionScore(setup, committee);
  assert.equal(decision.approved, false);
  assert.ok(decision.blockers.some((item) => item.includes("crossed below")));
});
