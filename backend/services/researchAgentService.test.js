require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const researchAgentService = require("./researchAgentService");

function validPrincipleInput(overrides = {}) {
  return {
    name: "Trend continuation on volume confirmation",
    summary: "When price breaks a multi-week range on above-average volume, the move has historically continued more often than reversed in trending regimes.",
    attributedSource: "Paraphrased from common technical-analysis literature (e.g. Wyckoff-derived breakout theory), not a reproduced passage.",
    regimeRequirements: { trend: "trending", volatility: "normal-to-elevated" },
    entryConditions: { breakoutConfirmedByVolume: true },
    invalidationConditions: { closeBackInsideRange: true },
    riskRules: { maxPositionPct: 5, stopAtRangeMidpoint: true },
    knownFailureModes: ["Choppy/range-bound regimes produce frequent false breakouts."],
    ...overrides,
  };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("registerPrinciple persists a real, complete principle", async () => {
  const principle = await researchAgentService.registerPrinciple(validPrincipleInput());
  assert.ok(principle.id);
  assert.equal(principle.name, "Trend continuation on volume confirmation");

  const all = await researchAgentService.listPrinciples();
  assert.equal(all.length, 1);
});

test("registerPrinciple rejects a summary over the length ceiling, forcing an attributable paraphrase rather than a reproduced passage", async () => {
  const tooLong = "x".repeat(researchAgentService.MAX_SUMMARY_LENGTH + 1);
  await assert.rejects(
    () => researchAgentService.registerPrinciple(validPrincipleInput({ summary: tooLong })),
    /paraphrase/
  );
});

test("registerPrinciple rejects a principle missing attribution", async () => {
  await assert.rejects(() => researchAgentService.registerPrinciple(validPrincipleInput({ attributedSource: "" })), /attributedSource/);
});

test("registerPrinciple rejects a principle missing regime requirements — never regime-agnostic by omission", async () => {
  await assert.rejects(() => researchAgentService.registerPrinciple(validPrincipleInput({ regimeRequirements: null })), /regimeRequirements/);
});

test("describeTestStatus honestly reports NOT_YET_TESTED for a principle with zero recorded results", async () => {
  const principle = await researchAgentService.registerPrinciple(validPrincipleInput());
  const status = await researchAgentService.describeTestStatus(principle.id);
  assert.equal(status.status, "NOT_YET_TESTED");
  assert.ok(status.summary.toLowerCase().includes("not been backtested"));
});

test("recordBacktestResult requires a real sample size and regime, never an unscoped claim", async () => {
  const principle = await researchAgentService.registerPrinciple(validPrincipleInput());
  await assert.rejects(() => researchAgentService.recordBacktestResult(principle.id, { regimeTested: "trending", sampleSize: 0 }), /sampleSize/);
  await assert.rejects(() => researchAgentService.recordBacktestResult(principle.id, { sampleSize: 40 }), /regimeTested/);
});

test("describeTestStatus never says a principle is 'proven', only reports which specific regimes were tested", async () => {
  const principle = await researchAgentService.registerPrinciple(validPrincipleInput());
  await researchAgentService.recordBacktestResult(principle.id, { regimeTested: "trending", sampleSize: 120, winRate: 61.5, notes: "Backtested against 2015-2024 daily bars for 40 large-cap symbols." });

  const status = await researchAgentService.describeTestStatus(principle.id);
  assert.equal(status.status, "TESTED_IN_SPECIFIC_REGIMES");
  assert.deepEqual(status.regimesTested, ["trending"]);
  assert.ok(!status.summary.toLowerCase().includes("proven"));
  assert.ok(status.summary.includes("not a claim"));
});

test("supplyResearchEvidence returns evidence-shaped items, always marked isRecommendation=false", async () => {
  await researchAgentService.registerPrinciple(validPrincipleInput());
  const evidence = await researchAgentService.supplyResearchEvidence({});
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].isRecommendation, false);
  assert.ok(evidence[0].attributedSource);
});
