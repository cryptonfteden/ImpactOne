const test = require("node:test");
const assert = require("node:assert/strict");
const { parseFormFourXml } = require("./formFourXmlParser");

function sampleXml({ isDirector = "0", isOfficer = "1", officerTitle = "Chief Executive Officer" } = {}) {
  return `<?xml version="1.0"?>
<ownershipDocument>
  <issuer><issuerCik>0000320193</issuerCik><issuerName>Apple Inc.</issuerName><issuerTradingSymbol>AAPL</issuerTradingSymbol></issuer>
  <reportingOwner>
    <reportingOwnerId>
      <rptOwnerCik>0001214156</rptOwnerCik>
      <rptOwnerName>COOK TIMOTHY D</rptOwnerName>
    </reportingOwnerId>
    <reportingOwnerRelationship>
      <isDirector>${isDirector}</isDirector>
      <isOfficer>${isOfficer}</isOfficer>
      <isTenPercentOwner>0</isTenPercentOwner>
      <officerTitle>${officerTitle}</officerTitle>
    </reportingOwnerRelationship>
  </reportingOwner>
  <nonDerivativeTable>
    <nonDerivativeTransaction>
      <transactionDate>
        <value>2026-04-02</value>
      </transactionDate>
      <transactionCoding>
        <transactionCode>S</transactionCode>
      </transactionCoding>
      <transactionAmounts>
        <transactionShares>
          <value>5087</value>
        </transactionShares>
        <transactionPricePerShare>
          <value>251.25</value>
        </transactionPricePerShare>
        <transactionAcquiredDisposedCode>
          <value>D</value>
        </transactionAcquiredDisposedCode>
      </transactionAmounts>
      <postTransactionAmounts>
        <sharesOwnedFollowingTransaction>
          <value>3340280</value>
        </sharesOwnedFollowingTransaction>
      </postTransactionAmounts>
    </nonDerivativeTransaction>
    <nonDerivativeTransaction>
      <transactionDate>
        <value>2026-04-03</value>
      </transactionDate>
      <transactionCoding>
        <transactionCode>P</transactionCode>
      </transactionCoding>
      <transactionAmounts>
        <transactionShares>
          <value>1000</value>
        </transactionShares>
        <transactionPricePerShare>
          <value>252.00</value>
        </transactionPricePerShare>
        <transactionAcquiredDisposedCode>
          <value>A</value>
        </transactionAcquiredDisposedCode>
      </transactionAmounts>
      <postTransactionAmounts>
        <sharesOwnedFollowingTransaction>
          <value>3341280</value>
        </sharesOwnedFollowingTransaction>
      </postTransactionAmounts>
    </nonDerivativeTransaction>
  </nonDerivativeTable>
  <derivativeTable>
    <derivativeTransaction>
      <transactionDate><value>2026-04-05</value></transactionDate>
    </derivativeTransaction>
  </derivativeTable>
</ownershipDocument>`;
}

test("parseFormFourXml extracts the real reporting owner identity and relationship flags", () => {
  const result = parseFormFourXml(sampleXml());
  assert.equal(result.issuerTradingSymbol, "AAPL");
  assert.equal(result.issuerCik, "0000320193");
  assert.equal(result.issuerName, "Apple Inc.");
  assert.equal(result.ownerName, "COOK TIMOTHY D");
  assert.equal(result.ownerCik, "0001214156");
  assert.equal(result.isDirector, false);
  assert.equal(result.isOfficer, true);
  assert.equal(result.isTenPercentOwner, false);
  assert.equal(result.officerTitle, "Chief Executive Officer");
});

test("parseFormFourXml extracts every real non-derivative transaction with its real fields", () => {
  const result = parseFormFourXml(sampleXml());
  assert.equal(result.transactions.length, 2);
  const [sale, purchase] = result.transactions;
  assert.equal(sale.transactionDate, "2026-04-02");
  assert.equal(sale.transactionCode, "S");
  assert.equal(sale.acquiredDisposedCode, "D");
  assert.equal(sale.shares, 5087);
  assert.equal(sale.pricePerShare, 251.25);
  assert.equal(sale.sharesOwnedAfter, 3340280);
  assert.equal(purchase.transactionCode, "P");
  assert.equal(purchase.shares, 1000);
});

test("parseFormFourXml ignores derivativeTransaction blocks (out of scope, disclosed)", () => {
  const result = parseFormFourXml(sampleXml());
  assert.equal(result.transactions.length, 2, "the derivative transaction must not be counted");
});

test("parseFormFourXml honestly returns real boolean flags for a director-only, non-officer filer", () => {
  const result = parseFormFourXml(sampleXml({ isDirector: "1", isOfficer: "0", officerTitle: "" }));
  assert.equal(result.isDirector, true);
  assert.equal(result.isOfficer, false);
  assert.equal(result.officerTitle, null);
});

test("parseFormFourXml handles a real document with no reporting owner or transactions gracefully, never crashing", () => {
  const result = parseFormFourXml("<ownershipDocument></ownershipDocument>");
  assert.equal(result.ownerName, null);
  assert.deepEqual(result.transactions, []);
});

test("parseFormFourXml filters out a malformed transaction block missing a real required field", () => {
  const xml = `<ownershipDocument>
    <nonDerivativeTable>
      <nonDerivativeTransaction>
        <transactionCoding><transactionCode>S</transactionCode></transactionCoding>
      </nonDerivativeTransaction>
    </nonDerivativeTable>
  </ownershipDocument>`;
  const result = parseFormFourXml(xml);
  assert.deepEqual(result.transactions, [], "a transaction missing a real date/shares must be dropped, never partially fabricated");
});
