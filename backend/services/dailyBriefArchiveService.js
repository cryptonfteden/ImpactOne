const archiveRepository = require("./dailyBriefArchiveRepository");

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

/**
 * Persists a lightweight snapshot of a freshly-computed daily brief. Called
 * by dailyBriefService only on a cache miss, so the archive fills in from
 * real usage over time rather than being seeded.
 */
async function captureTodaySnapshot(brief) {
  if (!brief) {
    return null;
  }

  return archiveRepository.upsertTodaySnapshot({
    sessionType: brief.sessionType || "morning",
    executiveSummary: brief.aiSummary?.executiveSummary || "No summary available.",
    confidenceScore: round2(brief.aiSummary?.confidenceScore),
    topEvent: brief.topMarketMovingEvents?.[0]?.event || null,
  });
}

/**
 * Compares two lightweight archive entries. This is intentionally simpler
 * than dailyBriefService.buildChangedSinceYesterday, which operates on full
 * brief objects (relevanceItems, topRisks) that the archive doesn't store —
 * the archive is a preview, not a full historical replay.
 */
function compareSnapshots(current, previous) {
  if (!previous) {
    return "Earliest entry in the archive.";
  }

  const changes = [];
  if (current.topEvent && previous.topEvent && current.topEvent !== previous.topEvent) {
    changes.push(`Top event shifted from "${previous.topEvent}" to "${current.topEvent}".`);
  }

  const confidenceDelta = round2(Number(current.confidenceScore) - Number(previous.confidenceScore));
  if (Math.abs(confidenceDelta) >= 1) {
    changes.push(`Confidence ${confidenceDelta >= 0 ? "rose" : "fell"} ${Math.abs(confidenceDelta)} points vs. the prior entry.`);
  }

  return changes.length ? changes.join(" ") : "No material change vs. the prior entry.";
}

async function getArchive(limit = 7) {
  const snapshots = await archiveRepository.getRecentSnapshots(limit);
  return snapshots.map((snapshot, index) => {
    const previous = snapshots[index + 1] || null;
    return {
      date: snapshot.date,
      sessionType: snapshot.sessionType,
      executiveSummary: snapshot.executiveSummary,
      confidenceScore: round2(snapshot.confidenceScore),
      topEvent: snapshot.topEvent,
      capturedAt: snapshot.capturedAt,
      comparedToPrevious: compareSnapshots(snapshot, previous),
    };
  });
}

module.exports = { captureTodaySnapshot, compareSnapshots, getArchive };
