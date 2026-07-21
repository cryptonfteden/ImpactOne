// Sprint 41 — Committee Unification regression suite.
//
// Proves, with real assertions, the mission's exact consistency
// requirements: exactly one committee executes, exactly one CIO executes,
// the recommendation and its DecisionTrace reference the same committee
// execution, and no legacy/duplicate committee execution path remains
// reachable anywhere in the backend.
require("../../test/testEnv");

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../../test/dbHelpers");
const app = require("../../app");
const autonomousMarketService = require("../autonomousMarketService");
const portfolioEngineService = require("../portfolioEngineService");
const autonomousRecommendationEngine = require("../autonomousRecommendationEngine");
const autonomousRecommendationRepository = require("../autonomousRecommendationRepository");
const intelligenceCommitteeService = require("./intelligenceCommitteeService");
const technicalIntelligenceService = require("../intelligence/technicalIntelligenceService");

const BACKEND_ROOT = path.join(__dirname, "..", "..");

function requiresModule(contents, moduleName) {
  const pattern = new RegExp(`require\\([^)]*${moduleName}[^)]*\\)`);
  return pattern.test(contents);
}

function walkJsFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsFiles(fullPath, results);
    } else if (entry.name.endsWith(".js") && !entry.name.endsWith(".test.js")) {
      results.push(fullPath);
    }
  }
  return results;
}

test.beforeEach(async () => {
  await truncateAll();
});

test("the legacy committee implementation no longer exists on disk", () => {
  assert.equal(fs.existsSync(path.join(BACKEND_ROOT, "services", "investmentCommitteeService.js")), false);
  assert.equal(fs.existsSync(path.join(BACKEND_ROOT, "controllers", "committeeController.js")), false);
  assert.equal(fs.existsSync(path.join(BACKEND_ROOT, "services", "committeeTrackRecordService.js")), false);
});

test("no backend source file requires the retired legacy committee modules", () => {
  const forbidden = ["investmentCommitteeService", "committeeTrackRecordService"];
  for (const file of walkJsFiles(BACKEND_ROOT)) {
    const contents = fs.readFileSync(file, "utf8");
    for (const moduleName of forbidden) {
      assert.ok(!requiresModule(contents, moduleName), `${path.relative(BACKEND_ROOT, file)} must not require() the retired ${moduleName}`);
    }
  }
});

test("the legacy /committee/* routes are gone — no duplicate committee execution path is reachable", async () => {
  const analyzeResponse = await request(app).get("/api/committee/analyze?symbol=NVDA");
  assert.equal(analyzeResponse.status, 404);
  const trackRecordResponse = await request(app).get("/api/committee/track-record");
  assert.equal(trackRecordResponse.status, 404);
});

test("the unified committee is reachable at exactly one route, /v2/committee-intelligence/:symbol", async () => {
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });
  try {
    const response = await request(app).get("/api/v2/committee-intelligence/NVDA");
    assert.equal(response.status, 200);
    assert.equal(response.body.isVerdict, false);
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});

test("exactly one committee executes per convene() call, with all 8 members and a real CIO summary — never zero, never duplicated", async () => {
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });

  try {
    const result = await intelligenceCommitteeService.convene("NVDA");
    assert.equal(result.committee.members.length, 8, "exactly one committee, with all 8 members, ran once");
    assert.ok(result.cio, "the CIO produced a real summary — it did run");
    assert.ok(result.cio.overallThesis, "the CIO's summary is real content, not an empty stub");
    assert.equal(result.isVerdict, false);
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});

test("chiefInvestmentOfficerService.summarizeForCio is called from exactly one place in the entire backend — the unified committee's own orchestrator", () => {
  const backendFiles = walkJsFiles(BACKEND_ROOT).filter((file) => !file.includes(`${path.sep}test${path.sep}`));
  const callers = backendFiles.filter((file) => {
    const contents = fs.readFileSync(file, "utf8");
    return /summarizeForCio\s*\(/.test(contents) && path.basename(file) !== "chiefInvestmentOfficerService.js";
  });
  assert.deepEqual(
    callers.map((file) => path.relative(BACKEND_ROOT, file)),
    [path.relative(BACKEND_ROOT, path.join(__dirname, "intelligenceCommitteeService.js"))],
    "summarizeForCio must be called from exactly one place — the committee orchestrator — never a second CIO execution path"
  );
});

test("generating a recommendation convenes the unified committee exactly once per symbol — no duplicate execution", async () => {
  const originalOverview = autonomousMarketService.getAutonomousOverview;
  const originalSummary = portfolioEngineService.getPortfolioSummary;
  const originalConvene = intelligenceCommitteeService.convene;

  let conveneCallCount = 0;
  const conveneResult = {
    committee: {
      members: [{ memberId: "technicalAnalyst", memberName: "Technical Analyst", headline: "h", reasoning: "r", supportingEvidence: [{ category: "TECHNICAL", reason: "Uptrend" }], counterEvidence: [], confidence: 70, uncertainty: 30, freshness: "CURRENT", missingEvidence: [], isRecommendation: false }],
      agreement: { status: "AGREEMENT", direction: "SUPPORTIVE", members: ["technicalAnalyst"] },
      disagreement: { status: "NO_DISAGREEMENT", supportiveMembers: [], contraryMembers: [] },
      strongestSupportingEvidence: { memberId: "technicalAnalyst", category: "TECHNICAL", reason: "Uptrend", memberConfidence: 70 },
      strongestContradictoryEvidence: null,
      missingEvidence: [],
      staleEvidence: [],
      isVerdict: false,
    },
    cio: {
      overallThesis: "Committee leans supportive.",
      confidence: "HIGH_UNANIMOUS",
      largestDisagreement: null,
      highestRisk: "No single strongest counter-evidence was reported by any member.",
      missingInformation: [],
      whyRecommendationExists: "Independent members converged.",
      whyRecommendationMayBeWrong: [],
      isVerdict: false,
    },
  };

  autonomousMarketService.getAutonomousOverview = async () => ({
    feed: [],
    watchlistRankings: [
      { symbol: "NVDA", opportunityScore: 90, riskScore: 30, overallAiScore: 88, primaryDriver: "AI capex surge", explanation: "Strong AI capex tailwind." },
    ],
    globalMap: { macroRegime: { recessionRisk: "low", inflationPressure: "low" } },
  });
  portfolioEngineService.getPortfolioSummary = async () => ({
    portfolioId: "test-portfolio",
    totalValue: 100000,
    positionsValue: 0,
    positions: [],
    allocation: { bySector: [], byAssetType: [] },
  });
  intelligenceCommitteeService.convene = async (symbol) => {
    conveneCallCount += 1;
    assert.equal(symbol, "NVDA");
    return conveneResult;
  };

  try {
    const result = await autonomousRecommendationEngine.runOnce();
    assert.equal(result.errors.length, 0);
    assert.equal(conveneCallCount, 1, "the committee must convene exactly once for the one symbol that triggered a recommendation");

    const active = await autonomousRecommendationRepository.listActive();
    const nvda = active.find((item) => item.symbol === "NVDA");
    assert.ok(nvda, "expected a recommendation for NVDA");

    const trace = await autonomousRecommendationRepository.getDecisionTraceByRecommendationId(nvda.id);

    // --- Consistency: recommendation, committee, and DecisionTrace all
    // reference the SAME committee execution — the exact single convene()
    // result above, never a second, differently-shaped committee.
    assert.deepEqual(trace.committeeDebate.committee.agreement, conveneResult.committee.agreement);
    assert.deepEqual(nvda.explanation.committeeDebate.committee.agreement, conveneResult.committee.agreement);
    assert.deepEqual(trace.committeeDebate.cio, conveneResult.cio);
    assert.deepEqual(nvda.explanation.committeeDebate.cio, conveneResult.cio);
    assert.deepEqual(trace.committeeDebate, nvda.explanation.committeeDebate, "the trace and the recommendation's explanation must carry the identical committee execution");
  } finally {
    autonomousMarketService.getAutonomousOverview = originalOverview;
    portfolioEngineService.getPortfolioSummary = originalSummary;
    intelligenceCommitteeService.convene = originalConvene;
  }
});

test("a recommendation's DecisionTrace can never be re-fetched into a UI showing a different committee execution than the one it was created with — the stored committeeDebate is immutable", async () => {
  const originalOverview = autonomousMarketService.getAutonomousOverview;
  const originalSummary = portfolioEngineService.getPortfolioSummary;
  const originalConvene = intelligenceCommitteeService.convene;

  autonomousMarketService.getAutonomousOverview = async () => ({
    feed: [],
    watchlistRankings: [
      { symbol: "AAPL", opportunityScore: 90, riskScore: 30, overallAiScore: 88, primaryDriver: "Services growth", explanation: "Strong services growth." },
    ],
    globalMap: { macroRegime: { recessionRisk: "low", inflationPressure: "low" } },
  });
  portfolioEngineService.getPortfolioSummary = async () => ({
    portfolioId: "test-portfolio",
    totalValue: 100000,
    positionsValue: 0,
    positions: [],
    allocation: { bySector: [], byAssetType: [] },
  });
  intelligenceCommitteeService.convene = async () => ({
    committee: { members: [], agreement: { status: "AGREEMENT", direction: "SUPPORTIVE", members: [] }, disagreement: { status: "NO_DISAGREEMENT", supportiveMembers: [], contraryMembers: [] }, strongestSupportingEvidence: null, strongestContradictoryEvidence: null, missingEvidence: [], staleEvidence: [], isVerdict: false },
    cio: { overallThesis: "Original execution.", confidence: "HIGH_UNANIMOUS", largestDisagreement: null, highestRisk: "n/a", missingInformation: [], whyRecommendationExists: "n/a", whyRecommendationMayBeWrong: [], isVerdict: false },
  });

  try {
    await autonomousRecommendationEngine.runOnce();
    const active = await autonomousRecommendationRepository.listActive();
    const aapl = active.find((item) => item.symbol === "AAPL");
    const traceBefore = await autonomousRecommendationRepository.getDecisionTraceByRecommendationId(aapl.id);
    assert.equal(traceBefore.committeeDebate.cio.overallThesis, "Original execution.");

    // A later, different committee execution (e.g. a live re-convene
    // elsewhere) must never retroactively change this already-persisted
    // trace — proving the UI can never render stale/swapped committee
    // data for a past recommendation.
    intelligenceCommitteeService.convene = async () => ({
      committee: { members: [], agreement: { status: "AGREEMENT", direction: "CONTRARY", members: [] }, disagreement: { status: "NO_DISAGREEMENT", supportiveMembers: [], contraryMembers: [] }, strongestSupportingEvidence: null, strongestContradictoryEvidence: null, missingEvidence: [], staleEvidence: [], isVerdict: false },
      cio: { overallThesis: "A later, different execution.", confidence: "LOW_SPLIT", largestDisagreement: null, highestRisk: "n/a", missingInformation: [], whyRecommendationExists: "n/a", whyRecommendationMayBeWrong: [], isVerdict: false },
    });
    await intelligenceCommitteeService.convene("AAPL");

    const traceAfter = await autonomousRecommendationRepository.getDecisionTraceByRecommendationId(aapl.id);
    assert.equal(traceAfter.committeeDebate.cio.overallThesis, "Original execution.", "the persisted trace must be immutable — a later committee execution elsewhere must never mutate it");
  } finally {
    autonomousMarketService.getAutonomousOverview = originalOverview;
    portfolioEngineService.getPortfolioSummary = originalSummary;
    intelligenceCommitteeService.convene = originalConvene;
  }
});
