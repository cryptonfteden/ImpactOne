// Phase MACRO-AGENT-001 — pure parsing of FRED's real, free, no-auth
// CSV export endpoint (https://fred.stlouisfed.org/graph/fredgraph.csv?id=<seriesId>),
// the same real endpoint `altDataService.js`'s own `fetchFredSeries()`
// already uses — reused here as a fresh, dedicated client (not that
// file's own `getMacroData()`) because this mission's own "never
// fabricate macro values" requirement is stricter than that service's
// existing, disclosed-but-fabricated `fallbackMacroRegime()` — this
// client never invents a value; every failure is honestly `null`.
//
// Real CSV shape: header row `observation_date,<seriesId>`, then one
// real `date,value` row per real reporting period, oldest-first. FRED's
// own convention marks a real not-yet-published period with a literal
// "." — parsed here as `null`, never coerced to 0 or dropped silently.
function parseFredCsv(csvText) {
  const lines = csvText.trim().split("\n");
  const observations = [];
  for (let i = 1; i < lines.length; i += 1) {
    const [date, rawValue] = lines[i].split(",");
    if (!date) continue;
    const value = rawValue === "." || rawValue === undefined ? null : Number(rawValue);
    observations.push({ date, value: Number.isFinite(value) ? value : null });
  }
  return observations;
}

/**
 * Finds the real observation closest to `targetDate` within
 * `toleranceDays` — used for a real, approximate year-over-year
 * comparison against monthly/quarterly series that never align to an
 * exact 365-day offset.
 * @param {Array<{date:string, value:number|null}>} observations - oldest-first
 * @param {string} targetDate - YYYY-MM-DD
 * @param {number} toleranceDays
 * @returns {{date:string, value:number|null} | null}
 */
function findObservationNear(observations, targetDate, toleranceDays = 45) {
  const target = new Date(`${targetDate}T00:00:00Z`).getTime();
  let closest = null;
  let closestDiff = Infinity;
  for (const observation of observations) {
    if (observation.value === null) continue;
    const diff = Math.abs(new Date(`${observation.date}T00:00:00Z`).getTime() - target);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = observation;
    }
  }
  if (!closest || closestDiff > toleranceDays * 86400000) return null;
  return closest;
}

module.exports = { parseFredCsv, findObservationNear };
