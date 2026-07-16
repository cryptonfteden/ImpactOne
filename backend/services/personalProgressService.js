// Sprint 31 — Personal Progress (Priority 2). "Allow users to see: how
// their understanding evolved, how their portfolio discipline evolved,
// how their reading habits evolved. Never gamify. Only educate." No
// score, no points, no streak, no badge — every field below is either an
// honest trend label ("improving"/"declining"/"stable"/"insufficient
// data") or a real count, never a fabricated number designed to feel
// like a game.
const { getPrismaClient } = require("../db/prismaClient");
const portfolioEngineService = require("./portfolioEngineService");

const MIN_HALF_SIZE = 3;

function splitChronological(items) {
  if (items.length < MIN_HALF_SIZE * 2) {
    return null;
  }
  const midpoint = Math.floor(items.length / 2);
  return { earlier: items.slice(0, midpoint), recent: items.slice(midpoint) };
}

/**
 * An index-based half-split (see splitChronological above) always
 * produces two near-equal-length slices by construction, so comparing
 * raw *counts* between them can never reveal a real activity-rate
 * change — it just measures rounding. Reading-habit "more/less engaged"
 * needs a split by real elapsed time instead: events before vs. after
 * the midpoint of the actual time range, so a genuine burst of recent
 * activity shows up as an uneven split, not silently absorbed into two
 * equal-sized halves.
 */
function splitByTimeMidpoint(items, getDate) {
  if (items.length < MIN_HALF_SIZE * 2) {
    return null;
  }
  const first = getDate(items[0]).getTime();
  const last = getDate(items[items.length - 1]).getTime();
  if (first === last) {
    return null;
  }
  const midpoint = (first + last) / 2;
  const earlier = items.filter((item) => getDate(item).getTime() <= midpoint);
  const recent = items.filter((item) => getDate(item).getTime() > midpoint);
  if (earlier.length < MIN_HALF_SIZE || recent.length < MIN_HALF_SIZE) {
    return null;
  }
  return { earlier, recent };
}

function describeTrend(earlierValue, recentValue, { higherIsBetter }) {
  const delta = recentValue - earlierValue;
  const threshold = 5;
  if (Math.abs(delta) <= threshold) return "stable";
  const rose = delta > 0;
  if (higherIsBetter) return rose ? "improving" : "declining";
  return rose ? "declining" : "improving";
}

/**
 * "How their understanding evolved": the real ratio of DONT_UNDERSTAND
 * feedback among all feedback, compared earlier-half vs. recent-half,
 * chronologically. A falling ratio is educationally framed as
 * "improving" — never as a score.
 */
async function computeUnderstandingProgress() {
  const prisma = getPrismaClient();
  const feedbackRows = await prisma.recommendationFeedback.findMany({ orderBy: { createdAt: "asc" } });
  const split = splitChronological(feedbackRows);
  if (!split) {
    return { hasEnoughData: false, message: `More feedback needed to show how your understanding has evolved (${feedbackRows.length} recorded so far, need at least ${MIN_HALF_SIZE * 2}).` };
  }

  const ratio = (rows) => rows.filter((row) => row.feedbackType === "DONT_UNDERSTAND").length / rows.length;
  const earlierRatio = Math.round(ratio(split.earlier) * 100);
  const recentRatio = Math.round(ratio(split.recent) * 100);

  return {
    hasEnoughData: true,
    earlierDontUnderstandRatePct: earlierRatio,
    recentDontUnderstandRatePct: recentRatio,
    trend: describeTrend(earlierRatio, recentRatio, { higherIsBetter: false }),
  };
}

/**
 * "How their reading habits evolved": real UserMemoryEvent counts
 * (RECOMMENDATION_VIEWED + THEME_VIEWED together — both are genuine
 * reading engagement), earlier-half vs. recent-half by real timestamp.
 * More engagement isn't labeled "better" or "worse" — just described.
 */
async function computeReadingHabitsProgress() {
  const prisma = getPrismaClient();
  const events = await prisma.userMemoryEvent.findMany({ orderBy: { createdAt: "asc" } });
  const split = splitByTimeMidpoint(events, (event) => event.createdAt);
  if (!split) {
    return { hasEnoughData: false, message: `More reading activity needed to show how your habits have evolved (${events.length} recorded so far, need at least ${MIN_HALF_SIZE * 2} spread across time).` };
  }

  return {
    hasEnoughData: true,
    earlierViewCount: split.earlier.length,
    recentViewCount: split.recent.length,
    trend: split.recent.length > split.earlier.length ? "more engaged" : split.recent.length < split.earlier.length ? "less engaged" : "stable",
  };
}

/**
 * "How their portfolio discipline evolved": the real cash-reserve ratio
 * (cashBalance / totalValue) across PerformanceSnapshot history — holding
 * some cash reserve rather than being fully concentrated is the one real,
 * already-persisted signal available for a discipline-adjacent trend,
 * named exactly as "cash reserve," not oversold as a broader discipline
 * score this data can't actually support.
 */
async function computePortfolioDisciplineProgress() {
  const timeline = await portfolioEngineService.getPerformanceTimeline({});
  const withRatio = timeline
    .filter((snapshot) => snapshot.totalValue > 0)
    .map((snapshot) => ({ ...snapshot, cashRatioPct: Math.round((snapshot.cashBalance / snapshot.totalValue) * 100) }));

  const split = splitChronological(withRatio);
  if (!split) {
    return { hasEnoughData: false, message: `More portfolio history needed to show how your discipline has evolved (${withRatio.length} snapshots so far, need at least ${MIN_HALF_SIZE * 2}).` };
  }

  const average = (rows) => rows.reduce((sum, row) => sum + row.cashRatioPct, 0) / rows.length;
  const earlierCashRatioPct = Math.round(average(split.earlier));
  const recentCashRatioPct = Math.round(average(split.recent));

  return {
    hasEnoughData: true,
    earlierCashRatioPct,
    recentCashRatioPct,
    trend: describeTrend(earlierCashRatioPct, recentCashRatioPct, { higherIsBetter: true }),
  };
}

async function computePersonalProgress() {
  const [understanding, readingHabits, portfolioDiscipline] = await Promise.all([
    computeUnderstandingProgress().catch(() => ({ hasEnoughData: false, message: "Understanding progress unavailable right now." })),
    computeReadingHabitsProgress().catch(() => ({ hasEnoughData: false, message: "Reading habits progress unavailable right now." })),
    computePortfolioDisciplineProgress().catch(() => ({ hasEnoughData: false, message: "Portfolio discipline progress unavailable right now." })),
  ]);

  return { understanding, readingHabits, portfolioDiscipline, generatedAt: new Date().toISOString() };
}

module.exports = {
  computePersonalProgress,
  computeUnderstandingProgress,
  computeReadingHabitsProgress,
  computePortfolioDisciplineProgress,
};
