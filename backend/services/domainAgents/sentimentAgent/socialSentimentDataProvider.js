// Phase SENTIMENT-AGENT-001 — the social sentiment provider
// abstraction. This codebase has no real social-data integration
// anywhere: services/providers/definitions/redditProvider.js and
// xProvider.js are both honest stubs (`honestStubFetch`, no live
// Reddit/X API). Rather than fabricate a "social sentiment score" from
// nothing, this provider always honestly reports `dataAvailable: false`
// — exactly what this mission's "Never fabricate social ... data.
// Return honest null/unavailable fields where no real source exists."
// requirement asks for. The interface exists (and is exercised by
// sentimentAgent.js/confidenceModel.js) so that a REAL social provider
// can be swapped in later without any other file changing.
//
// ## The interface
// A conforming provider is any object exposing:
//   async getSymbolSocialSentiment(symbol) -> SocialSentimentMetrics
//
// `SocialSentimentMetrics` shape:
//   symbol, asOf, dataAvailable, unavailableReason, posts: []
function emptyMetrics(symbol, reason) {
  return { symbol, asOf: new Date().toISOString(), dataAvailable: false, unavailableReason: reason, posts: [] };
}

function createSocialSentimentDataProvider() {
  async function getSymbolSocialSentiment(symbol) {
    return emptyMetrics(symbol, "No real social data source (Reddit/X) is connected in this environment — both are honest stubs, never a fabricated reading.");
  }

  return { getSymbolSocialSentiment };
}

module.exports = { createSocialSentimentDataProvider, emptyMetrics };
