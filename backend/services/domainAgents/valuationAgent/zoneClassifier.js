// Phase VALUATION-AGENT-001 — implements FAIR_VALUE_METHODOLOGY.md §2/§3's
// Buy Zone / Strong Buy Zone gating, exposed under this mission's own
// non-directive output names ("Attractive Range" / "High Margin of
// Safety") per §4's naming governance section — the internal concept is
// identical, only the label differs, and neither name nor any field
// here is/uses `action`/`decision`/`verdict`/`recommendation`
// (canonicalVerdict.js's FORBIDDEN_COMMITTEE_KEYS).
const FAIRLY_VALUED_BAND = 0.05; // +/-5% around fair value counts as "fairly valued," not a coin-flip under/over label
const ATTRACTIVE_RANGE_THRESHOLD = 0.1; // proposed 10-15% in FAIR_VALUE_METHODOLOGY.md §2.1
const HIGH_MARGIN_OF_SAFETY_THRESHOLD = 0.25; // proposed 25-30% in §3.1
const MINIMUM_CONFIDENCE_FOR_ATTRACTIVE_RANGE = 40; // VALUATION_SCORING_MODEL.md §1.3
const MINIMUM_CONFIDENCE_FOR_HIGH_MARGIN_OF_SAFETY = 65; // §1.3
const VALUE_TRAP_ROIC_FLOOR_MULTIPLIER = 0.8; // §2.2's proposed multiplier
const MINIMUM_METHOD_AGREEMENT_FOR_HIGH_MARGIN_OF_SAFETY = 60; // a disclosed, hand-set threshold for §3.1's "reasonably close" requirement

function classifyValuationStatus(discountToFairValue) {
  if (discountToFairValue === null) return "UNKNOWN";
  if (discountToFairValue >= FAIRLY_VALUED_BAND) return "UNDERVALUED";
  if (discountToFairValue <= -FAIRLY_VALUED_BAND) return "OVERVALUED";
  return "FAIRLY_VALUED";
}

/**
 * §2.2's value-trap gate. Returns `null` (check not performed — honestly
 * disclosed, never silently assumed to pass) when either ROIC or the
 * WACC proxy is unavailable; otherwise a real boolean.
 */
function passesValueTrapGate(roic, wacc, floorMultiplier) {
  if (!Number.isFinite(roic) || !Number.isFinite(wacc)) return null;
  return roic >= wacc * floorMultiplier;
}

/**
 * @returns {{
 *   valuationStatus: string,
 *   attractiveRange: boolean,
 *   attractiveRangeCaveat: string|null,
 *   highMarginOfSafety: boolean,
 *   valueTrapCheckPerformed: boolean,
 * }}
 */
function classifyZones({ discountToFairValue, valuationConfidence, methodAgreementScore, roic, wacc }) {
  const valuationStatus = classifyValuationStatus(discountToFairValue);

  const meetsAttractiveThreshold = discountToFairValue !== null && discountToFairValue >= ATTRACTIVE_RANGE_THRESHOLD;
  const meetsAttractiveConfidence = valuationConfidence >= MINIMUM_CONFIDENCE_FOR_ATTRACTIVE_RANGE;
  const attractiveValueTrapResult = passesValueTrapGate(roic, wacc, VALUE_TRAP_ROIC_FLOOR_MULTIPLIER);
  const valueTrapCheckPerformed = attractiveValueTrapResult !== null;
  const attractiveValueTrapOk = attractiveValueTrapResult === null ? true : attractiveValueTrapResult; // undetermined never blocks — it's disclosed as a caveat instead, never silently assumed to pass or fail

  const attractiveRange = meetsAttractiveThreshold && meetsAttractiveConfidence && attractiveValueTrapOk;

  let attractiveRangeCaveat = null;
  if (meetsAttractiveThreshold && meetsAttractiveConfidence) {
    if (attractiveValueTrapResult === false) {
      attractiveRangeCaveat = "Trades at a discount to estimated fair value, but return on invested capital is below its sector's typical cost of capital — a discount alone may not indicate an attractive opportunity.";
    } else if (attractiveValueTrapResult === null) {
      attractiveRangeCaveat = "Trades at a discount to estimated fair value; the return-on-invested-capital value-trap check could not be performed (ROIC or a cost-of-capital estimate is unavailable for this symbol).";
    }
  }

  const strictValueTrapResult = Number.isFinite(roic) && Number.isFinite(wacc) ? roic > wacc : null;
  const highMarginOfSafety =
    discountToFairValue !== null &&
    discountToFairValue >= HIGH_MARGIN_OF_SAFETY_THRESHOLD &&
    valuationConfidence >= MINIMUM_CONFIDENCE_FOR_HIGH_MARGIN_OF_SAFETY &&
    methodAgreementScore >= MINIMUM_METHOD_AGREEMENT_FOR_HIGH_MARGIN_OF_SAFETY &&
    strictValueTrapResult === true; // requires genuine, real ROIC>WACC evidence — never eligible on missing data

  return { valuationStatus, attractiveRange, attractiveRangeCaveat, highMarginOfSafety, valueTrapCheckPerformed };
}

module.exports = {
  classifyZones,
  classifyValuationStatus,
  passesValueTrapGate,
  FAIRLY_VALUED_BAND,
  ATTRACTIVE_RANGE_THRESHOLD,
  HIGH_MARGIN_OF_SAFETY_THRESHOLD,
  MINIMUM_CONFIDENCE_FOR_ATTRACTIVE_RANGE,
  MINIMUM_CONFIDENCE_FOR_HIGH_MARGIN_OF_SAFETY,
  VALUE_TRAP_ROIC_FLOOR_MULTIPLIER,
  MINIMUM_METHOD_AGREEMENT_FOR_HIGH_MARGIN_OF_SAFETY,
};
