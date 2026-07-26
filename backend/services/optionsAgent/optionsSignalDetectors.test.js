require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const detectors = require("./optionsSignalDetectors");

function makePrint({ exchange = "CBOE", tradeTimestamp = "2026-07-25T14:30:00.000Z", size = 100, price = 12.5, aggressorSide = "BUY", notionalValue = 125000 } = {}) {
  return { exchange, tradeTimestamp: new Date(tradeTimestamp), size, price, aggressorSide, notionalValue };
}

test("CALL anomaly: detectCallPutSkew fires bullish-leaning when call volume is far above the symbol's own baseline ratio", () => {
  const result = detectors.detectCallPutSkew({ callVolume: 9000, putVolume: 1000, baselineRatioMean: 1.2, baselineRatioStdDev: 0.3 });
  assert.ok(result);
  assert.equal(result.signalType, "CALL_PUT_SKEW");
  assert.equal(result.direction, "BULLISH_LEANING");
  assert.ok(result.putCallSkewZScore > 2);
});

test("PUT anomaly: detectCallPutSkew fires bearish-leaning when put volume dominates far past the symbol's own baseline ratio", () => {
  const result = detectors.detectCallPutSkew({ callVolume: 500, putVolume: 9500, baselineRatioMean: 1.2, baselineRatioStdDev: 0.3 });
  assert.ok(result);
  assert.equal(result.direction, "BEARISH_LEANING");
  assert.ok(result.putCallSkewZScore < -2);
});

test("CALL/PUT skew: no signal when today's ratio is within the symbol's own normal baseline range", () => {
  const result = detectors.detectCallPutSkew({ callVolume: 1250, putVolume: 1000, baselineRatioMean: 1.2, baselineRatioStdDev: 0.3 });
  assert.equal(result, null);
});

test("CALL/PUT skew: honestly reports insufficient baseline history rather than fabricating a Z-score", () => {
  const result = detectors.detectCallPutSkew({ callVolume: 9000, putVolume: 1000, baselineRatioMean: null, baselineRatioStdDev: null });
  assert.deepEqual(result, { signalType: null, insufficientBaselineHistory: true, putCallSkewZScore: null });
});

test("volume vs. baseline: honestly reports insufficient baseline history during the bootstrap window", () => {
  const result = detectors.detectVolumeBaseline({ totalVolume: 5000, baselineVolume: null });
  assert.deepEqual(result, { signalType: null, insufficientBaselineHistory: true, volumeMultiple: null });
});

test("volume vs. baseline: fires only once the trigger multiple AND the absolute-size floor are both cleared", () => {
  const tiny = detectors.detectVolumeBaseline({ totalVolume: 15, baselineVolume: 1.5 }); // 10x multiple, but tiny absolute size
  assert.equal(tiny, null);
  const real = detectors.detectVolumeBaseline({ totalVolume: 5000, baselineVolume: 500 }); // 10x, real size
  assert.ok(real);
  assert.equal(real.signalType, "VOLUME_SPIKE");
  assert.equal(real.volumeMultiple, 10);
});

test("sweep detection: fires for a real cross-exchange, single-aggressor-side, tight-window cluster", () => {
  const prints = [
    makePrint({ exchange: "CBOE", tradeTimestamp: "2026-07-25T14:30:00.000Z", size: 400, aggressorSide: "BUY" }),
    makePrint({ exchange: "ISE", tradeTimestamp: "2026-07-25T14:30:00.800Z", size: 300, aggressorSide: "BUY" }),
    makePrint({ exchange: "PHLX", tradeTimestamp: "2026-07-25T14:30:01.500Z", size: 500, aggressorSide: "BUY" }),
  ];
  const result = detectors.detectSweep(prints);
  assert.ok(result);
  assert.equal(result.signalType, "SWEEP");
  assert.equal(result.sweepExchangeCount, 3);
  assert.equal(result.aggressorSide, "BUY");
  assert.equal(result.totalSize, 1200);
});

test("sweep detection: no signal when only one exchange is represented", () => {
  const prints = [makePrint({ exchange: "CBOE", size: 1000 }), makePrint({ exchange: "CBOE", size: 1000 })];
  assert.equal(detectors.detectSweep(prints), null);
});

test("sweep detection: no signal when the cluster spans longer than the tight time window", () => {
  const prints = [
    makePrint({ exchange: "CBOE", tradeTimestamp: "2026-07-25T14:30:00.000Z", size: 400 }),
    makePrint({ exchange: "ISE", tradeTimestamp: "2026-07-25T14:30:10.000Z", size: 400 }), // 10s apart, not a sweep
  ];
  assert.equal(detectors.detectSweep(prints), null);
});

test("sweep detection: never guesses a sweep from a mixed/unknown aggressor-side cluster", () => {
  const prints = [
    makePrint({ exchange: "CBOE", size: 400, aggressorSide: "BUY" }),
    makePrint({ exchange: "ISE", size: 400, aggressorSide: "SELL" }),
  ];
  assert.equal(detectors.detectSweep(prints), null);
});

test("block detection: fires for a single print clearing the size threshold", () => {
  const prints = [makePrint({ size: 250, notionalValue: 300000, aggressorSide: "SELL" })];
  const result = detectors.detectBlock(prints);
  assert.ok(result);
  assert.equal(result.signalType, "BLOCK_TRADE");
  assert.equal(result.largestSinglePrintSize, 250);
  assert.equal(result.aggressorSide, "SELL");
});

test("block detection: fires for a single print clearing only the notional threshold", () => {
  const prints = [makePrint({ size: 10, notionalValue: 150000 })];
  const result = detectors.detectBlock(prints);
  assert.ok(result);
});

test("block detection: no signal when no print clears either threshold", () => {
  const prints = [makePrint({ size: 5, notionalValue: 6000 })];
  assert.equal(detectors.detectBlock(prints), null);
});

test("OI pending state: current session OI not yet available is always PENDING, never guessed", () => {
  const result = detectors.detectOiConfirmation({ priorSessionOi: 3000, currentSessionOi: null });
  assert.deepEqual(result, { oiConfirmationStatus: "PENDING", openInterestDelta: null });
});

test("OI confirmed state: a real OI increase confirms new positioning", () => {
  const result = detectors.detectOiConfirmation({ priorSessionOi: 3000, currentSessionOi: 4200 });
  assert.equal(result.oiConfirmationStatus, "CONFIRMED_NEW_POSITION");
  assert.equal(result.openInterestDelta, 1200);
});

test("OI confirmed state: a real OI decrease confirms closing/rolling activity", () => {
  const result = detectors.detectOiConfirmation({ priorSessionOi: 3000, currentSessionOi: 2100 });
  assert.equal(result.oiConfirmationStatus, "CONFIRMED_CLOSING");
  assert.equal(result.openInterestDelta, -900);
});

test("OI confirmation: honestly UNCONFIRMED when there is no real prior session to compare against", () => {
  const result = detectors.detectOiConfirmation({ priorSessionOi: null, currentSessionOi: 4200 });
  assert.equal(result.oiConfirmationStatus, "UNCONFIRMED");
});
