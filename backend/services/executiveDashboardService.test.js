require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const executiveDashboardService = require("./executiveDashboardService");

test.beforeEach(async () => {
  await truncateAll();
});

test("returns exactly six real lists, honestly empty when there is no data yet", async () => {
  const result = await executiveDashboardService.getExecutiveDashboard(null);
  assert.deepEqual(result.highestConvictionOpportunities, []);
  assert.deepEqual(result.highestMarketRisks, []);
  assert.deepEqual(result.largestPortfolioImpacts, []);
  assert.deepEqual(result.majorMarketEvents, []);
  assert.equal(result.largestPositioningChanges, null);
  assert.deepEqual(result.highestAiConfidence, []);
  assert.equal(result.unavailableSources.length, 1);
  assert.equal(result.unavailableSources[0].source, "largestPositioningChanges");
});

test("highestConvictionOpportunities only includes real ACTIVE BUY recommendations, sorted by real qualityScore desc", async () => {
  const prisma = getPrismaClient();
  await prisma.recommendation.create({
    data: {
      symbol: "LOWQ", action: "BUY", confidenceScore: 50, expectedUpside: "5%", expectedDownside: "2%",
      riskScore: 30, riskLabel: "Low", positionSizeSuggestion: "1%", reasoning: "low quality buy",
      evidence: [], explanation: {}, scenarios: {}, qualityScore: 40, qualityComponents: {},
    },
  });
  await prisma.recommendation.create({
    data: {
      symbol: "HIGHQ", action: "BUY", confidenceScore: 90, expectedUpside: "20%", expectedDownside: "5%",
      riskScore: 20, riskLabel: "Low", positionSizeSuggestion: "5%", reasoning: "high quality buy",
      evidence: [], explanation: {}, scenarios: {}, qualityScore: 95, qualityComponents: {},
    },
  });
  await prisma.recommendation.create({
    data: {
      symbol: "EXITME", action: "EXIT", confidenceScore: 99, expectedUpside: "0%", expectedDownside: "10%",
      riskScore: 80, riskLabel: "High", positionSizeSuggestion: "0%", reasoning: "an exit, not an opportunity",
      evidence: [], explanation: {}, scenarios: {}, qualityScore: 99, qualityComponents: {},
    },
  });

  const result = await executiveDashboardService.getExecutiveDashboard(null);
  assert.deepEqual(result.highestConvictionOpportunities.map((entry) => entry.symbol), ["HIGHQ", "LOWQ"]);
  assert.equal(result.highestMarketRisks[0].symbol, "EXITME");
  assert.equal(result.highestAiConfidence[0].symbol, "EXITME");
});
