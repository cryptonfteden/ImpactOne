const test = require("node:test");
const assert = require("node:assert/strict");
const { parseInfoTableForCompany, namesMatch } = require("./thirteenFInfoTableParser");

function infoTableRow({ nameOfIssuer, cusip = "000000000", value, shares }) {
  return `<infoTable>
    <nameOfIssuer>${nameOfIssuer}</nameOfIssuer>
    <titleOfClass>COM</titleOfClass>
    <cusip>${cusip}</cusip>
    <value>${value}</value>
    <shrsOrPrnAmt>
      <sshPrnamt>${shares}</sshPrnamt>
      <sshPrnamtType>SH</sshPrnamtType>
    </shrsOrPrnAmt>
    <investmentDiscretion>DFND</investmentDiscretion>
  </infoTable>`;
}

function xmlOf(rows) {
  return `<informationTable xmlns="https://www.sec.gov/edgar/document/thirteenf/informationtable">${rows.join("\n")}</informationTable>`;
}

test("namesMatch is a real, case-insensitive substring match in either direction", () => {
  assert.equal(namesMatch("APPLE INC", "Apple Inc"), true);
  assert.equal(namesMatch("APPLE INC COM", "Apple Inc"), true);
  assert.equal(namesMatch("Apple Inc", "APPLE INC COM"), true);
  assert.equal(namesMatch("MICROSOFT CORP", "Apple Inc"), false);
});

test("namesMatch honestly returns false for missing real names", () => {
  assert.equal(namesMatch(null, "Apple Inc"), false);
  assert.equal(namesMatch("APPLE INC", null), false);
});

test("parseInfoTableForCompany honestly reports matched: false with zero totals for no real matching rows", () => {
  const xml = xmlOf([infoTableRow({ nameOfIssuer: "MICROSOFT CORP", value: 1000, shares: 10 })]);
  const result = parseInfoTableForCompany(xml, "Apple Inc");
  assert.equal(result.matched, false);
  assert.equal(result.totalShares, 0);
  assert.equal(result.totalValue, 0);
});

test("parseInfoTableForCompany aggregates real shares/value across every real matching row (multiple discretionary accounts for the same real issuer)", () => {
  const xml = xmlOf([
    infoTableRow({ nameOfIssuer: "APPLE INC", value: 100, shares: 10 }),
    infoTableRow({ nameOfIssuer: "APPLE INC", value: 200, shares: 20 }),
    infoTableRow({ nameOfIssuer: "MICROSOFT CORP", value: 999, shares: 999 }),
  ]);
  const result = parseInfoTableForCompany(xml, "Apple Inc");
  assert.equal(result.matched, true);
  assert.equal(result.totalShares, 30);
  assert.equal(result.totalValue, 300);
  assert.equal(result.matchingRowCount, 2);
});

test("parseInfoTableForCompany's real value field is treated as already-whole-dollars, never multiplied by 1000", () => {
  // Real, verified-during-development fact: value/shares reproduces a
  // real per-share stock price directly, with no unit conversion.
  const xml = xmlOf([infoTableRow({ nameOfIssuer: "APPLE INC", value: 498992850, shares: 12719675 })]);
  const result = parseInfoTableForCompany(xml, "Apple Inc");
  const impliedPricePerShare = result.totalValue / result.totalShares;
  assert.ok(impliedPricePerShare > 10 && impliedPricePerShare < 1000, `expected a real plausible per-share price, got ${impliedPricePerShare}`);
});
