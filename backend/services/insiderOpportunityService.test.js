const test = require("node:test");
const assert = require("node:assert/strict");
const { summarizePurchases, buildCommitteeScore, buildInsiderReversal } = require("./insiderOpportunityService");

test("insider reversal requires purchase, material drawdown and proximity to 0.886", () => {
  const signal = buildInsiderReversal({
    purchaseSummary: { count: 1, actionableFreshness: true },
    committee: { agents: [{
      agentId: "fibonacci",
      status: "fulfilled",
      signalEligible: true,
      raw: {
        signalEligible: true,
        weeklyStrategy: {
          currentPrice: 89,
          targetPrice: 90,
          swing: { swingHigh: 120 },
        },
      },
    }] },
  });
  assert.equal(signal.triggered, true);
  assert.equal(signal.status, "INSIDER REVERSAL");
});

test("insider reversal reads Fibonacci evidence from the real orchestrator result shape", () => {
  const signal = buildInsiderReversal({
    purchaseSummary: { count: 1, actionableFreshness: true },
    committee: { agents: [{
      agentId: "fibonacci",
      status: "fulfilled",
      result: { raw: {
        signalEligible: true,
        weeklyStrategy: { currentPrice: 89, targetPrice: 90, swing: { swingHigh: 120 } },
      } },
    }] },
  });
  assert.equal(signal.triggered, true);
  assert.equal(signal.conditions.nearPoint886, true);
});

test("summarizePurchases includes only verified open-market acquisitions", () => {
  const today = new Date().toISOString().slice(0, 10);
  const summary = summarizePurchases({
    inputs: {
      transactions: [
        { transactionCode: "P", acquiredDisposedCode: "A", shares: 100, pricePerShare: 10, ownerCik: "1", transactionDate: today, filingUrl: "https://www.sec.gov/1" },
        { transactionCode: "P", acquiredDisposedCode: "A", shares: 50, pricePerShare: 20, ownerCik: "2", transactionDate: today, filingUrl: "https://www.sec.gov/2" },
        { transactionCode: "S", acquiredDisposedCode: "D", shares: 500, pricePerShare: 30, ownerCik: "3", transactionDate: today },
        { transactionCode: "A", acquiredDisposedCode: "A", shares: 900, pricePerShare: 0, ownerCik: "4", transactionDate: today },
      ],
    },
  });

  assert.equal(summary.count, 2);
  assert.equal(summary.distinctBuyers, 2);
  assert.equal(summary.shares, 150);
  assert.equal(summary.value, 2000);
  assert.equal(summary.averagePrice, 2000 / 150);
});

test("committee approval requires broad coverage and no strong bearish objection", () => {
  const purchaseSummary = { count: 2, ageDays: 1, actionableFreshness: true, value: 2_000_000, distinctBuyers: 2 };
  const insiderReport = { netInsiderScore: 80 };
  const committee = {
    summary: { total: 6 },
    agents: [
      { agentId: "fibonacci", status: "fulfilled", direction: "BULLISH", confidence: 90 },
      { agentId: "earnings", status: "fulfilled", direction: "BUY", confidence: 82 },
      { agentId: "news", status: "fulfilled", direction: "POSITIVE", confidence: 78 },
      { agentId: "technical", status: "fulfilled", direction: "NEUTRAL", confidence: 70 },
      { agentId: "analyst-consensus", status: "fulfilled", direction: "NEUTRAL", confidence: 66 },
    ],
  };
  const approved = buildCommitteeScore({ insiderReport, purchaseSummary, committee });
  assert.equal(approved.approved, true);
  assert.ok(approved.score >= 65);
  assert.ok(approved.coveragePct >= 60);

  committee.agents.find((agent) => agent.agentId === "earnings").direction = "BEARISH";
  committee.agents.find((agent) => agent.agentId === "earnings").confidence = 88;
  committee.agents.push({ agentId: "valuation", status: "fulfilled", direction: "BEARISH", confidence: 90 });
  const blocked = buildCommitteeScore({ insiderReport, purchaseSummary, committee });
  assert.equal(blocked.approved, false);
  assert.ok(blocked.blockers.some((item) => item.includes("Strategic veto")));
});

test("insider committee excludes fulfilled rows that explicitly lack decision-grade evidence", () => {
  const decision = buildCommitteeScore({
    insiderReport: { netInsiderScore: 90 },
    purchaseSummary: { count: 1, ageDays: 0, actionableFreshness: true, value: 1_000_000, distinctBuyers: 1 },
    committee: { agents: [
      { status: "fulfilled", priority: 10, direction: "BULLISH", confidence: 90, result: { raw: { signalEligible: true } } },
      { status: "fulfilled", priority: 10, direction: "BULLISH", confidence: 100, result: { raw: { signalEligible: false } } },
      { status: "fulfilled", priority: 10, direction: "BULLISH", confidence: 100, result: { raw: { dataAvailable: false } } },
    ] },
  });
  assert.equal(decision.eligibleAgentCount, 1);
  assert.equal(decision.excludedAgentCount, 2);
  assert.equal(decision.coveragePct, 33);
  assert.equal(decision.approved, false);
});
