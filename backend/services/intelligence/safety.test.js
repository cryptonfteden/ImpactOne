// Sprint 37 Priority 14 — Regression and Safety.
//
// Proves, with real assertions (not just comments), every safety property
// the mission requires of the new Market Intelligence Source Layer.
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const socialInfluenceService = require("./socialInfluenceService");
const analystConsensusService = require("./analystConsensusService");
const optionsIntelligenceService = require("./optionsIntelligenceService");
const cryptoDerivativesService = require("./cryptoDerivativesService");
const evidenceMatrixService = require("./evidenceMatrixService");
const providerInventoryService = require("./providerInventoryService");
const { honestStubFetch } = require("../providers/providerFactory");

const FORBIDDEN_IMPORTS = ["autonomousRecommendationEngine", "canonicalVerdict", "portfolioEngineService", "orderService", "tradeExecutionService"];
const INTELLIGENCE_DIR = __dirname;
const RESEARCH_AGENT_FILE = path.join(__dirname, "..", "researchAgentService.js");

function readSourceFiles(dir) {
  return fs.readdirSync(dir).filter((file) => file.endsWith(".js") && !file.endsWith(".test.js"));
}

// Matches an actual require(...) call naming the forbidden module — not a
// comment mentioning it by name (this file's own header comments name
// every forbidden module in prose, explaining the rule, which a naive
// substring check would misfire on).
function requiresModule(contents, moduleName) {
  const pattern = new RegExp(`require\\([^)]*${moduleName}[^)]*\\)`);
  return pattern.test(contents);
}

test("no file in the intelligence layer imports recommendation-creating, portfolio-modifying, or trade-execution modules", () => {
  for (const file of readSourceFiles(INTELLIGENCE_DIR)) {
    const contents = fs.readFileSync(path.join(INTELLIGENCE_DIR, file), "utf8");
    for (const forbidden of FORBIDDEN_IMPORTS) {
      assert.ok(!requiresModule(contents, forbidden), `${file} must not require() ${forbidden} — Market Intelligence Layer services are read-only evidence, never recommendation/trade logic`);
    }
  }
});

test("researchAgentService.js never imports a portfolio, order, or trade-execution module", () => {
  const contents = fs.readFileSync(RESEARCH_AGENT_FILE, "utf8");
  for (const forbidden of FORBIDDEN_IMPORTS) {
    assert.ok(!requiresModule(contents, forbidden), `researchAgentService.js must not require() ${forbidden}`);
  }
});

test("unavailable providers never fabricate data — honestStubFetch always returns an empty array", async () => {
  const result = await honestStubFetch();
  assert.deepEqual(result, []);
});

test("every fixture-producing intelligence function labels its output status FIXTURE, never presenting it as live", () => {
  assert.equal(socialInfluenceService.getFixtureFeed().status, "FIXTURE");
  assert.equal(analystConsensusService.getFixtureConsensus("AAPL").status, "FIXTURE");
  assert.equal(cryptoDerivativesService.getFixtureSnapshot("BTC").status, "FIXTURE");
  assert.equal(optionsIntelligenceService.getFixtureSnapshot("NVDA").status, "FIXTURE");
});

test("a social post can never independently produce a recommendation — analyzePost always marks isRecommendation false and returns no verdict field", () => {
  const result = socialInfluenceService.analyzePost({ authorHandle: "@elonmusk", text: "Big news coming for the stock." });
  assert.equal(result.isRecommendation, false);
  assert.equal("action" in result, false);
  assert.equal("verdict" in result, false);
});

test("an analyst rating can never independently produce a recommendation — crossCheckRatings always marks isRecommendation false and returns no action field", () => {
  const ratings = [analystConsensusService.normalizeRating("finviz", "Strong Buy"), analystConsensusService.normalizeRating("zacks", "Strong Buy")];
  const result = analystConsensusService.crossCheckRatings(ratings);
  assert.equal(result.isRecommendation, false);
  assert.equal("action" in result, false);
});

test("a technical signal is evidence, not a verdict — every signal carries enoughDataStatus/freshness and never an 'action' field", () => {
  const technicalIntelligenceService = require("./technicalIntelligenceService");
  const bars = Array.from({ length: 100 }, (_, i) => ({ date: `2026-01-${(i % 28) + 1}`, open: 100, high: 101, low: 99, close: 100 + i * 0.1, volume: 1000 }));
  const result = technicalIntelligenceService.analyzeBars(bars);
  for (const signal of Object.values(result.signals)) {
    assert.equal("action" in signal, false, `${signal.name} must not carry an action/verdict field`);
    assert.ok("enoughDataStatus" in signal);
    assert.ok("freshness" in signal);
  }
});

test("options calls are not automatically classified as bullish — a plain call with no confirming signal is AMBIGUOUS", () => {
  assert.equal(optionsIntelligenceService.classifyDirectionalBias({ optionType: "CALL" }), "AMBIGUOUS");
});

test("provider disagreement stays visible — the evidence matrix's ANALYSTS row is never averaged into a single consensus number", async () => {
  const technicalIntelligenceService = require("./technicalIntelligenceService");
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });
  try {
    const matrix = await evidenceMatrixService.buildEvidenceMatrix("AAPL");
    const analysts = matrix.categories.find((row) => row.category === "ANALYSTS");
    assert.equal(analysts.disagreement, true);
    assert.equal("averageRating" in analysts, false);
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});

test("the evidence matrix itself is never presented as a verdict", async () => {
  const technicalIntelligenceService = require("./technicalIntelligenceService");
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });
  try {
    const matrix = await evidenceMatrixService.buildEvidenceMatrix("AAPL");
    assert.equal(matrix.isVerdict, false);
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});

test("registering a new provider does not silently change existing registry entries' shape — every pre-Sprint-37 provider still conforms to the base contract unchanged", () => {
  const { validateProviderShape } = require("../providers/baseProviderContract");
  const providerRegistry = require("../providers/providerRegistry");
  const preExistingIds = ["reutersBloombergWire", "sec", "reddit", "x", "telegram", "polymarket", "fed", "ecb", "fomc", "fda", "nasa", "usTreasury", "congress", "majorEarnings", "patentFeeds"];
  for (const id of preExistingIds) {
    const provider = providerRegistry.getProvider(id);
    assert.ok(provider, `${id} must still be registered`);
    assert.equal(validateProviderShape(provider).valid, true);
  }
});

test("every provider inventory row carries provenance fields sufficient to trace a public claim back to its source", async () => {
  const inventory = await providerInventoryService.generateInventory();
  for (const row of inventory) {
    assert.ok(row.providerId);
    assert.ok(row.category);
    assert.ok(row.status);
    assert.ok("authenticationRequirement" in row);
  }
});
