const test = require("node:test");
const assert = require("node:assert/strict");
const { buildKeyDrivers } = require("./keyDriversBuilder");

test("empty input returns an empty list, never a fabricated driver", () => {
  assert.deepEqual(buildKeyDrivers([]), []);
});

test("drivers are sorted by the real magnitude of their contribution, highest first, regardless of sign", () => {
  const contributions = [
    { agentId: "options", direction: "BULLISH", confidence: 50, priority: 7, contributionScore: 2 },
    { agentId: "earnings", direction: "BEARISH", confidence: 90, priority: 7, contributionScore: -6.3 },
    { agentId: "valuation", direction: "BULLISH", confidence: 30, priority: 7, contributionScore: 1 },
  ];
  const result = buildKeyDrivers(contributions);
  assert.deepEqual(result.map((d) => d.agentId), ["earnings", "options", "valuation"]);
});

test("every driver entry carries a real, checkable explanation naming its own confidence and priority", () => {
  const contributions = [{ agentId: "options", direction: "BULLISH", confidence: 82, priority: 7, contributionScore: 4 }];
  const [driver] = buildKeyDrivers(contributions);
  assert.match(driver.explanation, /82% confidence/);
  assert.match(driver.explanation, /priority \(7\)/);
  assert.match(driver.explanation, /bullish/);
});

test("a bearish contribution's explanation names it as bearish, never mislabeled", () => {
  const contributions = [{ agentId: "earnings", direction: "BEARISH", confidence: 60, priority: 7, contributionScore: -3 }];
  const [driver] = buildKeyDrivers(contributions);
  assert.match(driver.explanation, /bearish/);
});
