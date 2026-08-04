// Phase INSIDER-AGENT-001 — a minimal, targeted extractor for SEC Form
// 4's stable, well-documented XML tag set (https://www.sec.gov/info/edgar/specifications/form4.htm) —
// deliberately NOT a general-purpose XML parser (no new dependency
// added for this one, narrow, decades-stable schema). This is the same
// "deliberately simple, transparent, disclosed extraction" discipline
// this codebase already uses for keyword-lexicon sentiment scoring —
// real tag-content extraction over a real, fetched document, never a
// fabricated transaction.
//
// Deliberate scope limitation, disclosed: only `<nonDerivativeTransaction>`
// (direct common-stock transactions) are parsed. `<derivativeTransaction>`
// entries (options, RSUs, other derivative securities) are out of scope
// for this phase — see INSIDER_AGENT.md's honest-limitations section.
function extractRaw(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"));
  return match ? match[1] : null;
}

function extractAllRaw(xml, tagName) {
  const matches = xml.matchAll(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "gi"));
  return Array.from(matches, (match) => match[1]);
}

// Most Form 4 leaf fields wrap their real value in a nested `<value>`
// element (to support optional footnote references alongside it); a
// few (transactionCode, isDirector/isOfficer/etc.) are plain text
// directly. This handles both real shapes uniformly.
function extractLeaf(xml, tagName) {
  const raw = extractRaw(xml, tagName);
  if (raw === null) return null;
  const nestedValue = extractRaw(raw, "value");
  const text = (nestedValue !== null ? nestedValue : raw).trim();
  return text.length ? text : null;
}

function extractLeafNumber(xml, tagName) {
  const text = extractLeaf(xml, tagName);
  const value = text !== null ? Number(text) : NaN;
  return Number.isFinite(value) ? value : null;
}

function extractLeafBoolean(xml, tagName) {
  const text = extractLeaf(xml, tagName);
  return text === "1" || text === "true";
}

function parseReportingOwner(xml) {
  const ownerBlock = extractRaw(xml, "reportingOwner");
  if (!ownerBlock) return { ownerName: null, ownerCik: null, isDirector: false, isOfficer: false, isTenPercentOwner: false, officerTitle: null };

  return {
    ownerName: extractLeaf(ownerBlock, "rptOwnerName"),
    ownerCik: extractLeaf(ownerBlock, "rptOwnerCik"),
    isDirector: extractLeafBoolean(ownerBlock, "isDirector"),
    isOfficer: extractLeafBoolean(ownerBlock, "isOfficer"),
    isTenPercentOwner: extractLeafBoolean(ownerBlock, "isTenPercentOwner"),
    officerTitle: extractLeaf(ownerBlock, "officerTitle"),
  };
}

function parseNonDerivativeTransaction(block) {
  return {
    transactionDate: extractLeaf(block, "transactionDate"),
    transactionCode: extractLeaf(block, "transactionCode"),
    acquiredDisposedCode: extractLeaf(block, "transactionAcquiredDisposedCode"),
    shares: extractLeafNumber(block, "transactionShares"),
    pricePerShare: extractLeafNumber(block, "transactionPricePerShare"),
    sharesOwnedAfter: extractLeafNumber(block, "sharesOwnedFollowingTransaction"),
  };
}

/**
 * @param {string} xml - the real, raw Form 4 XML document text
 * @returns {{ ownerName: string|null, ownerCik: string|null, isDirector: boolean, isOfficer: boolean, isTenPercentOwner: boolean, officerTitle: string|null, transactions: Array<object> }}
 */
function parseFormFourXml(xml) {
  const owner = parseReportingOwner(xml);
  const transactionBlocks = extractAllRaw(xml, "nonDerivativeTransaction");
  const transactions = transactionBlocks
    .map(parseNonDerivativeTransaction)
    .filter((transaction) => transaction.transactionDate && transaction.transactionCode && Number.isFinite(transaction.shares));

  return { ...owner, transactions };
}

module.exports = { parseFormFourXml, extractLeaf, extractLeafNumber, extractLeafBoolean, extractAllRaw };
