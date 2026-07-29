const test = require("node:test");
const assert = require("node:assert/strict");
const { mapAgentResult, toPolarity, extractRisksAndOpportunities } = require("./agentDirectionMapper");

test("toPolarity maps options' marketBias directly", () => {
  assert.equal(toPolarity("options", { marketBias: "BULLISH" }), "BULLISH");
  assert.equal(toPolarity("options", { marketBias: "BEARISH" }), "BEARISH");
  assert.equal(toPolarity("options", { marketBias: "NEUTRAL" }), "NEUTRAL");
});

test("toPolarity maps earnings' forwardOutlook (POSITIVE/NEGATIVE/other)", () => {
  assert.equal(toPolarity("earnings", { forwardOutlook: "POSITIVE" }), "BULLISH");
  assert.equal(toPolarity("earnings", { forwardOutlook: "NEGATIVE" }), "BEARISH");
  assert.equal(toPolarity("earnings", { forwardOutlook: "NEUTRAL" }), "NEUTRAL");
  assert.equal(toPolarity("earnings", { forwardOutlook: "UNKNOWN" }), "NEUTRAL");
});

test("toPolarity maps valuation's valuationStatus (undervalued = bullish setup, overvalued = bearish setup)", () => {
  assert.equal(toPolarity("valuation", { valuationStatus: "UNDERVALUED" }), "BULLISH");
  assert.equal(toPolarity("valuation", { valuationStatus: "OVERVALUED" }), "BEARISH");
  assert.equal(toPolarity("valuation", { valuationStatus: "FAIRLY_VALUED" }), "NEUTRAL");
  assert.equal(toPolarity("valuation", { valuationStatus: "UNKNOWN" }), "NEUTRAL");
});

test("toPolarity maps symbol-sentiment's sentimentState (POSITIVE/NEGATIVE/other)", () => {
  assert.equal(toPolarity("symbol-sentiment", { sentimentState: "POSITIVE" }), "BULLISH");
  assert.equal(toPolarity("symbol-sentiment", { sentimentState: "NEGATIVE" }), "BEARISH");
  assert.equal(toPolarity("symbol-sentiment", { sentimentState: "NEUTRAL" }), "NEUTRAL");
});

test("extractRisksAndOpportunities for symbol-sentiment maps bullishFactors to opportunities and risks+bearishFactors to risks", () => {
  const raw = { risks: ["low source diversity"], bearishFactors: ["sentiment deteriorating"], bullishFactors: ["sentiment improving"] };
  const result = extractRisksAndOpportunities("symbol-sentiment", raw);
  assert.deepEqual(result.risks, ["low source diversity", "sentiment deteriorating"]);
  assert.deepEqual(result.opportunities, ["sentiment improving"]);
});

test("toPolarity maps insider's insiderActivity (BULLISH/BEARISH/other)", () => {
  assert.equal(toPolarity("insider", { insiderActivity: "BULLISH" }), "BULLISH");
  assert.equal(toPolarity("insider", { insiderActivity: "BEARISH" }), "BEARISH");
  assert.equal(toPolarity("insider", { insiderActivity: "NEUTRAL" }), "NEUTRAL");
});

test("extractRisksAndOpportunities for insider maps bullishFactors to opportunities and risks+bearishFactors to risks", () => {
  const raw = { risks: ["few real filings"], bearishFactors: ["cluster selling detected"], bullishFactors: ["CEO purchase detected"] };
  const result = extractRisksAndOpportunities("insider", raw);
  assert.deepEqual(result.risks, ["few real filings", "cluster selling detected"]);
  assert.deepEqual(result.opportunities, ["CEO purchase detected"]);
});

test("extractRisksAndOpportunities for earnings reuses its own real risks/opportunities arrays directly", () => {
  const raw = { risks: ["risk one"], opportunities: ["opportunity one"] };
  assert.deepEqual(extractRisksAndOpportunities("earnings", raw), { risks: ["risk one"], opportunities: ["opportunity one"] });
});

test("extractRisksAndOpportunities for options reuses riskSummary.notes and derives an opportunity from real institutional activity", () => {
  const raw = { riskSummary: { notes: ["thin volume"] }, signals: { institutionalActivity: { detected: true, contractCount: 2 } } };
  const result = extractRisksAndOpportunities("options", raw);
  assert.deepEqual(result.risks, ["thin volume"]);
  assert.match(result.opportunities[0], /2 block\/sweep signal/);
});

test("extractRisksAndOpportunities for options with no institutional activity produces no fabricated opportunity", () => {
  const raw = { riskSummary: { notes: [] }, signals: { institutionalActivity: { detected: false } } };
  assert.deepEqual(extractRisksAndOpportunities("options", raw).opportunities, []);
});

test("extractRisksAndOpportunities for valuation surfaces excluded-method risks and a real discount-based opportunity", () => {
  const raw = { excludedMethods: [{ method: "PE", reason: "Negative EPS." }], attractiveRangeCaveat: null, highMarginOfSafety: false, attractiveRange: true, discountToFairValue: 0.15 };
  const result = extractRisksAndOpportunities("valuation", raw);
  assert.match(result.risks[0], /PE valuation method unavailable/);
  assert.match(result.opportunities[0], /15%/);
});

test("extractRisksAndOpportunities for valuation surfaces the value-trap caveat as a real risk when present", () => {
  const raw = { excludedMethods: [], attractiveRangeCaveat: "value trap caveat text", highMarginOfSafety: false, attractiveRange: false, discountToFairValue: 0.15 };
  const result = extractRisksAndOpportunities("valuation", raw);
  assert.ok(result.risks.includes("value trap caveat text"));
});

test("mapAgentResult for an unfulfilled (error/timeout) agent is honestly unavailable, never fabricating a direction", () => {
  const agentResult = { agentId: "options", agentName: "Options Flow Agent", status: "timeout", priority: 7, confidence: 0, result: null };
  const mapped = mapAgentResult(agentResult);
  assert.equal(mapped.available, false);
  assert.equal(mapped.direction, null);
  assert.equal(mapped.confidence, 0);
  assert.ok(mapped.unavailableReason);
});

test("mapAgentResult for a fulfilled agent with dataAvailable:false is honestly unavailable too, not fulfilled-but-empty", () => {
  const agentResult = {
    agentId: "earnings",
    agentName: "Earnings Intelligence Agent",
    status: "fulfilled",
    priority: 7,
    confidence: 0,
    result: { summary: "no data", raw: { dataAvailable: false, unavailableReason: "no key configured" } },
  };
  const mapped = mapAgentResult(agentResult);
  assert.equal(mapped.available, false);
  assert.equal(mapped.unavailableReason, "no key configured");
});

test("mapAgentResult for a real fulfilled, data-available agent carries through its real direction/confidence/priority", () => {
  const agentResult = {
    agentId: "options",
    agentName: "Options Flow Agent",
    status: "fulfilled",
    priority: 7,
    confidence: 82,
    result: {
      summary: "bullish options flow",
      raw: { dataAvailable: true, marketBias: "BULLISH", riskSummary: { notes: [] }, signals: { institutionalActivity: { detected: false } } },
    },
  };
  const mapped = mapAgentResult(agentResult);
  assert.equal(mapped.available, true);
  assert.equal(mapped.direction, "BULLISH");
  assert.equal(mapped.confidence, 82);
  assert.equal(mapped.priority, 7);
  assert.equal(mapped.summary, "bullish options flow");
});
