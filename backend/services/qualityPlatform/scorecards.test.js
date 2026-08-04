// Sprint 42 — Historical simulation tests for committee/CIO/evidence
// scorecards. Creates real Recommendation + DecisionTrace + Outcome rows
// with known committee shapes and known returns, then asserts every
// scorecard's numbers against hand-computed expectations — proving the
// aggregation is real arithmetic over real rows, not an approximation.
require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const { getPrismaClient } = require("../../db/prismaClient");
const autonomousRecommendationRepository = require("../autonomousRecommendationRepository");
const worldMemoryRepository = require("../worldMemoryRepository");
const committeeScorecardService = require("./committeeScorecardService");
const cioScorecardService = require("./cioScorecardService");
const evidenceScorecardService = require("./evidenceScorecardService");

function recommendationData(overrides = {}) {
  return {
    symbol: "NVDA",
    action: "BUY",
    confidenceScore: 80,
    expectedUpside: "10-15%",
    expectedDownside: "-6%",
    riskScore: 30,
    riskLabel: "Low",
    positionSizeSuggestion: "2-4%",
    reasoning: "Test reasoning.",
    evidence: { currentPrice: 100 },
    portfolioContext: null,
    timeHorizon: "1-3 months",
    explanation: { thesis: "t", supportingEvidence: [], opposingEvidence: [], keyRisks: [], invalidationConditions: [], timeHorizon: "1-3 months", affectedPositions: [], affectedWatchlistSymbols: [], confidenceDrivers: [], confidenceReducers: [] },
    scenarios: [],
    qualityScore: 75,
    qualityComponents: {},
    ...overrides,
  };
}

function committeeMember({ memberId, memberName, confidence, supportingCategory = null, counterCategory = null }) {
  return {
    memberId,
    memberName,
    headline: "h",
    reasoning: "r",
    supportingEvidence: supportingCategory ? [{ category: supportingCategory, reason: "x" }] : [],
    counterEvidence: counterCategory ? [{ category: counterCategory, reason: "x" }] : [],
    confidence,
    uncertainty: 100 - confidence,
    freshness: "CURRENT",
    missingEvidence: [],
    isRecommendation: false,
  };
}

/** Creates a real Recommendation + DecisionTrace (unified committee shape) + graded Outcome, all with known values. */
async function seedGradedRecommendation({ action = "BUY", windowReturnPct, members, createdAt }) {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData({ action, ...(createdAt ? { } : {}) }));
  if (createdAt) {
    const prisma = getPrismaClient();
    await prisma.recommendation.update({ where: { id: recommendation.id }, data: { createdAt } });
  }

  const committeeDebate = {
    committee: {
      members,
      agreement: { status: "NO_CLEAR_AGREEMENT", direction: null, members: [] },
      disagreement: { status: "DISAGREEMENT", supportiveMembers: members.filter((m) => m.supportingEvidence.length).map((m) => m.memberId), contraryMembers: members.filter((m) => m.counterEvidence.length).map((m) => m.memberId) },
      strongestSupportingEvidence: members.find((m) => m.supportingEvidence.length) ? { memberId: members.find((m) => m.supportingEvidence.length).memberId, memberConfidence: members.find((m) => m.supportingEvidence.length).confidence } : null,
      strongestContradictoryEvidence: null,
      missingEvidence: [],
      staleEvidence: [],
      isVerdict: false,
    },
    cio: { overallThesis: "t", confidence: "MODERATE_MAJORITY", largestDisagreement: null, highestRisk: "n/a", missingInformation: [], whyRecommendationExists: "n/a", whyRecommendationMayBeWrong: [], isVerdict: false },
  };

  await autonomousRecommendationRepository.createDecisionTrace({
    recommendationId: recommendation.id,
    inputEvidence: {},
    rankingResult: {},
    confidenceCalculation: {},
    finalOutput: {},
    committeeDebate,
  });

  const directionCorrect = action === "BUY" ? windowReturnPct > 0 : windowReturnPct < 0;
  await worldMemoryRepository.createOutcome({
    recommendationId: recommendation.id,
    symbol: recommendation.symbol,
    action,
    timeWindow: "D1",
    windowStartPrice: 100,
    windowEndPrice: 100 * (1 + windowReturnPct / 100),
    windowReturnPct,
    directionCorrect,
    grade: 50,
    gradeLabel: directionCorrect ? "CORRECT" : "INCORRECT",
    methodologyVersion: "test-v1",
    dataSourceSnapshot: {},
  });

  return recommendation;
}

test.beforeEach(async () => {
  await truncateAll();
});

test("committee scorecard: a member who leaned SUPPORTIVE on a real winning recommendation gets a real win, not a fabricated one", async () => {
  await seedGradedRecommendation({
    action: "BUY",
    windowReturnPct: 10,
    members: [committeeMember({ memberId: "technicalAnalyst", memberName: "Technical Analyst", confidence: 80, supportingCategory: "TECHNICAL" })],
  });

  const scorecard = await committeeScorecardService.getCommitteeScorecard({});
  const member = scorecard.members.find((entry) => entry.memberId === "technicalAnalyst");
  assert.ok(member);
  assert.equal(member.sampleSize, 1);
  assert.equal(member.winRate, 100);
  assert.equal(member.averageAlphaPct, 10);
});

test("committee scorecard: a member who leaned CONTRARY on a recommendation that went up gets a real loss", async () => {
  await seedGradedRecommendation({
    action: "BUY",
    windowReturnPct: 10,
    members: [committeeMember({ memberId: "marketSentimentSpecialist", memberName: "Market Sentiment Specialist", confidence: 60, counterCategory: "SENTIMENT" })],
  });

  const scorecard = await committeeScorecardService.getCommitteeScorecard({});
  const member = scorecard.members.find((entry) => entry.memberId === "marketSentimentSpecialist");
  assert.equal(member.winRate, 0);
  assert.equal(member.averageAlphaPct, -10, "a CONTRARY lean on a +10% move is -10 alpha, never a blended positive number");
});

test("committee scorecard: a NEUTRAL member (no directional evidence) is excluded entirely — never counted as a loss", async () => {
  await seedGradedRecommendation({
    action: "BUY",
    windowReturnPct: 10,
    members: [committeeMember({ memberId: "researchSpecialist", memberName: "Research Specialist", confidence: 50 })],
  });

  const scorecard = await committeeScorecardService.getCommitteeScorecard({});
  assert.equal(scorecard.members.find((entry) => entry.memberId === "researchSpecialist"), undefined);
});

test("committee scorecard: historical simulation across multiple graded recommendations computes a real aggregate win rate", async () => {
  await seedGradedRecommendation({ action: "BUY", windowReturnPct: 8, members: [committeeMember({ memberId: "technicalAnalyst", memberName: "Technical Analyst", confidence: 70, supportingCategory: "TECHNICAL" })] });
  await seedGradedRecommendation({ action: "BUY", windowReturnPct: -5, members: [committeeMember({ memberId: "technicalAnalyst", memberName: "Technical Analyst", confidence: 70, supportingCategory: "TECHNICAL" })] });
  await seedGradedRecommendation({ action: "BUY", windowReturnPct: 12, members: [committeeMember({ memberId: "technicalAnalyst", memberName: "Technical Analyst", confidence: 70, supportingCategory: "TECHNICAL" })] });

  const scorecard = await committeeScorecardService.getCommitteeScorecard({});
  const member = scorecard.members.find((entry) => entry.memberId === "technicalAnalyst");
  assert.equal(member.sampleSize, 3);
  assert.equal(member.winRate, 66.67, "2 real wins out of 3 = 66.67%, hand-computed");
  assert.equal(member.averageAlphaPct, 5, "(8 + -5 + 12) / 3 = 5, hand-computed");
});

test("committee scorecard: rolling windows only include recommendations created within the window", async () => {
  const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000); // older than the 365-day window
  await seedGradedRecommendation({ action: "BUY", windowReturnPct: 10, members: [committeeMember({ memberId: "technicalAnalyst", memberName: "Technical Analyst", confidence: 70, supportingCategory: "TECHNICAL" })], createdAt: oldDate });
  await seedGradedRecommendation({ action: "BUY", windowReturnPct: 10, members: [committeeMember({ memberId: "technicalAnalyst", memberName: "Technical Analyst", confidence: 70, supportingCategory: "TECHNICAL" })] });

  const rollup = await committeeScorecardService.getCommitteeScorecardRollup();
  assert.equal(rollup[365].members.find((m) => m.memberId === "technicalAnalyst").sampleSize, 1, "the 400-day-old row must be excluded from the 365-day window");
});

test("CIO scorecard: overall/buy/reduce accuracy and false positives/negatives are real, hand-computed numbers", async () => {
  await seedGradedRecommendation({ action: "BUY", windowReturnPct: 10, members: [] }); // BUY correct
  await seedGradedRecommendation({ action: "BUY", windowReturnPct: -10, members: [] }); // BUY incorrect -> false positive
  await seedGradedRecommendation({ action: "REDUCE", windowReturnPct: -5, members: [] }); // REDUCE correct

  const scorecard = await cioScorecardService.getCioScorecard({});
  assert.equal(scorecard.sampleSize, 3);
  assert.equal(scorecard.overallAccuracy, 66.67);
  assert.equal(scorecard.buyAccuracy, 50);
  assert.equal(scorecard.reduceAccuracy, 100);
  assert.equal(scorecard.holdAccuracy, null, "this engine has never generated a HOLD recommendation — honestly null, never fabricated");
  assert.equal(scorecard.falsePositives, 1);
  assert.equal(scorecard.falseNegatives, 0);
});

test("evidence scorecard: a category's win rate reflects real citations across real outcomes, and an uncited category never appears", async () => {
  await seedGradedRecommendation({
    action: "BUY",
    windowReturnPct: 10,
    members: [
      committeeMember({ memberId: "technicalAnalyst", memberName: "Technical Analyst", confidence: 70, supportingCategory: "TECHNICAL" }),
      committeeMember({ memberId: "equityResearchSpecialist", memberName: "Equity Research Specialist", confidence: 60, counterCategory: "ANALYSTS" }),
    ],
  });

  const scorecard = await evidenceScorecardService.getEvidenceScorecard({});
  const technical = scorecard.categories.find((entry) => entry.category === "TECHNICAL");
  const analysts = scorecard.categories.find((entry) => entry.category === "ANALYSTS");
  assert.equal(technical.winRate, 100, "TECHNICAL was cited as SUPPORT on a +10% move — correct");
  assert.equal(analysts.winRate, 0, "ANALYSTS was cited as COUNTER on a +10% move — incorrect");
  assert.equal(scorecard.categories.find((entry) => entry.category === "OPTIONS"), undefined, "a never-cited category must not appear at all");
});
