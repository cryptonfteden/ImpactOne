const test = require("node:test");
const assert = require("node:assert/strict");
const { createInsiderDataProvider, emptyMetrics } = require("./insiderDataProvider");
const cikResolverModule = require("./cikResolver");

const sampleFormFourXml = `<ownershipDocument>
  <reportingOwner>
    <reportingOwnerId><rptOwnerCik>0001214156</rptOwnerCik><rptOwnerName>COOK TIMOTHY D</rptOwnerName></reportingOwnerId>
    <reportingOwnerRelationship><isDirector>1</isDirector><isOfficer>1</isOfficer><isTenPercentOwner>0</isTenPercentOwner><officerTitle>Chief Executive Officer</officerTitle></reportingOwnerRelationship>
  </reportingOwner>
  <nonDerivativeTable>
    <nonDerivativeTransaction>
      <transactionDate><value>2026-04-02</value></transactionDate>
      <transactionCoding><transactionCode>S</transactionCode></transactionCoding>
      <transactionAmounts>
        <transactionShares><value>5087</value></transactionShares>
        <transactionPricePerShare><value>251.25</value></transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
      <postTransactionAmounts><sharesOwnedFollowingTransaction><value>3340280</value></sharesOwnedFollowingTransaction></postTransactionAmounts>
    </nonDerivativeTransaction>
  </nonDerivativeTable>
</ownershipDocument>`;

function submissionsFixture(recentDateIso) {
  return {
    filings: {
      recent: {
        form: ["4"],
        accessionNumber: ["0001140361-26-025622"],
        filingDate: [recentDateIso],
        reportDate: [recentDateIso],
        primaryDocument: ["xslF345X06/form4.xml"],
      },
    },
  };
}

test("emptyMetrics honestly reports dataAvailable: false with the given reason, never fabricated transactions", () => {
  const metrics = emptyMetrics("XYZ", "no cik");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "no cik");
  assert.deepEqual(metrics.transactions, []);
  assert.equal(metrics.filingsFetched, 0);
});

test("createInsiderDataProvider: honestly reports unavailable when EDGAR has no real CIK for the symbol", async () => {
  const originalResolveCik = cikResolverModule.resolveCik;
  cikResolverModule.resolveCik = async () => null;
  try {
    const provider = createInsiderDataProvider();
    const metrics = await provider.getSymbolInsiderData("NOPE");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /no real CIK/);
  } finally {
    cikResolverModule.resolveCik = originalResolveCik;
  }
});

test("createInsiderDataProvider: honestly reports unavailable when the real submissions feed fails", async () => {
  const originalResolveCik = cikResolverModule.resolveCik;
  cikResolverModule.resolveCik = async () => ({ cik: "0000320193", title: "Apple Inc." });
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.reject(new Error("simulated failure"));
  try {
    const provider = createInsiderDataProvider();
    const metrics = await provider.getSymbolInsiderData("AAPL");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /submissions feed/);
  } finally {
    cikResolverModule.resolveCik = originalResolveCik;
    require("axios").get = originalGet;
  }
});

test("createInsiderDataProvider: honestly reports zero real transactions (not unavailable) when there are no real Form 4 filings in the lookback window", async () => {
  const originalResolveCik = cikResolverModule.resolveCik;
  cikResolverModule.resolveCik = async () => ({ cik: "0000320193", title: "Apple Inc." });
  const originalGet = require("axios").get;
  require("axios").get = (url) => {
    if (url.includes("submissions")) return Promise.resolve({ data: submissionsFixture("2020-01-01") }); // far outside lookback
    return Promise.resolve({ data: sampleFormFourXml });
  };
  try {
    const provider = createInsiderDataProvider({ lookbackDays: 180 });
    const metrics = await provider.getSymbolInsiderData("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.deepEqual(metrics.transactions, []);
    assert.equal(metrics.filingsFetched, 0);
  } finally {
    cikResolverModule.resolveCik = originalResolveCik;
    require("axios").get = originalGet;
  }
});

test("createInsiderDataProvider: fetches and parses real Form 4 filings within the lookback window into flattened transactions", async () => {
  const recentDate = new Date().toISOString().slice(0, 10);
  const originalResolveCik = cikResolverModule.resolveCik;
  cikResolverModule.resolveCik = async () => ({ cik: "0000320193", title: "Apple Inc." });
  const originalGet = require("axios").get;
  require("axios").get = (url) => {
    if (url.includes("submissions")) return Promise.resolve({ data: submissionsFixture(recentDate) });
    return Promise.resolve({ data: sampleFormFourXml });
  };
  try {
    const provider = createInsiderDataProvider({ lookbackDays: 180 });
    const metrics = await provider.getSymbolInsiderData("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.cik, "0000320193");
    assert.equal(metrics.filingsFetched, 1);
    assert.equal(metrics.transactions.length, 1);
    assert.equal(metrics.transactions[0].ownerName, "COOK TIMOTHY D");
    assert.equal(metrics.transactions[0].filingDate, recentDate);
  } finally {
    cikResolverModule.resolveCik = originalResolveCik;
    require("axios").get = originalGet;
  }
});

test("createInsiderDataProvider: a single failed filing fetch degrades honestly, never blocking the others", async () => {
  const recentDate = new Date().toISOString().slice(0, 10);
  const originalResolveCik = cikResolverModule.resolveCik;
  cikResolverModule.resolveCik = async () => ({ cik: "0000320193", title: "Apple Inc." });
  const submissionsTwoFilings = {
    filings: {
      recent: {
        form: ["4", "4"],
        accessionNumber: ["0001140361-26-025622", "0001140361-26-025623"],
        filingDate: [recentDate, recentDate],
        reportDate: [recentDate, recentDate],
        primaryDocument: ["xslF345X06/form4.xml", "xslF345X06/form4.xml"],
      },
    },
  };
  let docCallCount = 0;
  const originalGet = require("axios").get;
  require("axios").get = (url) => {
    if (url.includes("submissions")) return Promise.resolve({ data: submissionsTwoFilings });
    docCallCount += 1;
    if (docCallCount === 1) return Promise.reject(new Error("simulated single-filing failure"));
    return Promise.resolve({ data: sampleFormFourXml });
  };
  try {
    const provider = createInsiderDataProvider({ lookbackDays: 180 });
    const metrics = await provider.getSymbolInsiderData("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.filingsFetched, 1, "only the real, successfully-fetched filing counts");
    assert.equal(metrics.transactions.length, 1);
  } finally {
    cikResolverModule.resolveCik = originalResolveCik;
    require("axios").get = originalGet;
  }
});
