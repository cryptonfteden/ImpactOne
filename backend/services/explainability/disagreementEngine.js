// Sprint 39 Priority 5 — Disagreement Engine.
//
// SAFETY-CRITICAL: classifies real disagreement already present in a
// committee summary (Sprint 38's committeeCoordinator output) — it never
// invents a disagreement or hides one. Never imports evidenceMatrixService
// or a provider; only reads the member outputs it's given.
const { leanOf } = require("../intelligenceCommittee/committeeCoordinator");

const UNCERTAINTY_GAP_THRESHOLD = 30;

function reasonForPair(memberA, memberB) {
  if (memberA.freshness !== memberB.freshness && (memberA.freshness === "STALE" || memberB.freshness === "STALE")) {
    return "FRESHNESS";
  }
  if (memberA.missingEvidence.length > 0 || memberB.missingEvidence.length > 0) {
    return "MISSING_PROVIDER";
  }
  if (Math.abs(memberA.uncertainty - memberB.uncertainty) >= UNCERTAINTY_GAP_THRESHOLD) {
    return "UNCERTAINTY";
  }
  return "CATEGORY"; // different specialist domains naturally read different evidence
}

function classifyDisagreement(committeeSummary) {
  const members = committeeSummary.members;
  const leans = members.map((member) => ({ member, lean: leanOf(member) }));

  const available = leans.filter((entry) => entry.lean !== "NEUTRAL");
  if (!available.length) {
    return { level: "INSUFFICIENT_EVIDENCE", pairs: [] };
  }

  const mixedMembers = available.filter((entry) => entry.lean === "MIXED");
  const supportive = available.filter((entry) => entry.lean === "SUPPORTIVE");
  const contrary = available.filter((entry) => entry.lean === "CONTRARY");

  const pairs = [];
  for (const s of supportive) {
    for (const c of contrary) {
      pairs.push({
        memberA: s.member.memberId,
        memberB: c.member.memberId,
        reason: reasonForPair(s.member, c.member),
      });
    }
  }

  if (mixedMembers.length) {
    return { level: "CONFLICTING_EVIDENCE", pairs, mixedMembers: mixedMembers.map((entry) => entry.member.memberId) };
  }

  if (!supportive.length || !contrary.length) {
    return { level: "AGREEMENT", pairs: [] };
  }

  const minority = Math.min(supportive.length, contrary.length);
  const majority = Math.max(supportive.length, contrary.length);

  if (minority <= 1 && majority >= minority * 3) {
    return { level: "PARTIAL_AGREEMENT", pairs };
  }

  return { level: "STRONG_DISAGREEMENT", pairs };
}

module.exports = { classifyDisagreement };
