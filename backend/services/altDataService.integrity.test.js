const test = require("node:test");
const assert = require("node:assert/strict");
const { inferSectorFromSymbol, selectCotRow } = require("./altDataService");

test("unknown symbols never inherit a fabricated technology sector", () => {
  assert.equal(inferSectorFromSymbol("UNKNOWN"), null);
  assert.equal(inferSectorFromSymbol("EQPT"), null);
  assert.equal(inferSectorFromSymbol("NVDA"), "technology");
});

test("COT selection never falls back to an unrelated first row", () => {
  const rows = [
    { market_and_exchange_names: "EURO FX - CHICAGO MERCANTILE EXCHANGE" },
    { market_and_exchange_names: "BITCOIN - CHICAGO MERCANTILE EXCHANGE" },
  ];
  assert.equal(selectCotRow(rows, "S&P"), null);
  assert.equal(selectCotRow(rows, "BITCOIN"), rows[1]);
});
