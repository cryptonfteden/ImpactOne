const test = require("node:test");
const assert = require("node:assert/strict");
const { parseFormFourFilings, buildFilingDocumentUrl } = require("./submissionsParser");

function submissions(forms, accessions, filingDates, primaryDocs) {
  return {
    filings: {
      recent: {
        form: forms,
        accessionNumber: accessions,
        filingDate: filingDates,
        reportDate: filingDates,
        primaryDocument: primaryDocs,
      },
    },
  };
}

test("parseFormFourFilings returns an empty array for a real response with no filings section", () => {
  assert.deepEqual(parseFormFourFilings({}), []);
  assert.deepEqual(parseFormFourFilings(null), []);
});

test("parseFormFourFilings filters to only real form '4' filings, ignoring every other real form type", () => {
  const data = submissions(
    ["4", "10-K", "4", "8-K"],
    ["0001-24-000001", "0001-24-000002", "0001-24-000003", "0001-24-000004"],
    ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"],
    ["xslF345X06/form4.xml", "10k.htm", "xslF345X06/form4.xml", "8k.htm"]
  );
  const filings = parseFormFourFilings(data);
  assert.equal(filings.length, 2);
  assert.ok(filings.every((f) => f.accessionNumber === "0001-24-000001" || f.accessionNumber === "0001-24-000003"));
});

test("parseFormFourFilings sorts real filings most-recent-first", () => {
  const data = submissions(
    ["4", "4"],
    ["0001-24-000001", "0001-24-000002"],
    ["2026-01-01", "2026-03-01"],
    ["a.xml", "b.xml"]
  );
  const filings = parseFormFourFilings(data);
  assert.equal(filings[0].filingDate, "2026-03-01");
  assert.equal(filings[1].filingDate, "2026-01-01");
});

test("parseFormFourFilings honors the real limit option", () => {
  const data = submissions(["4", "4", "4"], ["a", "b", "c"], ["2026-01-01", "2026-01-02", "2026-01-03"], ["x.xml", "y.xml", "z.xml"]);
  const filings = parseFormFourFilings(data, { limit: 2 });
  assert.equal(filings.length, 2);
});

test("buildFilingDocumentUrl strips a real XSLT-viewer subfolder prefix and uses the accession root", () => {
  const url = buildFilingDocumentUrl("0000320193", { accessionNumber: "0001140361-26-025622", primaryDocument: "xslF345X06/form4.xml" });
  assert.equal(url, "https://www.sec.gov/Archives/edgar/data/320193/000114036126025622/form4.xml");
});

test("buildFilingDocumentUrl handles a real primaryDocument with no subfolder prefix", () => {
  const url = buildFilingDocumentUrl("0000320193", { accessionNumber: "0001140361-26-025622", primaryDocument: "form4.xml" });
  assert.equal(url, "https://www.sec.gov/Archives/edgar/data/320193/000114036126025622/form4.xml");
});
