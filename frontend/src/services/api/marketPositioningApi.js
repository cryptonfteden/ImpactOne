import { apiClient } from "./apiClient";

// Phase X2 — Market Positioning, Opportunity Score, Alert-type
// architecture listing, and Advanced Chart data.
export const marketPositioningApi = {
  getPositioning(symbols) {
    return apiClient.get(`/v2/market/positioning?symbols=${encodeURIComponent(symbols.join(","))}`);
  },
  getOpportunityScore(symbol) {
    return apiClient.get(`/v2/market/opportunity-score/${encodeURIComponent(symbol)}`);
  },
  listAlertTypes() {
    return apiClient.get("/v2/market/alert-types");
  },
  getChart(symbol, range = "3mo") {
    // A chart must never reuse a stale empty response after a provider
    // reconnects. The server cache still protects real provider calls.
    return apiClient.get(`/v2/market/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&refresh=${Date.now()}`);
  },
};
