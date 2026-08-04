// Sprint 42 — Committee Scorecard.
//
// For every committee member: win rate, average alpha, confidence
// calibration, average holding period, contribution score, disagreement
// frequency — computed only from real graded outcomes joined back to the
// ONE unified committee's real per-member evidence at decision time
// (DecisionTrace.committeeDebate.committee). A member's "win" is judged on
// whether their own lean (SUPPORTIVE/CONTRARY) matched the real
// subsequent price direction — independent of the recommendation's own
// action — never averaged/blended across members into one score.
const { loadGradedRows } = require("./scorecardDataSource");
const { leanOf } = require("../intelligenceCommittee/committeeCoordinator");

const ROLLING_WINDOWS_DAYS = [30, 90, 365];

function round(value, decimals = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(decimals)) : null;
}

function computeMemberStats(rows) {
  const byMember = new Map();

  for (const { outcome, recommendation, committee } of rows) {
    if (!committee) continue;
    const windowReturnPct = Number(outcome.windowReturnPct);
    if (!Number.isFinite(windowReturnPct)) continue;
    const holdingHours = (new Date(outcome.gradedAt) - new Date(recommendation.createdAt)) / (60 * 60 * 1000);

    for (const member of committee.members) {
      const lean = leanOf(member);
      if (lean === "NEUTRAL") continue; // no directional call from this member — excluded from win/loss

      if (!byMember.has(member.memberId)) {
        byMember.set(member.memberId, {
          memberId: member.memberId,
          memberName: member.memberName,
          wins: 0,
          losses: 0,
          alphaSum: 0,
          alphaCount: 0,
          calibrationSum: 0,
          calibrationCount: 0,
          holdingHoursSum: 0,
          holdingCount: 0,
          strongestCount: 0,
          disagreementCount: 0,
          participationCount: 0,
        });
      }
      const stat = byMember.get(member.memberId);
      stat.participationCount += 1;

      const positiveReturn = windowReturnPct > 0;
      const memberCorrect = (lean === "SUPPORTIVE" && positiveReturn) || (lean === "CONTRARY" && !positiveReturn);
      if (memberCorrect) stat.wins += 1;
      else stat.losses += 1;

      const signedReturn = lean === "SUPPORTIVE" ? windowReturnPct : -windowReturnPct;
      stat.alphaSum += signedReturn;
      stat.alphaCount += 1;

      if (Number.isFinite(member.confidence)) {
        const confidenceFraction = member.confidence / 100;
        stat.calibrationSum += memberCorrect ? confidenceFraction : 1 - confidenceFraction;
        stat.calibrationCount += 1;
      }

      if (Number.isFinite(holdingHours)) {
        stat.holdingHoursSum += holdingHours;
        stat.holdingCount += 1;
      }

      if (committee.strongestSupportingEvidence?.memberId === member.memberId || committee.strongestContradictoryEvidence?.memberId === member.memberId) {
        stat.strongestCount += 1;
      }
      if (
        committee.disagreement?.status === "DISAGREEMENT" &&
        (committee.disagreement.supportiveMembers?.includes(member.memberId) || committee.disagreement.contraryMembers?.includes(member.memberId))
      ) {
        stat.disagreementCount += 1;
      }
    }
  }

  return [...byMember.values()].map((stat) => ({
    memberId: stat.memberId,
    memberName: stat.memberName,
    sampleSize: stat.wins + stat.losses,
    winRate: stat.wins + stat.losses ? round((stat.wins / (stat.wins + stat.losses)) * 100) : null,
    averageAlphaPct: stat.alphaCount ? round(stat.alphaSum / stat.alphaCount) : null,
    confidenceCalibration: stat.calibrationCount ? round((stat.calibrationSum / stat.calibrationCount) * 100) : null,
    averageHoldingPeriodHours: stat.holdingCount ? round(stat.holdingHoursSum / stat.holdingCount, 1) : null,
    contributionScore: stat.participationCount ? round((stat.strongestCount / stat.participationCount) * 100) : null,
    disagreementFrequency: stat.participationCount ? round((stat.disagreementCount / stat.participationCount) * 100) : null,
  }));
}

/** One scorecard per member, for a single rolling window (days). */
async function getCommitteeScorecard({ windowDays } = {}) {
  const rows = await loadGradedRows({ sinceDays: windowDays });
  return { windowDays: windowDays || null, generatedAt: new Date().toISOString(), members: computeMemberStats(rows) };
}

/** All three mission-named rolling windows (30/90/365 days) in one call. */
async function getCommitteeScorecardRollup() {
  const entries = await Promise.all(ROLLING_WINDOWS_DAYS.map(async (days) => [days, await getCommitteeScorecard({ windowDays: days })]));
  return Object.fromEntries(entries);
}

module.exports = { getCommitteeScorecard, getCommitteeScorecardRollup, ROLLING_WINDOWS_DAYS };
