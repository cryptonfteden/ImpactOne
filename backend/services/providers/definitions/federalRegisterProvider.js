const axios = require("axios");
const { createUnifiedProvider } = require("../providerAbstraction");
const { classifyThemes, marketImpactExplanation, impactScore } = require("../../marketNewsIntelligence");

const FEDERAL_REGISTER_API = "https://www.federalregister.gov/api/v1/documents.json";

function normalizeFederalRegisterDocument(document = {}) {
  // Federal Register exposes a publication date, not an intraday timestamp.
  // Midnight UTC keeps the date honest and avoids making same-day documents
  // appear to come from the future in morning sessions.
  const publishedAt = document.publication_date ? new Date(`${document.publication_date}T00:00:00Z`) : null;
  if (!document.title || !document.html_url || !publishedAt || Number.isNaN(publishedAt.getTime())) return null;
  const base = {
    eventType: `federal-register-${String(document.type || "document").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    sourceType: "government",
    sourceName: "Federal Register",
    sourceUrl: document.html_url,
    publishedAt: publishedAt.toISOString(),
    symbols: [],
    sectors: [],
    summary: document.title,
    description: document.abstract || "",
  };
  const classification = classifyThemes(base);
  const materialTheme = classification.themeIds.some((theme) => theme !== "US_POLICY");
  const materialImpact = impactScore(base) >= 72;
  return {
    ...base,
    sectors: classification.sectors,
    themes: classification.themeIds,
    rawReference: {
      documentNumber: document.document_number || null,
      type: document.type || null,
      agencies: (document.agencies || []).map((agency) => agency.name).filter(Boolean),
      abstract: document.abstract || null,
      impactOneInference: marketImpactExplanation(base, classification),
    },
    credibilityScore: 100,
    freshnessScore: 92,
    relevanceScore: materialTheme || materialImpact ? 85 : 45,
    confidence: 92,
  };
}

async function fetchFederalRegisterEvents() {
  const response = await axios.get(FEDERAL_REGISTER_API, {
    params: { per_page: 50, order: "newest" },
    timeout: 15000,
  });
  return (response.data?.results || []).map(normalizeFederalRegisterDocument).filter(Boolean).slice(0, 30);
}

module.exports = createUnifiedProvider({
  providerId: "federalRegister",
  label: "Federal Register",
  sourceType: "government",
  category: "regulation",
  defaultThemes: ["US_POLICY"],
  rateLimit: { maxPerMinute: 10 },
}, fetchFederalRegisterEvents, { cacheTtlMs: 30 * 60 * 1000 });

module.exports.normalizeFederalRegisterDocument = normalizeFederalRegisterDocument;
module.exports.fetchFederalRegisterEvents = fetchFederalRegisterEvents;
