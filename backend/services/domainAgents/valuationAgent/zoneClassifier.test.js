const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyZones, classifyValuationStatus, passesValueTrapGate } = require("./zoneClassifier");

test("classifyValuationStatus: null discount is honestly UNKNOWN, never guessed", () => {
  assert.equal(classifyValuationStatus(null), "UNKNOWN");
});

test("classifyValuationStatus: a real discount above the fairly-valued band is UNDERVALUED", () => {
  assert.equal(classifyValuationStatus(0.2), "UNDERVALUED");
});

test("classifyValuationStatus: a real negative discount beyond the band is OVERVALUED", () => {
  assert.equal(classifyValuationStatus(-0.2), "OVERVALUED");
});

test("classifyValuationStatus: a small discount within +/-5% is FAIRLY_VALUED, not a coin-flip label from noise", () => {
  assert.equal(classifyValuationStatus(0.02), "FAIRLY_VALUED");
  assert.equal(classifyValuationStatus(-0.02), "FAIRLY_VALUED");
});

test("passesValueTrapGate returns null (undetermined, never assumed) when ROIC or WACC is unavailable", () => {
  assert.equal(passesValueTrapGate(null, 8, 0.8), null);
  assert.equal(passesValueTrapGate(10, null, 0.8), null);
});

test("passesValueTrapGate: ROIC at or above the floor multiplier passes", () => {
  assert.equal(passesValueTrapGate(6.4, 8, 0.8), true); // 6.4 = 8*0.8 exactly
  assert.equal(passesValueTrapGate(3, 8, 0.8), false);
});

test("a large discount with high confidence and a passing (or unavailable) value-trap gate qualifies for Attractive Range", () => {
  const result = classifyZones({ discountToFairValue: 0.15, valuationConfidence: 50, methodAgreementScore: 50, roic: 12, wacc: 8 });
  assert.equal(result.attractiveRange, true);
  assert.equal(result.attractiveRangeCaveat, null);
});

test("Attractive Range is denied below the confidence floor even with a large discount", () => {
  const result = classifyZones({ discountToFairValue: 0.3, valuationConfidence: 20, methodAgreementScore: 90, roic: 12, wacc: 8 });
  assert.equal(result.attractiveRange, false);
});

test("Attractive Range is denied below the discount threshold even with high confidence", () => {
  const result = classifyZones({ discountToFairValue: 0.03, valuationConfidence: 80, methodAgreementScore: 90, roic: 12, wacc: 8 });
  assert.equal(result.attractiveRange, false);
});

test("a real value-trap failure (ROIC well below WACC) is still shown but carries an explicit, honest caveat rather than a clean Attractive Range label", () => {
  const result = classifyZones({ discountToFairValue: 0.15, valuationConfidence: 50, methodAgreementScore: 50, roic: 2, wacc: 8 });
  assert.equal(result.attractiveRange, false);
  assert.match(result.attractiveRangeCaveat, /below its sector's typical cost of capital/);
});

test("when ROIC/WACC data is unavailable, the discount is still shown as Attractive Range-eligible but with an honest disclosure that the value-trap check could not be performed", () => {
  const result = classifyZones({ discountToFairValue: 0.15, valuationConfidence: 50, methodAgreementScore: 50, roic: null, wacc: null });
  assert.equal(result.attractiveRange, true);
  assert.match(result.attractiveRangeCaveat, /could not be performed/);
  assert.equal(result.valueTrapCheckPerformed, false);
});

test("High Margin of Safety requires ALL FOUR gates: threshold, confidence, method agreement, and genuine ROIC>WACC", () => {
  const allPass = classifyZones({ discountToFairValue: 0.3, valuationConfidence: 70, methodAgreementScore: 70, roic: 12, wacc: 8 });
  assert.equal(allPass.highMarginOfSafety, true);
});

test("High Margin of Safety is denied if the discount only clears the standard (not the stricter) threshold", () => {
  const result = classifyZones({ discountToFairValue: 0.15, valuationConfidence: 70, methodAgreementScore: 70, roic: 12, wacc: 8 });
  assert.equal(result.highMarginOfSafety, false);
});

test("High Margin of Safety is denied without genuine ROIC>WACC evidence, even if ROIC merely equals WACC", () => {
  const result = classifyZones({ discountToFairValue: 0.3, valuationConfidence: 70, methodAgreementScore: 70, roic: 8, wacc: 8 });
  assert.equal(result.highMarginOfSafety, false);
});

test("High Margin of Safety is NEVER eligible when ROIC/WACC data is unavailable — the higher bar requires genuine evidence, missing data can't satisfy it", () => {
  const result = classifyZones({ discountToFairValue: 0.3, valuationConfidence: 70, methodAgreementScore: 70, roic: null, wacc: null });
  assert.equal(result.highMarginOfSafety, false);
});

test("High Margin of Safety is denied when the underlying methods substantially disagree, even if the headline discount is large", () => {
  const result = classifyZones({ discountToFairValue: 0.3, valuationConfidence: 70, methodAgreementScore: 20, roic: 12, wacc: 8 });
  assert.equal(result.highMarginOfSafety, false);
});
