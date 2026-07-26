import { apiClient } from "./apiClient";

// Phase X7 — Part 1, Market Intelligence Engine. Composes Impact Graph,
// Market Positioning, Opportunity Score, Alerts, and AI Summary into one
// real object per symbol (see backend/services/symbolIntelligenceService.js).
export const symbolIntelligenceApi = {
  get(symbol) {
    return apiClient.get(`/v2/symbol-intelligence/${encodeURIComponent(symbol)}`);
  },
};
