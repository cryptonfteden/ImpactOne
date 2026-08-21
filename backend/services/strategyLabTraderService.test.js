const test = require("node:test");
const assert = require("node:assert/strict");
const { buildTranches, weeklyEntryGate, shouldFillTranche, exitDecision, buildWeeklyReport } = require("./strategyLabTraderService");
const { calculateRetracementLevels } = require("./domainAgents/fibonacciAgent/retracementCalculator");

test("buildTranches creates five equal entry steps around the 0.886 price", () => {
  const rows = buildTranches(100);
  assert.deepEqual(rows.map((row) => row.triggerPrice), [105, 102.5, 100, 97.5, 95]);
  assert.deepEqual(rows.map((row) => row.offsetPct), [5, 2.5, 0, -2.5, -5]);
  assert.ok(rows.every((row) => row.status === "WAITING"));
});

test("no tranche can fill before the weekly 0.886 gate is armed", () => {
  const tranche = buildTranches(100)[1];
  assert.equal(shouldFillTranche(102.5, tranche), false);
  assert.equal(shouldFillTranche(102.5, tranche, { armed: true }), true);
  tranche.status = "FILLED";
  assert.equal(shouldFillTranche(110, tranche, { armed: true }), false);
});

test("weekly gate opens only for a chronological weekly low-to-high swing at 0.886", () => {
  const base = { dataAvailable: true, candleTimeframe: "1W", currentPrice: 16.5, targetPrice: 16.5, swing: { swingLowIndex: 2, swingHighIndex: 8 } };
  assert.equal(weeklyEntryGate(base).open, true);
  assert.equal(weeklyEntryGate({ ...base, currentPrice: 16.6 }).open, false);
  assert.equal(weeklyEntryGate({ ...base, candleTimeframe: "1D" }).open, false);
  assert.equal(weeklyEntryGate({ ...base, swing: { swingLowIndex: 9, swingHighIndex: 8 } }).open, false);
});

test("EQPT example derives the entry only from the weekly 0.886 retracement", () => {
  const [entry] = calculateRetracementLevels(
    { direction: "UP", swingLow: 15.7, swingHigh: 21.8 },
    { activeRatios: [0.886] },
  );
  assert.equal(entry.ratio, 0.886);
  assert.ok(Math.abs(entry.price - 16.3954) < 0.0001);
  const weekly = { dataAvailable: true, candleTimeframe: "1W", targetPrice: entry.price, swing: { swingLowIndex: 1, swingHighIndex: 8 } };
  assert.equal(weeklyEntryGate({ ...weekly, currentPrice: 16.5 }).open, false);
  assert.equal(weeklyEntryGate({ ...weekly, currentPrice: entry.price }).open, true);
});

test("exit policy protects the strategy floor", () => {
  const decision = exitDecision({ currentPrice: 92.4, avgEntryPrice: 100, targetPrice: 100 });
  assert.equal(decision.exit, true);
  assert.equal(decision.code, "RISK_FLOOR");
});

test("exit policy requires independent high-priority bearish evidence", () => {
  const decision = exitDecision({
    currentPrice: 101,
    avgEntryPrice: 100,
    targetPrice: 100,
    agents: [
      { id: "earnings", status: "fulfilled", direction: "BEARISH", confidence: 80 },
      { id: "institutional", status: "fulfilled", direction: "BEARISH", confidence: 70 },
    ],
    committee: { weightedVotes: { bearish: 65, availableWeight: 100 } },
  });
  assert.equal(decision.code, "COMMITTEE_REVERSAL");
});

test("weekly report explains an inactive week in simple language", () => {
  const report = buildWeeklyReport({ journal: [] }, { positions: [], cashBalance: 100000, totalValue: 100000, totalReturn: 0, totalReturnPct: 0 });
  assert.match(report.simpleSummary, /המתין בסבלנות/);
  assert.equal(report.numbers.buyTranches, 0);
  assert.match(report.safetyNote, /מסחר דמה/);
});
