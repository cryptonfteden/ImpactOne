const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createBroadMarketPeerGroupProvider,
  createDamodaranPeerGroupProvider,
  parseIndustryTable,
  selectIndustryNames,
  BROAD_MARKET_REFERENCE_MULTIPLES,
  DEFAULT_WACC_PROXY_PERCENT,
} = require("./peerGroupProvider");

function table(rows) {
  return `<html><body>Data used is as of January 2026 Download<table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
}

test("parseIndustryTable reads Excel-generated HTML without inventing missing cells", () => {
  const html = table([["Software (System &amp; Application)", "210", "12.5", "18.4"]]);
  const rows = parseIndustryTable(html, { firms: 1, pe: 2, peg: 3, forwardPe: 4 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].industry, "Software (System & Application)");
  assert.equal(rows[0].firms, 210);
  assert.equal(rows[0].pe, 12.5);
  assert.equal(rows[0].forwardPe, null);
});

test("industry aliases select a transparent sector basket rather than a hand-set multiple", () => {
  const rows = [
    { industry: "Software (System & Application)", normalizedIndustry: "software system application" },
    { industry: "Software (Internet)", normalizedIndustry: "software internet" },
    { industry: "Advertising", normalizedIndustry: "advertising" },
  ];
  assert.deepEqual(selectIndustryNames(rows, "Software"), ["Software (System & Application)", "Software (Internet)"]);
});

test("Damodaran provider returns dated, source-linked peer multiples and sample size", async () => {
  const payloads = {
    pedata: table([
      ["Software (System & Application)", 120, "10%", 30, 25, 22, 0, 0, "12%", 1.8],
      ["Software (Internet)", 40, "20%", 35, 28, 24, 0, 0, "15%", 2.1],
    ]),
    psdata: table([["Software (System & Application)", 120, 6], ["Software (Internet)", 40, 7]]),
    pbvdata: table([["Software (System & Application)", 120, 8], ["Software (Internet)", 40, 9]]),
    vebitda: table([["Software (System & Application)", 120, 0, 18], ["Software (Internet)", 40, 0, 20]]),
    wacc: table([["Software (System & Application)", 120, 0, 0, 0, 0, 0, 0, 0, 0, "8.2%"], ["Software (Internet)", 40, 0, 0, 0, 0, 0, 0, 0, 0, "8.8%"]]),
  };
  const httpGet = async (url) => ({ data: payloads[url.match(/\/([^/]+)\.html$/)[1]] });
  const cache = { getOrCompute: async (_key, compute) => compute() };
  const reference = await createDamodaranPeerGroupProvider({ httpGet, cache }).getSectorReference("Software");
  assert.equal(reference.source, "sector-peer-group");
  assert.equal(reference.peerGroupSize, 160);
  assert.equal(reference.multiples.pe, 25);
  assert.equal(reference.multiples.forwardPe, 22);
  assert.equal(reference.multiples.ps, 6);
  assert.equal(reference.multiples.pb, 8);
  assert.equal(reference.multiples.evEbitda, 18);
  assert.equal(reference.wacc, 8.2);
  assert.equal(reference.sourceAsOf, "January 2026");
  assert.match(reference.sourceUrl, /stern\.nyu\.edu/);
});

test("getSectorReference refuses to turn hand-set broad-market constants into a target price", async () => {
  const provider = createBroadMarketPeerGroupProvider();
  const reference = await provider.getSectorReference("Software");
  assert.equal(reference.source, "unavailable");
  assert.equal(reference.peerGroupSize, 0);
  assert.equal(reference.industry, "Software");
});

test("the default provider returns null multiples until a verified peer source is connected", async () => {
  const provider = createBroadMarketPeerGroupProvider();
  const reference = await provider.getSectorReference("Software");
  assert.ok(Object.values(reference.multiples).every((value) => value === null));
});

test("a null/missing industry is handled honestly, never throwing", async () => {
  const provider = createBroadMarketPeerGroupProvider();
  const reference = await provider.getSectorReference(null);
  assert.equal(reference.industry, null);
});

test("the default provider does not use a hand-set WACC as verified company evidence", async () => {
  const provider = createBroadMarketPeerGroupProvider();
  const reference = await provider.getSectorReference("Software");
  assert.equal(reference.wacc, null);
});

test("every required multiple field is present but honestly unavailable", async () => {
  const provider = createBroadMarketPeerGroupProvider();
  const reference = await provider.getSectorReference("Software");
  for (const key of ["pe", "forwardPe", "peg", "evEbitda", "ps", "pb", "fcfYield"]) {
    assert.equal(reference.multiples[key], null);
  }
});
