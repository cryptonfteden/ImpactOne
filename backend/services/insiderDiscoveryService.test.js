const test = require("node:test");
const assert = require("node:assert/strict");
const { parseFinvizBuyRows, parseSecCurrentFormFourEntries } = require("./insiderDiscoveryService");

test("Finviz discovery accepts Buy rows and keeps the SEC filing URL", () => {
  const html = `<tr class="fv-insider-row is-buy-1"><td data-boxover-ticker="PAL" data-boxover-company="Proficient Auto Logistics Inc"><a>PAL</a></td><td>Lal Rohit</td><td>Director</td><td>Aug 13 '26</td><td>Buy</td><td>5.43</td><td>40,000</td><td>217,200</td><td>61,903</td><td><a href="http://www.sec.gov/Archives/edgar/data/1901836/filing/ownership.xml">Form 4</a></td></tr>`;
  const rows = parseFinvizBuyRows(html);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].symbol, "PAL");
  assert.equal(rows[0].value, 217200);
  assert.equal(rows[0].filingUrl.startsWith("https://www.sec.gov/Archives/"), true);
});

test("parseSecCurrentFormFourEntries keeps one issuer entry per accession and ignores reporting-owner duplicates", () => {
  const atom = `<feed><entry><title>4 - Example Corp (0001234567) (Issuer)</title><link rel="alternate" href="https://www.sec.gov/Archives/edgar/data/1234567/0001/0001-index.htm"/><summary> &lt;b&gt;Filed:&lt;/b&gt; 2026-08-20</summary></entry><entry><title>4 - Jane Doe (0009999999) (Reporting)</title><link rel="alternate" href="https://www.sec.gov/Archives/edgar/data/1234567/0001/0001-index.htm"/></entry></feed>`;
  const entries = parseSecCurrentFormFourEntries(atom);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].company, "Example Corp");
  assert.equal(entries[0].filingDate, "2026-08-20");
});

test("Finviz discovery rejects sales and option exercises", () => {
  const row = (transaction, klass) => `<tr class="fv-insider-row ${klass}"><td data-boxover-ticker="TEST" data-boxover-company="Test"><a>TEST</a></td><td>Owner</td><td>CEO</td><td>Aug 13 '26</td><td>${transaction}</td><td>5</td><td>1,000</td><td>5,000</td><td>2,000</td><td><a href="https://www.sec.gov/Archives/edgar/data/1/x.xml">Form 4</a></td></tr>`;
  assert.deepEqual(parseFinvizBuyRows(row("Sale", "is-sale-2") + row("Option Exercise", "is-buy-1")), []);
});
