const test = require("node:test");
const assert = require("node:assert/strict");
const { isRecognizedEtf, getTheme, getPassiveActiveClassification, getSectorEtf, getSectorNameForEtf, SECTOR_ETF_TICKERS } = require("./etfClassificationReference");

test("isRecognizedEtf recognizes real sector ETF tickers", () => {
  assert.equal(isRecognizedEtf("XLK"), true);
  assert.equal(isRecognizedEtf("xlk"), true);
});

test("isRecognizedEtf recognizes real thematic ETF tickers", () => {
  assert.equal(isRecognizedEtf("ARKK"), true);
});

test("isRecognizedEtf recognizes real broad passive tickers", () => {
  assert.equal(isRecognizedEtf("SPY"), true);
});

test("isRecognizedEtf honestly returns false for an unrecognized real stock ticker", () => {
  assert.equal(isRecognizedEtf("AAPL"), false);
});

test("getTheme returns the real disclosed theme for a known thematic ETF, null otherwise", () => {
  assert.equal(getTheme("ARKK"), "Disruptive Innovation");
  assert.equal(getTheme("AAPL"), null);
});

test("getPassiveActiveClassification classifies real known tickers, null for unknown", () => {
  assert.equal(getPassiveActiveClassification("SPY"), "PASSIVE");
  assert.equal(getPassiveActiveClassification("ARKK"), "ACTIVE");
  assert.equal(getPassiveActiveClassification("AAPL"), null);
});

test("getSectorNameForEtf reverse-resolves a real sector ETF ticker to its real sector name", () => {
  assert.equal(getSectorNameForEtf("XLK"), "Technology");
  assert.equal(getSectorNameForEtf("ARKK"), null, "a thematic (non-sector) ETF has no real sector name");
});

test("getSectorEtf and getSectorNameForEtf are real inverses for every real sector ETF ticker", () => {
  for (const ticker of SECTOR_ETF_TICKERS) {
    const sector = getSectorNameForEtf(ticker);
    assert.equal(getSectorEtf(sector), ticker);
  }
});
