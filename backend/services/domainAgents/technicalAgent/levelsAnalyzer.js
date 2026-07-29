// Phase TECHNICAL-AGENT-001 — "Support Levels" / "Resistance Levels"
// (plural, per the mission's own spec) — built from real, already-
// computed sources: the 60-day range extremes AND the recent local
// pivot highs/lows (technicalIndicators.detectSupportResistance's own
// richer output, not just the single extremes
// technicalIntelligenceService's own signal surfaces), plus real
// Fibonacci retracement levels, each one labeled with its real source
// — never an invented level.
function currentPriceFrom(signals) {
  const value = signals?.trend?.calculationInputs?.lastClose;
  return Number.isFinite(value) ? value : null;
}

function dedupeSorted(levels, { ascending }) {
  const seen = new Map();
  for (const level of levels) {
    const key = Math.round(level.price * 100) / 100;
    if (!seen.has(key)) seen.set(key, level);
  }
  return Array.from(seen.values()).sort((a, b) => (ascending ? a.price - b.price : b.price - a.price));
}

/**
 * @param {object} metrics - TechnicalMetrics (signals, supportResistanceDetail)
 * @returns {{ supportLevels: Array<{price:number, source:string}>, resistanceLevels: Array<{price:number, source:string}> }}
 */
function analyzeLevels(metrics) {
  const currentPrice = currentPriceFrom(metrics.signals);
  const detail = metrics.supportResistanceDetail;
  const fibLevels = metrics.signals.fibonacciRetracement?.levels || [];

  const rawResistance = [];
  const rawSupport = [];

  if (detail) {
    rawResistance.push({ price: detail.resistance, source: "60-day range high" });
    rawSupport.push({ price: detail.support, source: "60-day range low" });
    for (const price of detail.recentPivotHighs || []) rawResistance.push({ price, source: "recent pivot high" });
    for (const price of detail.recentPivotLows || []) rawSupport.push({ price, source: "recent pivot low" });
  }

  if (currentPrice !== null) {
    for (const level of fibLevels) {
      const label = `Fibonacci ${level.ratio} retracement`;
      if (level.price > currentPrice) rawResistance.push({ price: level.price, source: label });
      else if (level.price < currentPrice) rawSupport.push({ price: level.price, source: label });
    }
  }

  const resistanceLevels = dedupeSorted(
    currentPrice !== null ? rawResistance.filter((level) => level.price >= currentPrice) : rawResistance,
    { ascending: true }
  );
  const supportLevels = dedupeSorted(
    currentPrice !== null ? rawSupport.filter((level) => level.price <= currentPrice) : rawSupport,
    { ascending: false }
  );

  return { supportLevels, resistanceLevels };
}

module.exports = { analyzeLevels, currentPriceFrom };
