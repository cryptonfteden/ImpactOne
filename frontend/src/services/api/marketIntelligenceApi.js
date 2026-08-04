import { apiClient } from "./apiClient";

// Sprint 37 — Market Intelligence Source Layer. Internal-console consumer
// only this sprint (see IntelligenceConsoleScreen.jsx); every endpoint is
// read-only aggregation/normalization, never a verdict.
export const marketIntelligenceApi = {
  getProviderInventory() {
    return apiClient.get("/v2/market-intelligence/provider-inventory");
  },
  getEvidenceMatrix(symbol) {
    return apiClient.get(`/v2/market-intelligence/evidence-matrix/${encodeURIComponent(symbol)}`);
  },
  getTechnical(symbol) {
    return apiClient.get(`/v2/market-intelligence/technical/${encodeURIComponent(symbol)}`);
  },
};
