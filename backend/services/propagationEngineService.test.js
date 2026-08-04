const test = require("node:test");
const assert = require("node:assert/strict");

const { propagateByTheme } = require("./propagationEngineService");

test("AI-TRUST-001 — an event matching no specific theme keyword honestly returns zero propagation steps, never a fabricated generic 'Macro shock' chain", () => {
  const result = propagateByTheme("AAPL earnings");
  assert.deepEqual(result, [], "an event with no genuine theme match must not fabricate a generic propagation chain");
});

test("AI-TRUST-001 — two genuinely unrelated, keyword-less events both return the same honest empty result, not a shared fabricated chain", () => {
  const a = propagateByTheme("AAPL earnings");
  const b = propagateByTheme("Earnings calendar concentration");
  assert.deepEqual(a, []);
  assert.deepEqual(b, []);
});

test("AI-TRUST-001 — a genuine theme match (oil) still returns a real, non-empty propagation chain", () => {
  const result = propagateByTheme("Oil price spike");
  assert.ok(result.length > 0, "a real theme match must still be returned");
  assert.equal(result[0].from, "Oil");
});

test("AI-TRUST-001 — a genuine theme match (Fed/rate) returns its own distinct real propagation chain", () => {
  const result = propagateByTheme("Fed rate hike");
  assert.ok(result.length > 0);
  assert.equal(result[0].from, "Fed funds");
});

test("LIVE-DATA-FINAL-001 — 'Shipping rates surge' (freight pricing) must not falsely trigger the Fed-funds chain via a substring inside 'rates'", () => {
  const result = propagateByTheme("Shipping rates surge");
  assert.deepEqual(result, [], "'rates' (freight) is not the same word as 'rate' (interest rates) and must not match");
});

test("LIVE-DATA-FINAL-001 — 'Semiconductor capacity constraint' must not falsely trigger the AI-demand chain via a substring inside 'constraint'", () => {
  const result = propagateByTheme("Semiconductor capacity constraint");
  assert.deepEqual(result, [], "'constraint' contains the letters 'ai' but is not the word 'ai' and must not match");
});
