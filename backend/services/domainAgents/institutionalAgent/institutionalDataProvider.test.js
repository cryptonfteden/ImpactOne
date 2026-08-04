const test = require("node:test");
const assert = require("node:assert/strict");
const { createInstitutionalDataProvider, emptyMetrics } = require("./institutionalDataProvider");
const companyNameResolver = require("./companyNameResolver");
const thirteenFInfoTableLocator = require("./thirteenFInfoTableLocator");

const FAKE_MANAGERS = [
  { name: "Fake Capital One LLC", cik: "0000000001" },
  { name: "Fake Capital Two LP", cik: "0000000002" },
];

function submissionsFixture(dates) {
  return {
    filings: {
      recent: {
        form: dates.map(() => "13F-HR"),
        accessionNumber: dates.map((_, i) => `0000000000-26-${String(i).padStart(6, "0")}`),
        filingDate: dates,
        reportDate: dates,
      },
    },
  };
}

test("emptyMetrics honestly reports dataAvailable: false with the given reason, never fabricated positions", () => {
  const metrics = emptyMetrics("XYZ", "no name");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "no name");
  assert.deepEqual(metrics.managerPositions, []);
});

test("createInstitutionalDataProvider: honestly reports unavailable when the real company name cannot be resolved", async () => {
  const originalResolve = companyNameResolver.resolveCompanyName;
  companyNameResolver.resolveCompanyName = async () => ({ companyName: null, dataAvailable: false, unavailableReason: "No Finnhub API key is configured." });
  try {
    const provider = createInstitutionalDataProvider({ managers: FAKE_MANAGERS });
    const metrics = await provider.getSymbolInstitutionalData("NOPE");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /Finnhub/);
  } finally {
    companyNameResolver.resolveCompanyName = originalResolve;
  }
});

test("createInstitutionalDataProvider: fetches real current+prior quarter positions per manager and aggregates real matching rows", async () => {
  const originalResolve = companyNameResolver.resolveCompanyName;
  const originalLocate = thirteenFInfoTableLocator.locateInfoTableUrl;
  companyNameResolver.resolveCompanyName = async () => ({ companyName: "Fake Co", dataAvailable: true, unavailableReason: null });
  thirteenFInfoTableLocator.locateInfoTableUrl = async () => "https://sec.gov/fake/infotable.xml";

  const originalGet = require("axios").get;
  require("axios").get = (url) => {
    if (url.includes("submissions")) return Promise.resolve({ data: submissionsFixture(["2026-05-01", "2026-02-01"]) });
    return Promise.resolve({
      data: `<informationTable><infoTable><nameOfIssuer>FAKE CO</nameOfIssuer><value>1000</value><shrsOrPrnAmt><sshPrnamt>100</sshPrnamt></shrsOrPrnAmt></infoTable></informationTable>`,
    });
  };
  try {
    const provider = createInstitutionalDataProvider({ managers: FAKE_MANAGERS });
    const metrics = await provider.getSymbolInstitutionalData("FAKE");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.companyName, "Fake Co");
    assert.equal(metrics.managerPositions.length, 2);
    for (const position of metrics.managerPositions) {
      assert.equal(position.checked, true);
      assert.deepEqual(position.currentQuarter, { reportDate: "2026-05-01", shares: 100, value: 1000 });
      assert.deepEqual(position.priorQuarter, { reportDate: "2026-02-01", shares: 100, value: 1000 });
    }
  } finally {
    companyNameResolver.resolveCompanyName = originalResolve;
    thirteenFInfoTableLocator.locateInfoTableUrl = originalLocate;
    require("axios").get = originalGet;
  }
});

test("createInstitutionalDataProvider: a real manager with no matching real holding honestly reports a zero position, not unavailable", async () => {
  const originalResolve = companyNameResolver.resolveCompanyName;
  const originalLocate = thirteenFInfoTableLocator.locateInfoTableUrl;
  companyNameResolver.resolveCompanyName = async () => ({ companyName: "Fake Co", dataAvailable: true, unavailableReason: null });
  thirteenFInfoTableLocator.locateInfoTableUrl = async () => "https://sec.gov/fake/infotable.xml";
  const originalGet = require("axios").get;
  require("axios").get = (url) => {
    if (url.includes("submissions")) return Promise.resolve({ data: submissionsFixture(["2026-05-01", "2026-02-01"]) });
    return Promise.resolve({ data: `<informationTable><infoTable><nameOfIssuer>SOME OTHER CO</nameOfIssuer><value>1000</value><shrsOrPrnAmt><sshPrnamt>100</sshPrnamt></shrsOrPrnAmt></infoTable></informationTable>` });
  };
  try {
    const provider = createInstitutionalDataProvider({ managers: FAKE_MANAGERS.slice(0, 1) });
    const metrics = await provider.getSymbolInstitutionalData("FAKE");
    assert.equal(metrics.managerPositions[0].checked, true);
    assert.deepEqual(metrics.managerPositions[0].currentQuarter, { reportDate: "2026-05-01", shares: 0, value: 0 });
  } finally {
    companyNameResolver.resolveCompanyName = originalResolve;
    thirteenFInfoTableLocator.locateInfoTableUrl = originalLocate;
    require("axios").get = originalGet;
  }
});

test("createInstitutionalDataProvider: a single manager's real submissions-fetch failure degrades independently, honestly, never blocking the others", async () => {
  const originalResolve = companyNameResolver.resolveCompanyName;
  companyNameResolver.resolveCompanyName = async () => ({ companyName: "Fake Co", dataAvailable: true, unavailableReason: null });
  const originalGet = require("axios").get;
  require("axios").get = (url, config) => {
    if (url.includes("submissions") && url.includes("0000000001")) return Promise.reject(new Error("simulated failure"));
    if (url.includes("submissions")) return Promise.resolve({ data: submissionsFixture(["2026-05-01", "2026-02-01"]) });
    return Promise.resolve({ data: `<informationTable></informationTable>` });
  };
  const originalLocate = thirteenFInfoTableLocator.locateInfoTableUrl;
  thirteenFInfoTableLocator.locateInfoTableUrl = async () => "https://sec.gov/fake/infotable.xml";
  try {
    const provider = createInstitutionalDataProvider({ managers: FAKE_MANAGERS });
    const metrics = await provider.getSymbolInstitutionalData("FAKE");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.managerPositions[0].checked, false);
    assert.equal(metrics.managerPositions[1].checked, true);
  } finally {
    companyNameResolver.resolveCompanyName = originalResolve;
    thirteenFInfoTableLocator.locateInfoTableUrl = originalLocate;
    require("axios").get = originalGet;
  }
});
