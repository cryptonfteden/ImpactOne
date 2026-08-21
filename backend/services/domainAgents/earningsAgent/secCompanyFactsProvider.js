const env = require("../../../config/env");
const cikResolver = require("../insiderAgent/cikResolver");
const { getSec } = require("../../secEdgarClient");

const DEFAULT_TIMEOUT_MS = 10000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const QUARTERLY_FORMS = new Set(["10-Q", "10-Q/A", "10-K", "10-K/A"]);
const companyFactsCache = new Map();

function isSecConfigured() {
  const identity = String(env.SEC_EDGAR_USER_AGENT || "").trim();
  return Boolean(
    identity
      && /@/.test(identity)
      && !/(?:example|your[-_ ]?(?:name|email)|replace[-_ ]?me|contact@impactone)/i.test(identity)
  );
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function factsFor(payload, names, unit) {
  for (const name of names) {
    const rows = payload?.facts?.["us-gaap"]?.[name]?.units?.[unit];
    if (Array.isArray(rows) && rows.length) return rows;
  }
  return [];
}

function dedupeQuarterly(rows) {
  const byPeriod = new Map();
  for (const row of rows || []) {
    if (!QUARTERLY_FORMS.has(row?.form) || !row?.end || finite(row?.val) === null) continue;
    const start = row.start ? new Date(row.start).getTime() : null;
    const end = new Date(row.end).getTime();
    const durationDays = start && Number.isFinite(end) ? (end - start) / 86400000 : null;
    // Duration facts from a 10-K often include a full year. Keep quarter-like
    // periods only; instant facts have no start and are allowed separately.
    if (durationDays !== null && (durationDays < 55 || durationDays > 125)) continue;
    const key = `${row.end}:${row.fp || ""}`;
    const existing = byPeriod.get(key);
    if (!existing || String(row.filed || "") > String(existing.filed || "")) byPeriod.set(key, row);
  }
  return [...byPeriod.values()].sort((a, b) => String(b.end).localeCompare(String(a.end)));
}

function latestInstant(rows, endDate) {
  return (rows || [])
    .filter((row) => QUARTERLY_FORMS.has(row?.form) && row?.end && finite(row?.val) !== null && (!endDate || row.end <= endDate))
    .sort((a, b) => String(b.end).localeCompare(String(a.end)) || String(b.filed || "").localeCompare(String(a.filed || "")))[0] || null;
}

function yoyGrowth(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const current = finite(rows[0]?.val);
  const matchedPrior = rows.find((row) => row.fp && row.fp === rows[0]?.fp && Number(row.fy) === Number(rows[0]?.fy) - 1);
  const prior = finite(matchedPrior?.val ?? rows[4]?.val);
  if (current === null || prior === null || prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}

function ratio(numerator, denominator) {
  const top = finite(numerator), bottom = finite(denominator);
  return top === null || bottom === null || bottom === 0 ? null : (top / bottom) * 100;
}

function subtractGrowth(currentA, currentB, priorA, priorB) {
  const current = finite(currentA) !== null && finite(currentB) !== null ? Number(currentA) - Number(currentB) : null;
  const prior = finite(priorA) !== null && finite(priorB) !== null ? Number(priorA) - Number(priorB) : null;
  return current === null || prior === null || prior === 0 ? null : ((current - prior) / Math.abs(prior)) * 100;
}

function parseCompanyFacts(symbol, payload) {
  const revenue = dedupeQuarterly(factsFor(payload, ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"], "USD"));
  const netIncome = dedupeQuarterly(factsFor(payload, ["NetIncomeLoss", "ProfitLoss"], "USD"));
  const grossProfit = dedupeQuarterly(factsFor(payload, ["GrossProfit"], "USD"));
  const eps = dedupeQuarterly(factsFor(payload, ["EarningsPerShareDiluted", "EarningsPerShareBasic"], "USD/shares"));
  const operatingCash = dedupeQuarterly(factsFor(payload, ["NetCashProvidedByUsedInOperatingActivities"], "USD"));
  const capex = dedupeQuarterly(factsFor(payload, ["PaymentsToAcquirePropertyPlantAndEquipment"], "USD"));
  const latestEnd = revenue[0]?.end || eps[0]?.end || null;
  const shares = latestInstant(factsFor(payload, ["CommonStocksIncludingAdditionalPaidInCapitalMember", "CommonStockSharesOutstanding"], "shares"), latestEnd);
  const epsHistory = eps.slice(0, 4).map((row) => ({ period: row.end, actual: finite(row.val), estimate: null, surprise: null, surprisePercent: null }));
  const currentRevenue = revenue[0], currentNet = netIncome.find((row) => row.end === currentRevenue?.end) || netIncome[0];
  const currentGross = grossProfit.find((row) => row.end === currentRevenue?.end) || grossProfit[0];
  const priorOperating = operatingCash.find((row) => row.fp === operatingCash[0]?.fp && Number(row.fy) === Number(operatingCash[0]?.fy) - 1) || operatingCash[4];
  const priorCapex = capex.find((row) => row.fp === capex[0]?.fp && Number(row.fy) === Number(capex[0]?.fy) - 1) || capex[4];
  const hasData = Boolean(revenue.length || netIncome.length || eps.length);
  return {
    symbol,
    asOf: new Date().toISOString(),
    periodEnd: latestEnd,
    filingUrl: null,
    sourceProvider: "SEC EDGAR Company Facts",
    dataAvailable: hasData,
    unavailableReason: hasData ? null : `SEC Company Facts returned no usable quarterly facts for "${symbol}".`,
    epsHistory,
    revenue: { growthYoY: yoyGrowth(revenue) },
    eps: { growthYoY: yoyGrowth(eps) },
    margins: { netProfitMargin: ratio(currentNet?.val, currentRevenue?.val), grossMargin: ratio(currentGross?.val, currentRevenue?.val) },
    cashFlow: { freeCashFlowGrowthYoY: subtractGrowth(operatingCash[0]?.val, capex[0]?.val, priorOperating?.val, priorCapex?.val) },
    guidance: { changed: null, direction: null },
    analystRevisions: { direction: null, count: null },
    sharesOutstanding: finite(shares?.val),
  };
}

function createSecCompanyFactsProvider({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  async function getSymbolEarnings(symbol) {
    const normalized = String(symbol || "").trim().toUpperCase();
    if (!normalized) return parseCompanyFacts(normalized, {});
    if (!isSecConfigured()) {
      const empty = parseCompanyFacts(normalized, {});
      empty.unavailableReason = "SEC_EDGAR_USER_AGENT must identify a real contact before SEC data may be requested.";
      return empty;
    }
    const owner = await cikResolver.resolveCik(normalized);
    if (!owner?.cik) {
      const empty = parseCompanyFacts(normalized, {});
      empty.unavailableReason = `SEC has no CIK mapping for "${normalized}".`;
      return empty;
    }
    try {
      const cacheKey = owner.cik;
      const cached = companyFactsCache.get(cacheKey);
      let payload = cached && Date.now() - cached.createdAt < CACHE_TTL_MS ? cached.payload : null;
      if (!payload) {
        const response = await getSec(`https://data.sec.gov/api/xbrl/companyfacts/CIK${owner.cik}.json`, { timeout: timeoutMs });
        payload = response.data || {};
        companyFactsCache.set(cacheKey, { createdAt: Date.now(), payload });
      }
      return parseCompanyFacts(normalized, payload);
    } catch (error) {
      const empty = parseCompanyFacts(normalized, {});
      empty.unavailableReason = `SEC Company Facts request failed: ${error.message}`;
      return empty;
    }
  }
  return { getSymbolEarnings };
}

module.exports = { createSecCompanyFactsProvider, parseCompanyFacts, dedupeQuarterly, yoyGrowth, factsFor, latestInstant, finite, isSecConfigured };
