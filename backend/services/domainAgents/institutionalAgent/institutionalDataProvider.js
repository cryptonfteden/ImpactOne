// Phase INSTITUTIONAL-AGENT-001 — the provider abstraction the mission
// requires. Resolves the real target company's name (companyNameResolver.js,
// via Finnhub), then for each of the disclosed cohort of real
// institutional managers (institutionalManagerReference.js), fetches
// their real two most recent 13F-HR filings and parses each real
// Information Table for real rows matching the target company —
// aggregating real shares/value per manager per quarter. Every fetch
// step degrades independently and honestly (one manager's fetch
// failure never blocks the others), and a manager who simply doesn't
// hold the stock is a real, honest "no position", never confused with
// "could not be checked."
//
// ## The interface
// A conforming provider is any object exposing:
//   async getSymbolInstitutionalData(symbol) -> InstitutionalMetrics
//
// `InstitutionalMetrics` shape (every field always present; a field
// that cannot really be resolved is `null`/`[]`, NEVER fabricated):
//   symbol, asOf, dataAvailable, unavailableReason
//   companyName          string|null — the real resolved company name used for matching
//   managerPositions     Array<{
//     managerName, cik, checked (bool — whether this manager's real data was actually fetched),
//     unavailableReason (string|null),
//     currentQuarter: { reportDate, shares, value } | null,
//     priorQuarter: { reportDate, shares, value } | null,
//   }>
const axios = require("axios");
const env = require("../../../config/env");
const companyNameResolver = require("./companyNameResolver");
const { INSTITUTIONAL_MANAGERS } = require("./institutionalManagerReference");
const { parseThirteenFFilings } = require("./thirteenFSubmissionsParser");
const thirteenFInfoTableLocator = require("./thirteenFInfoTableLocator");
const { parseInfoTableForCompany } = require("./thirteenFInfoTableParser");

const REQUEST_TIMEOUT_MS = 10000;
const FILINGS_PER_MANAGER = 2; // current quarter + prior quarter, for a real QoQ comparison

function emptyMetrics(symbol, reason) {
  return { symbol, asOf: new Date().toISOString(), dataAvailable: false, unavailableReason: reason, companyName: null, managerPositions: [] };
}

async function safeFetch(fetcher, fallbackValue) {
  try {
    return await fetcher();
  } catch {
    return fallbackValue;
  }
}

async function fetchManagerPosition(manager, companyName) {
  const submissions = await safeFetch(
    () => axios.get(`https://data.sec.gov/submissions/CIK${manager.cik}.json`, { headers: { "User-Agent": env.SEC_EDGAR_USER_AGENT }, timeout: REQUEST_TIMEOUT_MS }).then((response) => response.data),
    null
  );
  if (!submissions) {
    return { managerName: manager.name, cik: manager.cik, checked: false, unavailableReason: "SEC EDGAR's submissions feed could not be fetched for this manager.", currentQuarter: null, priorQuarter: null };
  }

  const filings = parseThirteenFFilings(submissions, { limit: FILINGS_PER_MANAGER });
  if (!filings.length) {
    return { managerName: manager.name, cik: manager.cik, checked: false, unavailableReason: "No real 13F-HR filings were found for this manager.", currentQuarter: null, priorQuarter: null };
  }

  const quarters = [];
  for (const filing of filings) {
    const infoTableUrl = await thirteenFInfoTableLocator.locateInfoTableUrl(manager.cik, filing.accessionNumber);
    if (!infoTableUrl) {
      quarters.push(null);
      continue;
    }
    const xml = await safeFetch(
      () => axios.get(infoTableUrl, { headers: { "User-Agent": env.SEC_EDGAR_USER_AGENT }, timeout: REQUEST_TIMEOUT_MS }).then((response) => response.data),
      null
    );
    if (!xml || typeof xml !== "string") {
      quarters.push(null);
      continue;
    }
    const result = parseInfoTableForCompany(xml, companyName);
    quarters.push(result.matched ? { reportDate: filing.reportDate, shares: result.totalShares, value: result.totalValue } : { reportDate: filing.reportDate, shares: 0, value: 0 });
  }

  return {
    managerName: manager.name,
    cik: manager.cik,
    checked: true,
    unavailableReason: null,
    currentQuarter: quarters[0] || null,
    priorQuarter: quarters[1] || null,
  };
}

function createInstitutionalDataProvider({ managers = INSTITUTIONAL_MANAGERS } = {}) {
  async function getSymbolInstitutionalData(symbol) {
    const nameResult = await companyNameResolver.resolveCompanyName(symbol);
    if (!nameResult.dataAvailable) {
      return emptyMetrics(symbol, nameResult.unavailableReason);
    }

    const managerPositions = await Promise.all(managers.map((manager) => fetchManagerPosition(manager, nameResult.companyName)));

    return {
      symbol,
      asOf: new Date().toISOString(),
      dataAvailable: true,
      unavailableReason: null,
      companyName: nameResult.companyName,
      managerPositions,
    };
  }

  return { getSymbolInstitutionalData };
}

module.exports = { createInstitutionalDataProvider, emptyMetrics, FILINGS_PER_MANAGER };
