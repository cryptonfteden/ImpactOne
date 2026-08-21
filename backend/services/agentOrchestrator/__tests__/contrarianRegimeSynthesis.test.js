const { buildContrarianRegimeSynthesis } = require("../contrarianRegimeSynthesis");
const test = require("node:test");
const assert = require("node:assert/strict");

function agents(sentiment, macro) {
  return [
    { agentId: "sentiment", result: { raw: sentiment } },
    { agentId: "macro", result: { raw: macro } },
  ];
}

test("contrarian regime requires an extreme plus liquidity and trend confirmation", () => {
    const result = buildContrarianRegimeSynthesis(agents(
      { score: 20, confidence: 80, trend: { daily: { direction: "IMPROVING" } }, lastUpdated: "2026-08-18" },
      { liquidityScore: 75, confidence: 90, generatedAt: "2026-08-18" },
    ));
    assert.equal(result.state, "CONTRARIAN_RISK_ON_WATCH");
    assert.equal(result.advisoryOnly, true);
});

test("contrarian regime does not turn fear alone into a recommendation", () => {
    const result = buildContrarianRegimeSynthesis(agents(
      { score: 20, confidence: 80, trend: { daily: { direction: "INSUFFICIENT_HISTORY" } } },
      { liquidityScore: 75, confidence: 90 },
    ));
    assert.equal(result.state, "NO_CONTRARIAN_SIGNAL");
    assert.ok(result.blockers.includes("Extreme fear is not confirmed by an improving market trend."));
});

test("contrarian regime keeps missing inputs explicit", () => {
    const result = buildContrarianRegimeSynthesis([]);
    assert.equal(result.actionable, false);
    assert.ok(result.blockers.length >= 2);
});
