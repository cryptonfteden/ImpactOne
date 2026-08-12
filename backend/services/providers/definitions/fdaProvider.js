const axios = require("axios");
const { createUnifiedProvider } = require("../providerAbstraction");

function toIsoDate(value) {
  const text = String(value || "");
  if (/^\d{8}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

async function fetchFdaEvents() {
  const response = await axios.get("https://api.fda.gov/drug/enforcement.json", {
    params: { limit: 10, sort: "report_date:desc" },
    timeout: 15000,
  });

  return (response.data?.results || []).map((record) => {
    const publishedDate = toIsoDate(record.report_date);
    return {
    eventType: "fda-drug-recall",
    sourceType: "government",
    sourceName: "FDA Drug Enforcement Reports",
    sourceUrl: "https://open.fda.gov/apis/drug/enforcement/",
    publishedAt: publishedDate ? new Date(`${publishedDate}T00:00:00Z`).toISOString() : null,
    symbols: [],
    sectors: ["Health Care"],
    summary: `${record.classification || "FDA"} recall: ${record.product_description || record.reason_for_recall || "drug enforcement report"}`,
    rawReference: {
      recallNumber: record.recall_number || null,
      status: record.status || null,
      classification: record.classification || null,
      reason: record.reason_for_recall || null,
    },
    credibilityScore: 95,
    freshnessScore: 75,
    confidence: 80,
    };
  });
}

module.exports = createUnifiedProvider(
  {
    providerId: "fda",
    label: "FDA",
    sourceType: "government",
    category: "healthcare",
    defaultThemes: ["healthcare"],
    rateLimit: { maxPerMinute: 10 },
  },
  fetchFdaEvents
);

module.exports.toIsoDate = toIsoDate;
