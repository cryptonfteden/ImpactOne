// Phase ETF-FLOW-AGENT-001 — overall "Confidence" (0-100), a disclosed,
// hand-set weighted formula (never a naive average): data availability
// (30 pts), whether the analyzed ETF is the symbol itself (direct, 20
// pts) or an indirect sector proxy for a stock symbol (10 pts — a real,
// disclosed lower-confidence case since it's one hop removed from the
// requested symbol), real bar sample size (up to 20 pts), real flow
// persistence corroboration (up to 15 pts), and a fixed, disclosed
// penalty (10 pts) for the two structurally-always-unavailable
// dimensions in this environment (fund concentration, stock ETF
// exposure) — the same "unavailable data honestly discounts
// confidence" discipline `symbol-sentiment`'s social-unavailability
// penalty already established.
const BASE_AVAILABLE = 30;
const DIRECT_ETF_BONUS = 20;
const INDIRECT_PROXY_BONUS = 10;
const MAX_SAMPLE_BONUS = 20;
const SAMPLE_CAP_DAYS = 60;
const HIGH_PERSISTENCE_BONUS = 15;
const MODERATE_PERSISTENCE_BONUS = 8;
const STRUCTURAL_UNAVAILABLE_PENALTY = 10;

/**
 * @param {{ dataAvailable: boolean, isDirectEtf: boolean, barsCount: number, persistenceClassification: string }} params
 * @returns {{ confidence: number, components: object }}
 */
function computeConfidence({ dataAvailable, isDirectEtf, barsCount, persistenceClassification }) {
  if (!dataAvailable) {
    return { confidence: 0, components: { base: 0, directnessBonus: 0, sampleBonus: 0, persistenceBonus: 0, structuralPenalty: 0 } };
  }

  const base = BASE_AVAILABLE;
  const directnessBonus = isDirectEtf ? DIRECT_ETF_BONUS : INDIRECT_PROXY_BONUS;
  const sampleBonus = Math.round((Math.min(barsCount, SAMPLE_CAP_DAYS) / SAMPLE_CAP_DAYS) * MAX_SAMPLE_BONUS);
  const persistenceBonus = persistenceClassification === "HIGH" ? HIGH_PERSISTENCE_BONUS : persistenceClassification === "MODERATE" ? MODERATE_PERSISTENCE_BONUS : 0;
  const structuralPenalty = STRUCTURAL_UNAVAILABLE_PENALTY;

  const confidence = Math.round(Math.max(0, Math.min(100, base + directnessBonus + sampleBonus + persistenceBonus - structuralPenalty)));

  return { confidence, components: { base, directnessBonus, sampleBonus, persistenceBonus, structuralPenalty } };
}

module.exports = { computeConfidence };
