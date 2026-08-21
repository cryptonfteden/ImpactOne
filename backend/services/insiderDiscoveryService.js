const axios = require("axios");
const { parseFormFourXml } = require("./domainAgents/insiderAgent/formFourXmlParser");
const { getSec } = require("./secEdgarClient");

const FINVIZ_INSIDER_URL = "https://finviz.com/insidertrading";
const SEC_CURRENT_FORM4_URL = "https://www.sec.gov/cgi-bin/browse-edgar";
const DISCOVERY_TIMEOUT_MS = 12000;

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}

function textOnly(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseNumber(value) {
  const number = Number(String(value || "").replace(/[$,]/g, "").trim());
  return Number.isFinite(number) ? number : null;
}

function parseFinvizBuyRows(html) {
  const rows = [];
  for (const match of String(html || "").matchAll(/<tr[^>]*class="[^"]*fv-insider-row[^"]*is-buy-[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = match[1];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => textOnly(cell[1]));
    const symbol = row.match(/data-boxover-ticker="([A-Z0-9.\-]+)"/i)?.[1]?.toUpperCase() || null;
    const company = decodeHtml(row.match(/data-boxover-company="([^"]+)"/i)?.[1] || symbol || "");
    const filingUrl = row.match(/href="(https?:\/\/www\.sec\.gov\/Archives\/edgar\/data\/[^"]+)"/i)?.[1]?.replace(/^http:/, "https:") || null;
    if (!symbol || cells[4]?.toUpperCase() !== "BUY" || !filingUrl) continue;
    rows.push({ symbol, company, owner: cells[1] || null, role: cells[2] || null, transactionDateLabel: cells[3] || null, transaction: "Buy", price: parseNumber(cells[5]), shares: parseNumber(cells[6]), value: parseNumber(cells[7]), sharesAfter: parseNumber(cells[8]), filingUrl, discoverySource: "Finviz public insider feed" });
  }
  return rows;
}

async function discoverRecentInsiderBuys({ limit = 30 } = {}) {
  const html = await axios.get(FINVIZ_INSIDER_URL, {
    timeout: 20000,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ImpactOne/1.0; public market research)" },
  }).then((response) => response.data);
  const rows = parseFinvizBuyRows(html);
  const bySymbol = new Map();
  for (const row of rows) {
    const current = bySymbol.get(row.symbol) || { symbol: row.symbol, company: row.company, transactions: [], totalDiscoveredValue: 0 };
    current.transactions.push(row);
    current.totalDiscoveredValue += Number(row.value || 0);
    bySymbol.set(row.symbol, current);
  }
  return [...bySymbol.values()].sort((a, b) => b.totalDiscoveredValue - a.totalDiscoveredValue).slice(0, limit);
}

function parseSecCurrentFormFourEntries(atomXml) {
  const seen = new Set();
  const entries = [];
  for (const match of String(atomXml || "").matchAll(/<entry>([\s\S]*?)<\/entry>/gi)) {
    const block = match[1];
    const title = decodeHtml(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
    const indexUrl = decodeHtml(block.match(/<link[^>]+href="([^"]+\-index\.htm)"/i)?.[1] || "");
    if (!indexUrl || seen.has(indexUrl) || !/\(Issuer\)\s*$/i.test(title)) continue;
    seen.add(indexUrl);
    entries.push({
      company: title.replace(/^4\s*-\s*/i, "").replace(/\s*\(\d+\)\s*\(Issuer\)\s*$/i, "").trim(),
      indexUrl,
      filingDate: block.match(/Filed:&lt;\/b&gt;\s*(\d{4}-\d{2}-\d{2})/i)?.[1] || null,
    });
  }
  return entries;
}

function secDirectoryUrl(indexUrl) {
  return String(indexUrl || "").replace(/[^/]+-index\.htm(?:\?.*)?$/i, "");
}

async function settleLimited(items, worker, limit = 3) {
  const results = new Array(items.length);
  let cursor = 0;
  async function consume() {
    while (cursor < items.length) {
      const index = cursor++;
      try { results[index] = await worker(items[index]); } catch { results[index] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return results.filter(Boolean);
}

async function verifySecCurrentEntry(entry) {
  const directory = secDirectoryUrl(entry.indexUrl);
  if (!directory) return null;
  const index = await getSec(`${directory}index.json`, { timeout: DISCOVERY_TIMEOUT_MS }).then((response) => response.data);
  const names = (index?.directory?.item || []).map((item) => item?.name).filter(Boolean);
  const xmlNames = names.filter((name) => /\.xml$/i.test(name) && !/^(primary_doc|FilingSummary|MetaLinks|Financial_Report)/i.test(name));
  for (const name of xmlNames.slice(0, 3)) {
    const filingUrl = `${directory}${name}`;
    try {
      const xml = await getSec(filingUrl, { accept: "application/xml,text/xml,*/*", timeout: DISCOVERY_TIMEOUT_MS }).then((response) => response.data);
      if (typeof xml !== "string" || !/<ownershipDocument/i.test(xml)) continue;
      const parsed = parseFormFourXml(xml);
      const purchases = parsed.transactions.filter((row) => String(row.transactionCode).toUpperCase() === "P"
        && String(row.acquiredDisposedCode).toUpperCase() === "A"
        && Number(row.shares) > 0 && Number(row.pricePerShare) > 0);
      if (!purchases.length || !parsed.issuerTradingSymbol) return null;
      return {
        symbol: parsed.issuerTradingSymbol.trim().toUpperCase(),
        company: parsed.issuerName || entry.company,
        transactions: purchases.map((row) => ({
          owner: parsed.ownerName,
          role: parsed.officerTitle || (parsed.isDirector ? "Director" : parsed.isOfficer ? "Officer" : "Insider"),
          transactionDateLabel: row.transactionDate,
          price: row.pricePerShare,
          shares: row.shares,
          value: Number(row.shares) * Number(row.pricePerShare),
          filingUrl,
          discoverySource: "SEC EDGAR current Form 4 feed",
        })),
        totalDiscoveredValue: purchases.reduce((sum, row) => sum + Number(row.shares) * Number(row.pricePerShare), 0),
      };
    } catch {}
  }
  return null;
}

async function discoverRecentSecOpenMarketBuys({ limit = 30, filingLimit = 60 } = {}) {
  const params = new URLSearchParams({ action: "getcurrent", type: "4", owner: "include", start: "0", count: "100", output: "atom" });
  const atom = await getSec(`${SEC_CURRENT_FORM4_URL}?${params}`, { accept: "application/atom+xml", timeout: DISCOVERY_TIMEOUT_MS }).then((response) => response.data);
  const entries = parseSecCurrentFormFourEntries(atom).slice(0, filingLimit);
  const verified = await settleLimited(entries, verifySecCurrentEntry, 3);
  const bySymbol = new Map();
  for (const item of verified) {
    const current = bySymbol.get(item.symbol) || { symbol: item.symbol, company: item.company, transactions: [], totalDiscoveredValue: 0 };
    current.transactions.push(...item.transactions);
    current.totalDiscoveredValue += item.totalDiscoveredValue;
    bySymbol.set(item.symbol, current);
  }
  return [...bySymbol.values()].sort((a, b) => b.totalDiscoveredValue - a.totalDiscoveredValue).slice(0, limit);
}

function createDiscoveredFilingProvider(discovery) {
  return {
    async getSymbolInsiderData(symbol) {
      const normalized = String(symbol || "").trim().toUpperCase();
      const transactions = [];
      let companyTitle = discovery?.company || normalized, cik = null, filingsFetched = 0;
      const filings = [...new Map((discovery?.transactions || []).map((item) => [item.filingUrl, item])).values()];
      for (const filing of filings) {
        try {
          const xml = await getSec(filing.filingUrl, { accept: "application/xml,text/xml,*/*", timeout: 20000 }).then((response) => response.data);
          if (typeof xml !== "string") continue;
          const parsed = parseFormFourXml(xml);
          if (String(parsed.issuerTradingSymbol || "").trim().toUpperCase() !== normalized) continue;
          filingsFetched += 1;
          cik = parsed.issuerCik || cik;
          companyTitle = parsed.issuerName || companyTitle;
          for (const transaction of parsed.transactions) transactions.push({
            ownerName: parsed.ownerName, ownerCik: parsed.ownerCik, isDirector: parsed.isDirector,
            isOfficer: parsed.isOfficer, isTenPercentOwner: parsed.isTenPercentOwner,
            officerTitle: parsed.officerTitle, ...transaction,
            filingDate: transaction.transactionDate, filingUrl: filing.filingUrl,
          });
        } catch {}
      }
      return { symbol: normalized, asOf: new Date().toISOString(), dataAvailable: filingsFetched > 0, unavailableReason: filingsFetched ? null : "The discovered filing could not be independently verified as this symbol's SEC Form 4.", cik, companyTitle, transactions, filingsFetched };
    },
  };
}

module.exports = {
  FINVIZ_INSIDER_URL,
  SEC_CURRENT_FORM4_URL,
  parseFinvizBuyRows,
  parseSecCurrentFormFourEntries,
  discoverRecentInsiderBuys,
  discoverRecentSecOpenMarketBuys,
  createDiscoveredFilingProvider,
};
