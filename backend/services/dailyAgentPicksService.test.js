require("../test/testEnv");
const test = require("node:test");
const assert = require("node:assert/strict");
const service = require("./dailyAgentPicksService");

test("market-wide FINRA parser keeps real liquid rows and computes ratios", () => {
  const rows = service.parseFinraMarketFile("Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market\n20260814|AAA|75000|0|100000|Q\n20260814|TINY|3|0|10|Q\n", "20260814");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].symbol, "AAA");
  assert.equal(rows[0].shortPct, 75);
});

test("market-wide FINRA parser rejects malformed decimal or impossible volume rows", () => {
  const rows = service.parseFinraMarketFile("Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market\n20260814|BAD|75000|0|3037753.99|Q\n20260814|IMP|120000|0|100000|Q\n", "20260814");
  assert.deepEqual(rows, []);
});

test("short-flow specialist returns two high-short names and one low-short name", () => {
  const group = service.buildShortFlowCategory({ date: "20260814", sourceUrl: "https://finra.example/file", rows: [
    { symbol: "HIGH", shortPct: 81, otherPct: 19, totalVolume: 900000 },
    { symbol: "NEXT", shortPct: 72, otherPct: 28, totalVolume: 800000 },
    { symbol: "LOW", shortPct: 8, otherPct: 92, totalVolume: 700000 },
  ] });
  assert.deepEqual(group.picks.map((pick) => pick.symbol), ["HIGH", "NEXT", "LOW"]);
  assert.match(group.note, /not open short interest/i);
});

test("gold requires Fibonacci plus two independent specialist lists", () => {
  const groups = [
    { id: "fibonacci", picks: [{ symbol: "ABC", score: 80 }, { symbol: "ONLY", score: 99 }] },
    { id: "news", picks: [{ symbol: "ABC", score: 70 }] },
    { id: "options", picks: [{ symbol: "ABC", score: 90 }] },
  ];
  const gold = service.buildGoldPicks(groups);
  assert.equal(gold.length, 1);
  assert.equal(gold[0].symbol, "ABC");
  assert.equal(gold[0].coverage, 3);
  assert.equal(gold[0].score, 80);
});

test("gold does not count three news boards as three independent confirmations", () => {
  const groups = [
    { id: "fibonacci", picks: [{ symbol: "ABC", score: 85 }] },
    { id: "news", source: "news", picks: [{ symbol: "ABC", score: 90, direction: "ATTENTION" }] },
    { id: "government", source: "government", picks: [{ symbol: "ABC", score: 88, direction: "ATTENTION" }] },
    { id: "official-impact", source: "official", picks: [{ symbol: "ABC", score: 92, direction: "ATTENTION" }] },
  ];
  assert.deepEqual(service.buildGoldPicks(groups), []);
  const confirmations = service.collectIndependentConfirmations(groups).get("ABC");
  assert.equal(confirmations.size, 1);
  assert.equal(confirmations.get("catalyst").score, 92);
});

test("bearish short-flow evidence never confirms a gold opportunity", () => {
  const groups = [
    { id: "fibonacci", picks: [{ symbol: "ABC", score: 90 }] },
    { id: "short-flow", picks: [{ symbol: "ABC", score: 95, direction: "BEARISH_FLOW" }] },
    { id: "insider", picks: [{ symbol: "ABC", score: 90, direction: "INSIDER_BUY" }] },
  ];
  const row = service.buildGoldOpportunities(groups)[0];
  assert.equal(row.state, "WATCH");
  assert.deepEqual(row.confirmationFamilies, ["ownership"]);
});

test("government catalyst separates official releases from verified reporting and keeps source links", () => {
  const now = new Date().toISOString();
  const group = service.buildGovernmentCatalystCategory([
    { symbols:["AAA"], publishedAt:now, sourceName:"U.S. Department of Energy", summary:"Energy infrastructure grant", url:"https://www.energy.gov/example" },
    { symbols:["BBB"], publishedAt:now, sourceName:"Reuters", summary:"US government contract announced", url:"https://reuters.example/policy" },
  ], new Set(["AAA","BBB"]));
  assert.equal(group.picks.length, 2);
  assert.equal(group.picks.find((pick) => pick.symbol === "AAA").metrics.evidenceClass, "OFFICIAL_US_GOVERNMENT");
  assert.deepEqual(group.picks.find((pick) => pick.symbol === "AAA").metrics.themes, ["PUBLIC_FUNDING", "ENERGY_INFRASTRUCTURE"]);
  assert.ok(group.picks.find((pick) => pick.symbol === "AAA").metrics.sectors.includes("Utilities"));
  assert.equal(group.picks.find((pick) => pick.symbol === "BBB").metrics.evidenceClass, "VERIFIED_REPORT_ABOUT_US_POLICY");
});

test("gold lifecycle keeps early verified Fibonacci candidates visible without approving them", () => {
  const groups = [
    { id: "fibonacci", picks: [{ symbol: "WATCH", score: 75 }], candidates: [{ symbol: "EARLY", score: 68, metrics: { distancePct: 3 } }] },
    { id: "news", picks: [{ symbol: "WATCH", score: 80 }, { symbol: "EARLY", score: 82 }] },
  ];
  const rows = service.buildGoldOpportunities(groups);
  assert.equal(rows.find((row) => row.symbol === "WATCH").state, "WATCH");
  assert.equal(rows.find((row) => row.symbol === "EARLY").state, "RADAR");
  assert.equal(rows.find((row) => row.symbol === "EARLY").approved, false);
});

test("an unavailable options provider stays explicit and never invents picks", () => {
  const group = service.buildOptionsCategory({ signals: [], unavailableReason: "Provider not connected" });
  assert.equal(group.count, 0);
  assert.deepEqual(group.picks, []);
  assert.equal(group.unavailableReason, "Provider not connected");
});

test("pending SEC discoveries stay visible as review candidates, never approved picks", () => {
  const group = service.buildInsiderCategory({
    discoveredPurchases: [{
      symbol: "REAL",
      verificationStatus: "PENDING_SEC_VERIFICATION",
      filingUrl: "https://www.sec.gov/Archives/example.xml",
      insider: { totalValue: 2500000, averagePrice: 10, distinctBuyers: 2, latestPurchaseDate: "2026-08-16" },
      unusualActivity: { score: 78 },
    }],
    opportunities: [],
  });
  assert.equal(group.count, 0);
  assert.equal(group.candidateCount, 1);
  assert.equal(group.candidates[0].status, "SEC REVIEW");
  assert.match(group.unavailableReason, /No approved insider pick yet/i);
});

test("Finnhub live market news keeps only fresh source-linked eligible symbols", () => {
  const now = Date.parse("2026-08-17T12:00:00.000Z");
  const events = service.normalizeFinnhubGeneralNews([
    { datetime: now / 1000 - 120, headline: "Apple launches product", related: "AAPL, PRIVATE", source: "Reuters", url: "https://example.com/aapl" },
    { datetime: now / 1000 - 90000, headline: "Old story", related: "AAPL", source: "Reuters", url: "https://example.com/old" },
    { datetime: now / 1000 - 120, headline: "No linked ticker", related: "", source: "Reuters", url: "https://example.com/no-symbol" },
  ], new Set(["AAPL"]), now);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].symbols, ["AAPL"]);
  assert.equal(events[0].providerId, "finnhub-general-news");
  assert.equal(events[0].url, "https://example.com/aapl");
});

test("Finnhub company news is attached only to the requested verified symbol", () => {
  const now = Date.parse("2026-08-17T12:00:00.000Z");
  const events = service.normalizeFinnhubCompanyNews([
    { datetime: now / 1000 - 60, headline: "Company raises guidance", source: "Reuters", url: "https://example.com/company" },
    { datetime: now / 1000 - 90000, headline: "Old company story", source: "Reuters", url: "https://example.com/old" },
  ], "AAPL", now);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].symbols, ["AAPL"]);
  assert.equal(events[0].providerId, "finnhub-company-news");
});

test("news specialist ranks live verified mentions and preserves a source link", () => {
  const group = service.buildNewsCategory([{
    symbols: ["AAPL"],
    publishedAt: new Date().toISOString(),
    sourceName: "Reuters",
    relevanceScore: 80,
    summary: "Apple expands AI data-center infrastructure with new government-backed energy capacity",
    url: "https://example.com/aapl",
  }], new Set(["AAPL"]));
  assert.equal(group.picks[0].symbol, "AAPL");
  assert.equal(group.picks[0].sourceUrl, "https://example.com/aapl");
  assert.match(group.source, /Space.*Quantum.*AI.*Energy.*Defense/);
  assert.deepEqual(group.picks[0].metrics.themes, ["AI"]);
});

test("official impact board hides routine notices and keeps material public funding", () => {
  const publishedAt = new Date().toISOString();
  const group = service.buildOfficialImpactCategory([
    {
      id: "routine",
      publishedAt,
      sourceName: "Federal Register",
      summary: "Agency information collection notice and request for comments",
      sourceUrl: "https://www.federalregister.gov/documents/routine",
    },
    {
      id: "material",
      publishedAt,
      sourceName: "U.S. Department of Energy",
      summary: "Department of Energy awards major nuclear grid infrastructure grant",
      sourceUrl: "https://www.energy.gov/material",
    },
  ]);
  assert.deepEqual(group.stories.map((story) => story.id), ["material"]);
  assert.equal(group.stories[0].score >= 72, true);
  assert.equal(group.stories[0].sourceName, "U.S. Department of Energy");
});

test("government watch does not treat a politician stock trade as policy", () => {
  const group = service.buildGovernmentCatalystCategory([{
    symbols: ["AMZN"],
    publishedAt: new Date().toISOString(),
    sourceName: "Market blog",
    summary: "A Congress member bought Amazon shares",
    url: "https://example.com/congress-trade",
  }], new Set(["AMZN"]));
  assert.deepEqual(group.picks, []);
});

test("NewsAPI market discovery links company names and explicit tickers without inventing symbols", () => {
  const now = Date.parse("2026-08-17T12:00:00.000Z");
  const events = service.normalizeNewsApiMarketNews([
    { title: "Apple shares rise after earnings", description: "Nasdaq session", publishedAt: "2026-08-17T11:00:00.000Z", url: "https://example.com/apple", source: { name: "Reuters" } },
    { title: "Nasdaq: MSFT issues guidance", description: "", publishedAt: "2026-08-17T10:00:00.000Z", url: "https://example.com/msft", source: { name: "AP" } },
    { title: "Broad markets move", description: "No identified company", publishedAt: "2026-08-17T09:00:00.000Z", url: "https://example.com/market", source: { name: "AP" } },
  ], [
    { symbol: "AAPL", name: "Apple Inc. - Common Stock" },
    { symbol: "MSFT", name: "Microsoft Corporation - Common Stock" },
  ], now);
  assert.deepEqual(events.map((event) => event.symbols), [["AAPL"], ["MSFT"]]);
  assert.ok(events.every((event) => event.providerId === "newsapi-market-news"));
});
