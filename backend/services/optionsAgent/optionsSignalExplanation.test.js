require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildOptionsSignalExplanation } = require("./optionsSignalExplanation");

test("buildOptionsSignalExplanation requires the specific per-signal fields, never a generic template", () => {
  assert.throws(() => buildOptionsSignalExplanation({}), /requires symbol, optionType, strike, expiry, and signalType/);
});

test("buildOptionsSignalExplanation produces a per-signal sweep explanation with real numbers, not boilerplate", () => {
  const text = buildOptionsSignalExplanation({
    symbol: "NVDA",
    optionType: "CALL",
    strike: 150,
    expiry: new Date("2026-08-21"),
    signalType: "SWEEP",
    volumeMultiple: 8.4,
    notionalValue: 2184000,
    sweepExchangeCount: 3,
    oiConfirmationStatus: "PENDING",
    aggressorSide: "BUY",
  });
  assert.match(text, /NVDA/);
  assert.match(text, /\$150/);
  assert.match(text, /8\.4x/);
  assert.match(text, /3 exchanges/);
  assert.match(text, /pending until tomorrow's session/);
});

test("buildOptionsSignalExplanation produces a genuinely different explanation for a different signal — no shared template collision", () => {
  const textA = buildOptionsSignalExplanation({ symbol: "NVDA", optionType: "CALL", strike: 150, expiry: new Date("2026-08-21"), signalType: "VOLUME_SPIKE", volumeMultiple: 8.4, oiConfirmationStatus: "PENDING" });
  const textB = buildOptionsSignalExplanation({ symbol: "META", optionType: "PUT", strike: 300, expiry: new Date("2026-09-18"), signalType: "VOLUME_SPIKE", volumeMultiple: 6.1, oiConfirmationStatus: "CONFIRMED_CLOSING" });
  assert.notEqual(textA, textB);
  assert.match(textA, /NVDA/);
  assert.match(textB, /META/);
  assert.match(textB, /closing or rolling activity/);
});

test("buildOptionsSignalExplanation omits fields the signal genuinely doesn't have, never fabricating an N/A placeholder", () => {
  const text = buildOptionsSignalExplanation({ symbol: "NVDA", optionType: "PUT", strike: 100, expiry: new Date("2026-08-21"), signalType: "BLOCK_TRADE" });
  assert.doesNotMatch(text, /N\/A/);
  assert.match(text, /block trade/);
});
