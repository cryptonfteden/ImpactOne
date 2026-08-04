require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CANONICAL_VERDICT_CONTRACT_VERSION,
  CANONICAL_ACTIONS,
  FORBIDDEN_COMMITTEE_KEYS,
  sanitizeCommitteeDebate,
  buildCanonicalVerdictView,
} = require("./canonicalVerdict");

test("CANONICAL_ACTIONS is exactly BUY/REDUCE/EXIT/HOLD", () => {
  assert.deepEqual(CANONICAL_ACTIONS, ["BUY", "REDUCE", "EXIT", "HOLD"]);
});

test("CANONICAL_VERDICT_CONTRACT_VERSION is a non-empty version string", () => {
  assert.equal(typeof CANONICAL_VERDICT_CONTRACT_VERSION, "string");
  assert.ok(CANONICAL_VERDICT_CONTRACT_VERSION.length > 0);
});

test("sanitizeCommitteeDebate strips every forbidden verdict-shaped key", () => {
  const dirty = {
    committee: { members: [], agreement: { status: "AGREEMENT", direction: "SUPPORTIVE", members: ["technicalAnalyst"] } },
    action: "BUY",
    decision: "Strong Buy",
    verdict: "Buy",
    finalDecision: "Buy",
    recommendation: "Buy",
  };

  const clean = sanitizeCommitteeDebate(dirty);

  for (const key of FORBIDDEN_COMMITTEE_KEYS) {
    assert.ok(!(key in clean), `${key} should have been stripped`);
  }
  assert.deepEqual(clean.committee.agreement.direction, "SUPPORTIVE");
});

test("sanitizeCommitteeDebate passes through null unchanged", () => {
  assert.equal(sanitizeCommitteeDebate(null), null);
  assert.equal(sanitizeCommitteeDebate(undefined), null);
});

test("buildCanonicalVerdictView exposes exactly one action field, sourced from the persisted recommendation", () => {
  const view = buildCanonicalVerdictView({
    recommendation: { action: "BUY", confidenceScore: "72.00", qualityScore: "81.00", riskLabel: "Moderate" },
    committeeDebate: { committee: { agreement: { status: "AGREEMENT", direction: "SUPPORTIVE" } }, cio: { confidence: "HIGH_UNANIMOUS" } },
  });

  assert.equal(view.hasCanonicalRecommendation, true);
  assert.equal(view.action, "BUY");
  assert.equal(view.confidenceScore, 72);
  assert.equal(view.qualityScore, 81);
  assert.equal("action" in view.committeeDebate, false, "the debate object must never carry its own action field");
});

test("buildCanonicalVerdictView with no persisted recommendation returns action: null, never a synthesized substitute", () => {
  const view = buildCanonicalVerdictView({
    recommendation: null,
    committeeDebate: { committee: { agreement: { status: "AGREEMENT", direction: "CONTRARY" } }, cio: { confidence: "LOW_SPLIT" } },
  });

  assert.equal(view.hasCanonicalRecommendation, false);
  assert.equal(view.action, null);
  assert.ok(view.committeeDebate, "debate context should still be present for exploratory research");
});

test("buildCanonicalVerdictView strips a maliciously-injected decision field even when a real recommendation exists", () => {
  const view = buildCanonicalVerdictView({
    recommendation: { action: "EXIT", confidenceScore: "40.00", qualityScore: "55.00", riskLabel: "High" },
    committeeDebate: { decision: "Strong Buy", committee: { members: [] } },
  });

  assert.equal(view.action, "EXIT", "the canonical action always comes from the persisted recommendation");
  assert.equal("decision" in view.committeeDebate, false);
});
