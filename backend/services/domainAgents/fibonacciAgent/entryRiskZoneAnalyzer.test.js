const test = require("node:test");
const assert = require("node:assert/strict");
const { determineZones } = require("./entryRiskZoneAnalyzer");

function zone(centerPrice, confluenceScore = 1, low = centerPrice, high = centerPrice) {
  return { centerPrice, low, high, confluenceScore, sources: [] };
}

test("determineZones honestly reports unavailable with missing inputs", () => {
  const result = determineZones({ zones: [zone(100)], currentPrice: null, direction: "UP" });
  assert.equal(result.entryZone, null);
  assert.equal(result.riskZone, null);
});

test("determineZones honestly reports unavailable when no real zone exists on the trend-consistent side", () => {
  const result = determineZones({ zones: [zone(150)], currentPrice: 100, direction: "UP" });
  assert.equal(result.entryZone, null);
  assert.match(result.reason, /No real confluence zone/);
});

test("determineZones (UP): picks the nearest real zone below price as entry, the next-further one as risk", () => {
  const zones = [zone(90, 1, 89, 91), zone(80, 1, 79, 81), zone(70, 1, 69, 71)];
  const result = determineZones({ zones, currentPrice: 100, direction: "UP" });
  assert.equal(result.entryZone.centerPrice, 90);
  assert.equal(result.riskZone.centerPrice, 80);
});

test("determineZones (DOWN): picks the nearest real zone above price as entry, the next-further one as risk", () => {
  const zones = [zone(110, 1, 109, 111), zone(120, 1, 119, 121)];
  const result = determineZones({ zones, currentPrice: 100, direction: "DOWN" });
  assert.equal(result.entryZone.centerPrice, 110);
  assert.equal(result.riskZone.centerPrice, 120);
});

test("determineZones prefers a real, multi-source high-probability zone over a closer single-source one", () => {
  const zones = [zone(95, 1, 94, 96), zone(85, 3, 84, 86)];
  const result = determineZones({ zones, currentPrice: 100, direction: "UP" });
  assert.equal(result.entryZone.centerPrice, 85);
  assert.match(result.reason, /high-probability/);
});

test("determineZones falls back to the nearest single-source zone when no multi-source zone exists on this side", () => {
  const zones = [zone(95, 1, 94, 96)];
  const result = determineZones({ zones, currentPrice: 100, direction: "UP" });
  assert.equal(result.entryZone.centerPrice, 95);
  assert.match(result.reason, /falls back/);
});
