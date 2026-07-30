// Phase NEWS-AGENT-001 — "Event persistence". Real, disclosed measure
// of how many distinct real calendar days (in the real fetched
// lookback window) had at least one real article — a story still
// being covered across multiple real days is a genuinely persisting
// event, not a one-off report.
/**
 * @param {Array<{publishedAt:string}>} articles - real articles
 * @returns {{ distinctDayCount: number, persistenceClassification: "SINGLE_DAY"|"MULTI_DAY"|"SUSTAINED"|"UNKNOWN" }}
 */
function analyzePersistence(articles) {
  if (!articles.length) {
    return { distinctDayCount: 0, persistenceClassification: "UNKNOWN" };
  }

  const days = new Set(
    articles
      .map((article) => new Date(article.publishedAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => date.toISOString().slice(0, 10))
  );

  const distinctDayCount = days.size;
  let persistenceClassification = "SINGLE_DAY";
  if (distinctDayCount >= 5) persistenceClassification = "SUSTAINED";
  else if (distinctDayCount >= 2) persistenceClassification = "MULTI_DAY";

  return { distinctDayCount, persistenceClassification };
}

module.exports = { analyzePersistence };
