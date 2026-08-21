// Phase INSIDER-AGENT-001 — the provider abstraction the mission
// requires, reusing real SEC EDGAR data throughout (per the mission's
// own "reuse SEC EDGAR data where available" requirement): a real CIK
// resolution (cikResolver.js), a real filing list
// (data.sec.gov/submissions), and real Form 4 XML documents fetched and
// parsed (formFourXmlParser.js). Every step degrades honestly and
// independently — one bad filing never blocks the others, and a
// symbol EDGAR has no CIK for honestly reports unavailable rather than
// fabricating a transaction history.
//
// ## The interface
// A conforming provider is any object exposing:
//   async getSymbolInsiderData(symbol) -> InsiderMetrics
//
// `InsiderMetrics` shape (every field always present; a field that
// cannot really be fetched is `null`/`[]`, NEVER fabricated):
//   symbol, asOf, dataAvailable, unavailableReason
//   cik, companyTitle
//   transactions   real, flattened non-derivative Form 4 transactions,
//                  each { ownerName, ownerCik, isDirector, isOfficer,
//                  isTenPercentOwner, officerTitle, transactionDate,
//                  transactionCode, acquiredDisposedCode, shares,
//                  pricePerShare, sharesOwnedAfter, filingDate, filingUrl }
//   filingsFetched number — how many real Form 4 filings were actually parsed
const { getSec } = require("../../secEdgarClient");
const cikResolver = require("./cikResolver");
const { parseFormFourFilings, buildFilingDocumentUrl } = require("./submissionsParser");
const { parseFormFourXml } = require("./formFourXmlParser");

const DEFAULT_MAX_FILINGS = 15;
const DEFAULT_LOOKBACK_DAYS = 180;
const REQUEST_TIMEOUT_MS = 10000;

function emptyMetrics(symbol, reason) {
  return { symbol, asOf: new Date().toISOString(), dataAvailable: false, unavailableReason: reason, cik: null, companyTitle: null, transactions: [], filingsFetched: 0 };
}

async function safeFetch(fetcher, fallbackValue) {
  try {
    return await fetcher();
  } catch {
    return fallbackValue;
  }
}

function isWithinLookback(dateString, lookbackDays, now) {
  if (!dateString) return false;
  const filingDate = new Date(`${dateString}T00:00:00Z`);
  return now.getTime() - filingDate.getTime() <= lookbackDays * 86400000;
}

function createInsiderDataProvider({ maxFilings = DEFAULT_MAX_FILINGS, lookbackDays = DEFAULT_LOOKBACK_DAYS } = {}) {
  async function getSymbolInsiderData(symbol) {
    const now = new Date();
    const owner = await cikResolver.resolveCik(symbol);
    if (!owner) {
      return emptyMetrics(symbol, `SEC EDGAR has no real CIK on record for "${symbol}".`);
    }

    const submissions = await safeFetch(
      () => getSec(`https://data.sec.gov/submissions/CIK${owner.cik}.json`, { timeout: REQUEST_TIMEOUT_MS }).then((response) => response.data),
      null
    );
    if (!submissions) {
      return emptyMetrics(symbol, "SEC EDGAR's submissions feed could not be fetched for this symbol's real CIK.");
    }

    const allFilings = parseFormFourFilings(submissions, { limit: maxFilings * 3 }); // over-fetch before the lookback filter, since some may be too old
    const filings = allFilings.filter((filing) => isWithinLookback(filing.filingDate, lookbackDays, now)).slice(0, maxFilings);

    if (!filings.length) {
      return { symbol, asOf: now.toISOString(), dataAvailable: true, unavailableReason: null, cik: owner.cik, companyTitle: owner.title, transactions: [], filingsFetched: 0 };
    }

    const transactions = [];
    let filingsFetched = 0;
    for (const filing of filings) {
      const url = buildFilingDocumentUrl(owner.cik, filing);
      const xml = await safeFetch(
        () => getSec(url, { accept: "application/xml,text/xml,*/*", timeout: REQUEST_TIMEOUT_MS }).then((response) => response.data),
        null
      );
      if (!xml || typeof xml !== "string") continue;
      filingsFetched += 1;

      const parsed = parseFormFourXml(xml);
      for (const transaction of parsed.transactions) {
        transactions.push({
          ownerName: parsed.ownerName,
          ownerCik: parsed.ownerCik,
          isDirector: parsed.isDirector,
          isOfficer: parsed.isOfficer,
          isTenPercentOwner: parsed.isTenPercentOwner,
          officerTitle: parsed.officerTitle,
          ...transaction,
          filingDate: filing.filingDate,
          filingUrl: url,
        });
      }
    }

    return {
      symbol,
      asOf: now.toISOString(),
      dataAvailable: true,
      unavailableReason: null,
      cik: owner.cik,
      companyTitle: owner.title,
      transactions,
      filingsFetched,
    };
  }

  return { getSymbolInsiderData };
}

module.exports = { createInsiderDataProvider, emptyMetrics, DEFAULT_MAX_FILINGS, DEFAULT_LOOKBACK_DAYS };
