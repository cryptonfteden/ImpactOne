// Phase NEWS-AGENT-001 — "Event classification" + "Company-specific
// news" + "Sector news" + "Macro news". A disclosed, keyword/name-
// match heuristic over each real article's own title+description —
// never an ML/LLM classifier. A real mention of the symbol or the
// real company name (from companyProfileProvider.js) is treated as
// COMPANY-specific; failing that, a real hit against a disclosed
// macro-keyword list is treated as MACRO; anything else defaults to
// SECTOR (the article is presumably relevant to this symbol — it was
// returned by a query for it — but doesn't name the company or a macro
// theme directly).
const MACRO_KEYWORDS = [
  "federal reserve", "fed ", "interest rate", "inflation", "gdp", "unemployment",
  "recession", "tariff", "treasury", "jobs report", "cpi", "fomc", "monetary policy",
];

function normalize(text) {
  return (text || "").toLowerCase();
}

/**
 * @param {{ title: string|null, description: string|null }} article
 * @param {string} symbol
 * @param {string|null} companyName
 * @returns {"COMPANY"|"SECTOR"|"MACRO"}
 */
function classifyArticle(article, symbol, companyName) {
  const text = `${normalize(article.title)} ${normalize(article.description)}`;
  const normalizedSymbol = (symbol || "").toLowerCase();
  const normalizedCompanyName = normalize(companyName);

  if ((normalizedSymbol && text.includes(normalizedSymbol)) || (normalizedCompanyName && text.includes(normalizedCompanyName))) {
    return "COMPANY";
  }
  if (MACRO_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return "MACRO";
  }
  return "SECTOR";
}

/**
 * @param {Array<object>} articles - real articles
 * @param {string} symbol
 * @param {string|null} companyName
 * @returns {Array<object>} each article merged with its real `eventType` field
 */
function classifyArticles(articles, symbol, companyName) {
  return articles.map((article) => ({ ...article, eventType: classifyArticle(article, symbol, companyName) }));
}

module.exports = { classifyArticle, classifyArticles, MACRO_KEYWORDS };
