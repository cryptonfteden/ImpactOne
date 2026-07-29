// Phase INSTITUTIONAL-AGENT-001 — pure parsing of SEC EDGAR's real
// `submissions/CIK##########.json` response shape (the same real,
// columnar `filings.recent` shape `INSIDER-AGENT-001`'s
// `submissionsParser.js` already documented) — filtered to real
// `13F-HR` filings only (quarterly holdings reports; amendments
// `13F-HR/A` are deliberately excluded, a disclosed scope choice, since
// this agent compares consecutive REPORTED quarters and an amendment
// would complicate that real chronology).
/**
 * @param {object} submissionsJson - the real, unmodified SEC EDGAR submissions response
 * @param {{ limit?: number }} [options]
 * @returns {Array<{ accessionNumber: string, filingDate: string, reportDate: string }>}
 *   real 13F-HR filings, most-recent-first, capped at `limit`
 */
function parseThirteenFFilings(submissionsJson, { limit = 4 } = {}) {
  const recent = submissionsJson?.filings?.recent;
  if (!recent || !Array.isArray(recent.form)) return [];

  const filings = [];
  for (let i = 0; i < recent.form.length; i += 1) {
    if (recent.form[i] !== "13F-HR") continue;
    filings.push({
      accessionNumber: recent.accessionNumber[i],
      filingDate: recent.filingDate[i],
      reportDate: recent.reportDate ? recent.reportDate[i] : null,
    });
  }

  filings.sort((a, b) => (a.filingDate < b.filingDate ? 1 : a.filingDate > b.filingDate ? -1 : 0));
  return filings.slice(0, limit);
}

module.exports = { parseThirteenFFilings };
