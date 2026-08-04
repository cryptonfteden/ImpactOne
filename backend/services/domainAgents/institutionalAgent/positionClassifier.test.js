const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyPosition } = require("./positionClassifier");

function position({ checked = true, current, prior }) {
  return { checked, currentQuarter: current, priorQuarter: prior };
}

test("classifyPosition honestly reports UNKNOWN for an unchecked real manager", () => {
  assert.equal(classifyPosition(position({ checked: false, current: { shares: 10 }, prior: { shares: 5 } })), "UNKNOWN");
});

test("classifyPosition honestly reports UNKNOWN when either real quarter is missing", () => {
  assert.equal(classifyPosition(position({ current: null, prior: { shares: 5 } })), "UNKNOWN");
  assert.equal(classifyPosition(position({ current: { shares: 5 }, prior: null })), "UNKNOWN");
});

test("classifyPosition: real zero-to-zero is NONE", () => {
  assert.equal(classifyPosition(position({ current: { shares: 0 }, prior: { shares: 0 } })), "NONE");
});

test("classifyPosition: real zero-to-positive is NEW", () => {
  assert.equal(classifyPosition(position({ current: { shares: 100 }, prior: { shares: 0 } })), "NEW");
});

test("classifyPosition: real positive-to-zero is CLOSED", () => {
  assert.equal(classifyPosition(position({ current: { shares: 0 }, prior: { shares: 100 } })), "CLOSED");
});

test("classifyPosition: real growth is INCREASED, real reduction is DECREASED, real equal is UNCHANGED", () => {
  assert.equal(classifyPosition(position({ current: { shares: 150 }, prior: { shares: 100 } })), "INCREASED");
  assert.equal(classifyPosition(position({ current: { shares: 50 }, prior: { shares: 100 } })), "DECREASED");
  assert.equal(classifyPosition(position({ current: { shares: 100 }, prior: { shares: 100 } })), "UNCHANGED");
});
