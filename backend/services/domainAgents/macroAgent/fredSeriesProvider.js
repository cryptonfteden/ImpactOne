// Phase MACRO-AGENT-001 — the real, per-series FRED provider. Fetches
// one real FRED series' full CSV history, honestly reporting
// unavailable on any real fetch failure or empty/all-missing response
// — never a fabricated fallback value (see fredCsvParser.js's own
// header for why this deliberately doesn't reuse altDataService.js's
// existing, disclosed-fabricated fallback path).
const axios = require("axios");
const { parseFredCsv, findObservationNear } = require("./fredCsvParser");

const REQUEST_TIMEOUT_MS = 10000;

function emptySeriesMetrics(seriesId, reason) {
  return { seriesId, dataAvailable: false, unavailableReason: reason, latest: null, priorYearAgo: null, changeYoY: null, observations: [] };
}

/**
 * @param {string} seriesId - a real FRED series id (e.g. "FEDFUNDS", "CPIAUCSL")
 * @returns {Promise<{ seriesId: string, dataAvailable: boolean, unavailableReason: string|null, latest: {date,value}|null, priorYearAgo: {date,value}|null, changeYoY: number|null, observations: Array }>}
 */
async function fetchFredSeries(seriesId) {
  try {
    const response = await axios.get("https://fred.stlouisfed.org/graph/fredgraph.csv", { params: { id: seriesId }, timeout: REQUEST_TIMEOUT_MS });
    const observations = parseFredCsv(response.data);
    const withValues = observations.filter((observation) => observation.value !== null);

    if (!withValues.length) {
      return emptySeriesMetrics(seriesId, `FRED returned no real usable observations for "${seriesId}".`);
    }

    const latest = withValues[withValues.length - 1];
    const oneYearAgoDate = new Date(`${latest.date}T00:00:00Z`);
    oneYearAgoDate.setUTCFullYear(oneYearAgoDate.getUTCFullYear() - 1);
    const priorYearAgo = findObservationNear(withValues, oneYearAgoDate.toISOString().slice(0, 10));

    const changeYoY =
      priorYearAgo && priorYearAgo.value !== 0
        ? Math.round(((latest.value - priorYearAgo.value) / Math.abs(priorYearAgo.value)) * 10000) / 100
        : null;

    return { seriesId, dataAvailable: true, unavailableReason: null, latest, priorYearAgo, changeYoY, observations: withValues };
  } catch (error) {
    return emptySeriesMetrics(seriesId, `FRED request failed for "${seriesId}": ${error.message}`);
  }
}

module.exports = { fetchFredSeries, emptySeriesMetrics };
