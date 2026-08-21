// Phase INSTITUTIONAL-AGENT-001 — locates the real Information Table
// document within a real 13F-HR filing's accession folder. Unlike
// INSIDER-AGENT-001's Form 4 case (where the raw XML's basename could
// be derived from `primaryDocument`), a 13F filing's real Information
// Table has an arbitrary, filing-specific filename (confirmed during
// development against a real Berkshire Hathaway filing: `primary_doc.xml`
// is only the cover page; the real holdings table was a differently-
// named file, e.g. `53405.xml`) — so this fetches the accession's own
// real `index.json` directory listing and picks the one real `.xml`
// file that isn't the cover page, never guessing a filename.
const { getSec } = require("../../secEdgarClient");

const DEFAULT_TIMEOUT_MS = 10000;
const EXCLUDED_NAMES = new Set(["primary_doc.xml"]);

function buildAccessionBaseUrl(cik, accessionNumber) {
  const cikNoLeadingZeros = String(Number(cik));
  const accessionNoDashes = accessionNumber.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cikNoLeadingZeros}/${accessionNoDashes}`;
}

/**
 * @param {string} cik - 10-digit zero-padded CIK
 * @param {string} accessionNumber
 * @returns {Promise<string|null>} the real, directly-fetchable Information Table URL, or null if it couldn't be located
 */
async function locateInfoTableUrl(cik, accessionNumber, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const baseUrl = buildAccessionBaseUrl(cik, accessionNumber);
  try {
    const response = await getSec(`${baseUrl}/index.json`, { timeout: timeoutMs });
    const items = response.data?.directory?.item || [];
    const infoTableItem = items.find((item) => item.name.toLowerCase().endsWith(".xml") && !EXCLUDED_NAMES.has(item.name.toLowerCase()));
    return infoTableItem ? `${baseUrl}/${infoTableItem.name}` : null;
  } catch {
    return null;
  }
}

module.exports = { locateInfoTableUrl, buildAccessionBaseUrl };
