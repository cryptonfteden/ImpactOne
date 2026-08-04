const test = require("node:test");
const assert = require("node:assert/strict");
const { parseThirteenFFilings } = require("./thirteenFSubmissionsParser");

function submissions(forms, accessions, filingDates, reportDates) {
  return { filings: { recent: { form: forms, accessionNumber: accessions, filingDate: filingDates, reportDate: reportDates } } };
}

test("parseThirteenFFilings returns an empty array for a real response with no filings section", () => {
  assert.deepEqual(parseThirteenFFilings({}), []);
  assert.deepEqual(parseThirteenFFilings(null), []);
});

test("parseThirteenFFilings filters to only real 13F-HR filings, excluding amendments and every other real form type", () => {
  const data = submissions(
    ["13F-HR", "13F-HR/A", "10-K", "13F-NT"],
    ["a", "b", "c", "d"],
    ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"],
    ["2025-12-31", "2025-12-31", "2025-12-31", "2025-12-31"]
  );
  const filings = parseThirteenFFilings(data);
  assert.equal(filings.length, 1);
  assert.equal(filings[0].accessionNumber, "a");
});

test("parseThirteenFFilings sorts real filings most-recent-first", () => {
  const data = submissions(["13F-HR", "13F-HR"], ["a", "b"], ["2026-01-01", "2026-05-01"], ["2025-12-31", "2026-03-31"]);
  const filings = parseThirteenFFilings(data);
  assert.equal(filings[0].accessionNumber, "b");
  assert.equal(filings[1].accessionNumber, "a");
});

test("parseThirteenFFilings honors the real limit option (default 4, quarterly cadence)", () => {
  const data = submissions(
    ["13F-HR", "13F-HR", "13F-HR"],
    ["a", "b", "c"],
    ["2026-01-01", "2026-02-01", "2026-03-01"],
    ["2025-12-31", "2026-01-31", "2026-02-28"]
  );
  const filings = parseThirteenFFilings(data, { limit: 2 });
  assert.equal(filings.length, 2);
});
