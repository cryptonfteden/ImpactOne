// Phase NEWS-AGENT-001 — "Sector news" → "Affected Sectors". This
// codebase's only real, free sector/industry signal is Finnhub's real
// `finnhubIndustry` field (companyProfileProvider.js) — reused here
// (per "reuse existing infrastructure wherever possible") rather than
// inventing a fabricated multi-sector taxonomy. Returns a real
// single-sector array when the real profile is available and at least
// one real SECTOR- or MACRO-classified article exists (i.e. there is
// real news plausibly touching more than just the company itself);
// honestly empty otherwise — never a fabricated sector list.
/**
 * @param {{dataAvailable:boolean, industry:string|null}} profile - from companyProfileProvider
 * @param {Array<{eventType:string}>} classifiedArticles - real articles with eventType attached
 * @returns {string[]}
 */
function analyzeAffectedSectors(profile, classifiedArticles) {
  if (!profile.dataAvailable || !profile.industry) return [];

  const hasSectorOrMacroCoverage = classifiedArticles.some((article) => article.eventType === "SECTOR" || article.eventType === "MACRO");
  if (!hasSectorOrMacroCoverage) return [];

  return [profile.industry];
}

module.exports = { analyzeAffectedSectors };
