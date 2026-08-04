import { apiClient } from "./apiClient";

// Phase UI-INTEGRATION-001 — frontend entry point to the Unusual Options
// Agent (backend built in Phase AI-ENGINE-001.1, routed this phase).
export const optionsAgentApi = {
  getStatus() {
    return apiClient.get("/v2/options-agent/status");
  },
  getSymbolView(symbol) {
    return apiClient.get(`/v2/options-agent/symbols/${encodeURIComponent(symbol)}`);
  },
};
