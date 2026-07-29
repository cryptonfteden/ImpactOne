const test = require("node:test");
const assert = require("node:assert/strict");
const { parseShortVolumeRow } = require("./shortVolumeFileParser");

function fixtureFile() {
  return [
    "Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market",
    "20260728|A|329658.649367|50|728155.677808|B,Q,N",
    "20260728|AAPL|9605985.809034|42284|19089934.292696|B,Q,N",
    "20260728|AAAA|4958|0|8520.366144|Q",
  ].join("\n");
}

test("parseShortVolumeRow finds the real matching row by exact date+symbol, never a substring match", () => {
  const result = parseShortVolumeRow(fixtureFile(), "20260728", "AAPL");
  assert.ok(result);
  assert.equal(result.date, "20260728");
  assert.equal(result.symbol, "AAPL");
  assert.equal(result.shortVolume, 9605985.809034);
  assert.equal(result.totalVolume, 19089934.292696);
});

test("parseShortVolumeRow never matches 'A' as a substring of 'AAPL' or vice versa", () => {
  const resultA = parseShortVolumeRow(fixtureFile(), "20260728", "A");
  assert.equal(resultA.shortVolume, 329658.649367);
  const resultAAAA = parseShortVolumeRow(fixtureFile(), "20260728", "AAAA");
  assert.equal(resultAAAA.shortVolume, 4958);
});

test("parseShortVolumeRow computes the real shortVolumeRatio correctly", () => {
  const result = parseShortVolumeRow(fixtureFile(), "20260728", "A");
  assert.equal(result.shortVolumeRatio, Math.round((329658.649367 / 728155.677808) * 10000) / 10000);
});

test("parseShortVolumeRow honestly returns null for a real symbol not present that day", () => {
  assert.equal(parseShortVolumeRow(fixtureFile(), "20260728", "NOPE"), null);
});

test("parseShortVolumeRow honestly returns null for a real date not present in the file", () => {
  assert.equal(parseShortVolumeRow(fixtureFile(), "20260729", "AAPL"), null);
});

test("parseShortVolumeRow honestly returns null rather than dividing by a real zero total volume", () => {
  const file = "Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market\n20260728|ZERO|0|0|0|Q";
  assert.equal(parseShortVolumeRow(file, "20260728", "ZERO"), null);
});
