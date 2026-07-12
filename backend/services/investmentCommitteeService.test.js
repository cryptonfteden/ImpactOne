require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildExpertVotes,
  buildSupportingArguments,
  buildOpposingArguments,
  buildSpecialistObservations,
  buildSynthesis,
} = require("./investmentCommitteeService");

function agent(overrides = {}) {
  return {
    agent: "Equity Analyst",
    focus: ["Valuation"],
    bullArguments: ["Business quality supports upside."],
    bearArguments: ["Competitive pressure could weaken the case."],
    confidence: 70,
    supportingEvidence: ["Analyst posture: Buy"],
    unknowns: ["Future earnings quality is uncertain."],
    vote: "Buy",
    ...overrides,
  };
}

test("buildExpertVotes surfaces each agent's raw vote and confidence — no synthesized action", () => {
  const votes = buildExpertVotes([agent(), agent({ agent: "Risk Manager", vote: "Hold", confidence: 55 })]);

  assert.deepEqual(votes.map((v) => v.agent), ["Equity Analyst", "Risk Manager"]);
  assert.equal(votes[0].vote, "Buy");
  assert.equal(votes[1].vote, "Hold");
  for (const vote of votes) {
    assert.ok(!("action" in vote), "expert votes must never carry a synthesized canonical action");
  }
});

test("buildSupportingArguments and buildOpposingArguments tag each argument with its originating agent", () => {
  const agents = [agent(), agent({ agent: "Macro Strategist", bullArguments: ["Risk mode is supportive."], bearArguments: ["Inflation pressure is elevated."] })];

  const supporting = buildSupportingArguments(agents);
  const opposing = buildOpposingArguments(agents);

  assert.deepEqual(supporting, [
    { agent: "Equity Analyst", argument: "Business quality supports upside." },
    { agent: "Macro Strategist", argument: "Risk mode is supportive." },
  ]);
  assert.deepEqual(opposing, [
    { agent: "Equity Analyst", argument: "Competitive pressure could weaken the case." },
    { agent: "Macro Strategist", argument: "Inflation pressure is elevated." },
  ]);
});

test("buildSpecialistObservations carries focus/evidence/unknowns but never a vote or decision", () => {
  const observations = buildSpecialistObservations([agent()]);

  assert.deepEqual(Object.keys(observations[0]).sort(), ["agent", "focus", "supportingEvidence", "unknowns"].sort());
  assert.ok(!("vote" in observations[0]));
  assert.ok(!("decision" in observations[0]));
});

test("buildSynthesis strips the CIO's decision field but preserves the rest of the narrative", () => {
  const cio = {
    executiveSummary: "Balance of views points to buy.",
    decision: "Strong Buy",
    expectedReturn: "12-18%",
    risk: "Moderate",
    confidence: 74,
    catalysts: ["AI capex tailwind"],
    threats: ["Valuation stretched"],
    investmentHorizon: "3-12 months",
    portfolioAllocationSuggestion: "3-5% tactical allocation",
    providerNotice: null,
    source: "openai",
  };

  const synthesis = buildSynthesis(cio);

  assert.equal("decision" in synthesis, false, "the committee must never publish its own decision field");
  assert.equal(synthesis.executiveSummary, cio.executiveSummary);
  assert.equal(synthesis.expectedReturn, cio.expectedReturn);
  assert.equal(synthesis.portfolioAllocationSuggestion, cio.portfolioAllocationSuggestion);
});
