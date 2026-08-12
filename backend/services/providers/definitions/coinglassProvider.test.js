require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { toCryptoDerivativesEvent } = require("./coinglassProvider");

test("crypto derivatives provider labels Binance data as single-exchange", () => {
  const event = toCryptoDerivativesEvent("BTCUSDT", { fundingRate: "0.0001", fundingTime: 1786118400000 }, { openInterest: "12345.6", time: 1786118400000 });
  assert.equal(event.eventType, "binance-futures-derivatives");
  assert.match(event.summary, /0.0100%/);
  assert.match(event.summary, /single-exchange/);
  assert.equal(event.rawReference.openInterest, 12345.6);
});
