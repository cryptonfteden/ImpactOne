// Sprint 37 Priority 6 — COT Intelligence.
//
// CFTC's Commitments of Traders report is genuinely free, public, and
// requires no API key or account — publicreporting.cftc.gov exposes it as
// a Socrata Open Data API (JSON REST, no auth). This is a real, LIVE
// integration, not a fixture, unlike most of this sprint's other new
// sources.
//
// Publication schedule (from CFTC's own published schedule, not assumed):
// the report reflects positions AS OF Tuesday and is PUBLISHED the
// following Friday at 3:30pm ET — a ~3-day lag between report date and
// publication, and a full week between reports. This module never labels
// the report "daily" and computes staleness against the real weekly
// cadence, not a same-day assumption.
const axios = require("axios");
const { ADAPTER_STATUS, buildAdapterResult } = require("./adapterEnvelope");

const PROVIDER_ID = "cftcCot";
const COT_DATASET_URL = "https://publicreporting.cftc.gov/resource/6dca-aqww.json";
const REPORT_TO_PUBLICATION_LAG_DAYS = 3; // Tuesday report -> Friday publication
const NORMAL_REPORT_INTERVAL_DAYS = 7;
const STALE_THRESHOLD_DAYS = NORMAL_REPORT_INTERVAL_DAYS + 4; // one missed cycle + buffer

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function computePublicationDate(reportDate) {
  if (!reportDate) return null;
  const date = new Date(reportDate);
  date.setDate(date.getDate() + REPORT_TO_PUBLICATION_LAG_DAYS);
  return date.toISOString().slice(0, 10);
}

function normalizeRow(row) {
  const commercialLong = toNumber(row.comm_positions_long_all);
  const commercialShort = toNumber(row.comm_positions_short_all);
  const nonCommercialLong = toNumber(row.noncomm_positions_long_all);
  const nonCommercialShort = toNumber(row.noncomm_positions_short_all);
  const reportDate = row.report_date_as_yyyy_mm_dd ? row.report_date_as_yyyy_mm_dd.slice(0, 10) : null;

  return {
    market: row.market_and_exchange_names || null,
    reportDate,
    publicationDate: computePublicationDate(reportDate),
    commercial: { long: commercialLong, short: commercialShort, net: Number.isFinite(commercialLong) && Number.isFinite(commercialShort) ? commercialLong - commercialShort : null },
    nonCommercial: { long: nonCommercialLong, short: nonCommercialShort, net: Number.isFinite(nonCommercialLong) && Number.isFinite(nonCommercialShort) ? nonCommercialLong - nonCommercialShort : null },
    openInterest: toNumber(row.open_interest_all),
    longChange: toNumber(row.change_in_noncomm_long_all),
    shortChange: toNumber(row.change_in_noncomm_short_all),
  };
}

function computeWeekOverWeek(current, previous) {
  if (!current || !previous || !Number.isFinite(current.nonCommercial.net) || !Number.isFinite(previous.nonCommercial.net)) return null;
  return {
    netPositioningChange: current.nonCommercial.net - previous.nonCommercial.net,
    direction: current.nonCommercial.net > previous.nonCommercial.net ? "MORE_NET_LONG" : current.nonCommercial.net < previous.nonCommercial.net ? "MORE_NET_SHORT" : "UNCHANGED",
  };
}

// Percentile of the current net non-commercial position among the
// available history — only computed when there's enough history to be
// meaningful (this codebase's existing convention: honest insufficient-
// data rather than a percentile computed on 2 data points).
function computePercentile(history) {
  if (history.length < 20) return null;
  const nets = history.map((row) => row.nonCommercial.net).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const current = history[0].nonCommercial.net;
  if (!Number.isFinite(current) || !nets.length) return null;
  const rank = nets.filter((value) => value <= current).length;
  return Math.round((rank / nets.length) * 100);
}

function computeStaleStatus(reportDate) {
  if (!reportDate) return "UNKNOWN";
  const ageDays = Math.floor((Date.now() - new Date(reportDate).getTime()) / 86400000);
  return ageDays > STALE_THRESHOLD_DAYS ? "STALE" : "CURRENT";
}

async function fetchHistoryForMarket(marketQuery, { limit = 26 } = {}) {
  const response = await axios.get(COT_DATASET_URL, {
    params: {
      "$limit": limit,
      "$order": "report_date_as_yyyy_mm_dd DESC",
      "$where": `market_and_exchange_names like '${marketQuery.replace(/'/g, "")}%'`,
    },
    timeout: 10000,
  });
  return (response.data || []).map(normalizeRow);
}

async function getCotIntelligence(marketQuery) {
  if (!marketQuery || !String(marketQuery).trim()) {
    return buildAdapterResult({
      providerId: PROVIDER_ID,
      status: ADAPTER_STATUS.ERROR,
      scope: marketQuery || null,
      errorState: "A market name is required (e.g. \"NASDAQ MINI\", \"GOLD\").",
    });
  }

  try {
    const history = await fetchHistoryForMarket(marketQuery);
    if (!history.length) {
      return buildAdapterResult({
        providerId: PROVIDER_ID,
        status: ADAPTER_STATUS.LIVE,
        scope: marketQuery,
        errorState: `No CFTC COT market matched "${marketQuery}".`,
      });
    }

    const [current, previous] = history;
    const staleStatus = computeStaleStatus(current.reportDate);

    return buildAdapterResult({
      providerId: PROVIDER_ID,
      status: staleStatus === "STALE" ? ADAPTER_STATUS.DEGRADED : ADAPTER_STATUS.LIVE,
      scope: current.market,
      sourceTimestamp: current.publicationDate,
      rawSignal: current,
      normalizedSignal: {
        ...current,
        weekOverWeek: computeWeekOverWeek(current, previous),
        percentile: computePercentile(history),
        staleStatus,
        reportingCadence: "WEEKLY", // never "daily" — see module header
        historyDepth: history.length,
      },
      evidenceStrength: staleStatus === "STALE" ? 20 : 55,
      provenance: { sourceName: "CFTC Commitments of Traders (official)", sourceUrl: "https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm" },
    });
  } catch (error) {
    return buildAdapterResult({
      providerId: PROVIDER_ID,
      status: ADAPTER_STATUS.ERROR,
      scope: marketQuery,
      errorState: error.message || "CFTC COT request failed.",
    });
  }
}

module.exports = { getCotIntelligence, computeWeekOverWeek, computePercentile, computeStaleStatus, normalizeRow };
