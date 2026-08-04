// Phase INSTITUTIONAL-AGENT-001 — a minimal, targeted extractor for SEC
// Form 13F's stable, well-documented Information Table XML schema
// (https://www.sec.gov/info/edgar/specifications/form13fxmltechspec.htm)
// — the same "deliberately simple, targeted extractor, not a general
// XML parser" discipline `formFourXmlParser.js` already established
// (no new npm dependency for one narrow, decades-stable schema).
//
// Real 13F filings key each holding by free-text `nameOfIssuer` (and a
// real `cusip`), never a ticker symbol — so matching a target company
// to its real rows here is a real, disclosed, case-insensitive
// substring match against the real company name (from
// companyNameResolver.js), not an exact-key lookup. A single manager
// can (and often does) report the SAME issuer across multiple real
// rows (different discretionary accounts) — this aggregates
// (sums) every real matching row within one filing, never picking
// just one arbitrarily.
function extractRaw(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"));
  return match ? match[1].trim() : null;
}

function extractAllRaw(xml, tagName) {
  const matches = xml.matchAll(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "gi"));
  return Array.from(matches, (match) => match[1]);
}

function extractLeafNumber(xml, tagName) {
  const raw = extractRaw(xml, tagName);
  const value = raw !== null ? Number(raw.replace(/,/g, "")) : NaN;
  return Number.isFinite(value) ? value : null;
}

function namesMatch(nameOfIssuer, companyName) {
  if (!nameOfIssuer || !companyName) return false;
  const a = nameOfIssuer.toUpperCase().trim();
  const b = companyName.toUpperCase().trim();
  return a.includes(b) || b.includes(a);
}

/**
 * @param {string} xml - the real, raw 13F Information Table XML document text
 * @param {string} companyName - the real target company name to match against
 * @returns {{ matched: boolean, totalShares: number, totalValue: number, matchingRowCount: number }}
 */
function parseInfoTableForCompany(xml, companyName) {
  const rows = extractAllRaw(xml, "infoTable");
  let totalShares = 0;
  let totalValue = 0;
  let matchingRowCount = 0;

  for (const row of rows) {
    const nameOfIssuer = extractRaw(row, "nameOfIssuer");
    if (!namesMatch(nameOfIssuer, companyName)) continue;

    const shares = extractLeafNumber(row, "sshPrnamt");
    // The real schema reports `value` already in whole dollars, rounded
    // to the nearest thousand (verified against a real Berkshire
    // Hathaway filing during development: value/shares reproduced Ally
    // Financial's real per-share price — NOT "value in thousands", a
    // common but incorrect assumption about this field).
    const value = extractLeafNumber(row, "value");

    if (Number.isFinite(shares)) totalShares += shares;
    if (Number.isFinite(value)) totalValue += value;
    matchingRowCount += 1;
  }

  return { matched: matchingRowCount > 0, totalShares, totalValue, matchingRowCount };
}

module.exports = { parseInfoTableForCompany, namesMatch };
