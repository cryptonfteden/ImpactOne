// Phase INSIDER-AGENT-001 — pure parsing of SEC EDGAR's real
// `submissions/CIK##########.json` response shape. That real response
// stores `filings.recent` as PARALLEL COLUMNAR ARRAYS (one array per
// field, all the same length, indexed together) rather than an array of
// row objects — this function is the one place that real, slightly
// unusual real shape gets turned into ordinary row objects, filtered to
// real Form 4 filings only.
/**
 * @param {object} submissionsJson - the real, unmodified SEC EDGAR submissions response
 * @param {{ limit?: number }} [options]
 * @returns {Array<{ accessionNumber: string, filingDate: string, reportDate: string, primaryDocument: string }>}
 *   real Form 4 filings, most-recent-first, capped at `limit`
 */
function parseFormFourFilings(submissionsJson, { limit = 20 } = {}) {
  const recent = submissionsJson?.filings?.recent;
  if (!recent || !Array.isArray(recent.form)) return [];

  const filings = [];
  for (let i = 0; i < recent.form.length; i += 1) {
    if (recent.form[i] !== "4") continue;
    filings.push({
      accessionNumber: recent.accessionNumber[i],
      filingDate: recent.filingDate[i],
      reportDate: recent.reportDate ? recent.reportDate[i] : null,
      primaryDocument: recent.primaryDocument[i],
    });
  }

  // The real feed is already most-recent-first in practice, but sort
  // explicitly by filingDate to never depend on an undocumented
  // ordering guarantee.
  filings.sort((a, b) => (a.filingDate < b.filingDate ? 1 : a.filingDate > b.filingDate ? -1 : 0));
  return filings.slice(0, limit);
}

/**
 * @param {string} cik - 10-digit zero-padded CIK
 * @param {{ accessionNumber: string, primaryDocument: string }} filing
 * @returns {string} the real, directly-fetchable URL for this filing's
 *   RAW XML document. `primaryDocument` from the submissions feed is
 *   often a path like `xslF345X06/form4.xml` — that subfolder is SEC's
 *   own XSLT-rendered HTML viewer for the same real file, not the raw
 *   XML itself. The real raw XML always lives at the accession's own
 *   root under just its basename (confirmed against the accession's
 *   own real `index.json` directory listing), so this strips any
 *   viewer subfolder prefix before building the URL.
 */
function buildFilingDocumentUrl(cik, filing) {
  const cikNoLeadingZeros = String(Number(cik));
  const accessionNoDashes = filing.accessionNumber.replace(/-/g, "");
  const basename = filing.primaryDocument.split("/").pop();
  return `https://www.sec.gov/Archives/edgar/data/${cikNoLeadingZeros}/${accessionNoDashes}/${basename}`;
}

module.exports = { parseFormFourFilings, buildFilingDocumentUrl };
