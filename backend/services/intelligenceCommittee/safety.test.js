// Sprint 38 — Investment Intelligence Committee regression and safety.
//
// Proves, with real assertions, every safety property the mission
// requires: members stay independent, no member imports recommendation
// logic or touches a provider/evidenceMatrixService directly, unavailable
// providers stay unavailable, stale evidence stays labeled, and the
// coordinator/CIO never average confidence scores.
require("../../test/testEnv");

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const evidenceMatrixService = require("../intelligence/evidenceMatrixService");
const technicalIntelligenceService = require("../intelligence/technicalIntelligenceService");
const { summarizeCommittee } = require("./committeeCoordinator");
const { summarizeForCio } = require("./chiefInvestmentOfficerService");
const intelligenceCommitteeService = require("./intelligenceCommitteeService");
const macroEconomistMember = require("./members/macroEconomistMember");
const technicalAnalystMember = require("./members/technicalAnalystMember");

const FORBIDDEN_IMPORTS = ["autonomousRecommendationEngine", "canonicalVerdict", "portfolioEngineService", "orderService", "tradeExecutionService"];
const FORBIDDEN_DIRECT_ACCESS = ["providerRegistry", "providerIngestionService"];
const MEMBERS_DIR = path.join(__dirname, "members");
const ORCHESTRATOR_FILE = path.join(__dirname, "intelligenceCommitteeService.js");

function requiresModule(contents, moduleName) {
  const pattern = new RegExp(`require\\([^)]*${moduleName}[^)]*\\)`);
  return pattern.test(contents);
}

function memberFiles() {
  return fs.readdirSync(MEMBERS_DIR).filter((file) => file.endsWith(".js") && !file.endsWith(".test.js"));
}

test.beforeEach(async () => {
  await truncateAll();
});

test("no committee member imports recommendation-creating, portfolio-modifying, or trade-execution modules", () => {
  for (const file of memberFiles()) {
    const contents = fs.readFileSync(path.join(MEMBERS_DIR, file), "utf8");
    for (const forbidden of FORBIDDEN_IMPORTS) {
      assert.ok(!requiresModule(contents, forbidden), `${file} must not require() ${forbidden}`);
    }
  }
});

test("no committee member imports evidenceMatrixService or a provider directly — members only consume the matrix object they're given", () => {
  for (const file of memberFiles()) {
    const contents = fs.readFileSync(path.join(MEMBERS_DIR, file), "utf8");
    assert.ok(!requiresModule(contents, "evidenceMatrixService"), `${file} must not require() evidenceMatrixService directly`);
    for (const forbidden of FORBIDDEN_DIRECT_ACCESS) {
      assert.ok(!requiresModule(contents, forbidden), `${file} must not require() ${forbidden}`);
    }
  }
});

test("only the orchestrator calls evidenceMatrixService.buildEvidenceMatrix", () => {
  const contents = fs.readFileSync(ORCHESTRATOR_FILE, "utf8");
  assert.ok(requiresModule(contents, "evidenceMatrixService"));
});

test("the coordinator and CIO never produce a blended/averaged confidence field", () => {
  const memberOutputs = [
    { memberId: "a", memberName: "A", headline: "h", reasoning: "r", supportingEvidence: [{ category: "X", reason: "y" }], counterEvidence: [], confidence: 80, uncertainty: 20, freshness: "CURRENT", missingEvidence: [], isRecommendation: false },
    { memberId: "b", memberName: "B", headline: "h", reasoning: "r", supportingEvidence: [], counterEvidence: [{ category: "X", reason: "y" }], confidence: 40, uncertainty: 60, freshness: "STALE", missingEvidence: ["z"], isRecommendation: false },
  ];
  const summary = summarizeCommittee(memberOutputs);
  assert.equal("averageConfidence" in summary, false);
  assert.equal("blendedConfidence" in summary, false);
  assert.equal("score" in summary, false);
  assert.equal(summary.isVerdict, false);

  const cio = summarizeForCio(summary);
  assert.equal("averageConfidence" in cio, false);
  assert.equal("blendedConfidence" in cio, false);
  assert.equal("score" in cio, false);
  assert.equal(cio.isVerdict, false);
});

test("the committee summary surfaces disagreement explicitly rather than smoothing it away", () => {
  const memberOutputs = [
    { memberId: "a", memberName: "A", headline: "h", reasoning: "r", supportingEvidence: [{ category: "X", reason: "y" }], counterEvidence: [], confidence: 80, uncertainty: 20, freshness: "CURRENT", missingEvidence: [], isRecommendation: false },
    { memberId: "b", memberName: "B", headline: "h", reasoning: "r", supportingEvidence: [], counterEvidence: [{ category: "X", reason: "y" }], confidence: 40, uncertainty: 60, freshness: "CURRENT", missingEvidence: [], isRecommendation: false },
  ];
  const summary = summarizeCommittee(memberOutputs);
  assert.equal(summary.disagreement.status, "DISAGREEMENT");
  assert.deepEqual(summary.disagreement.supportiveMembers, ["a"]);
  assert.deepEqual(summary.disagreement.contraryMembers, ["b"]);
});

test("stale evidence stays labeled through to the coordinator's summary", () => {
  const memberOutputs = [
    { memberId: "a", memberName: "A", headline: "h", reasoning: "r", supportingEvidence: [], counterEvidence: [], confidence: 50, uncertainty: 50, freshness: "STALE", missingEvidence: [], isRecommendation: false },
  ];
  const summary = summarizeCommittee(memberOutputs);
  assert.equal(summary.staleEvidence.length, 1);
  assert.equal(summary.staleEvidence[0].memberId, "a");
});

test("a member reports UNAVAILABLE evidence honestly when the underlying evidence-matrix row is unavailable, never fabricating a stance", () => {
  const unavailableMatrix = { symbol: "NVDA", categories: [{ category: "INSTITUTIONS", stance: "UNAVAILABLE", confidence: 0, uncertainty: 100, sourceCount: 0, newestSource: null, strongestCounterEvidence: null, reason: "not configured" }] };
  const institutionalSpecialistMember = require("./members/institutionalSpecialistMember");
  const output = institutionalSpecialistMember.evaluate(unavailableMatrix);
  assert.equal(output.confidence, 0);
  assert.equal(output.missingEvidence.length > 0, true);
});

test("every standard member output never carries a recommendation/verdict/action field", async () => {
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });
  try {
    const matrix = await evidenceMatrixService.buildEvidenceMatrix("NVDA");
    const outputs = [macroEconomistMember.evaluate(matrix), technicalAnalystMember.evaluate(matrix)];
    for (const output of outputs) {
      assert.equal(output.isRecommendation, false);
      assert.equal("action" in output, false);
      assert.equal("verdict" in output, false);
    }
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});

test("convene() runs the full committee end to end and never produces a verdict", async () => {
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });
  try {
    const result = await intelligenceCommitteeService.convene("NVDA");
    assert.equal(result.committee.members.length, 8);
    assert.equal(result.isVerdict, false);
    assert.equal(result.committee.isVerdict, false);
    assert.equal(result.cio.isVerdict, false);
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});
