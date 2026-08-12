import { apiClient } from "./apiClient";

// A transparent report of the real domain-agent outputs for one symbol.
export const agentOrchestratorApi = {
  getStockIntelligence(symbol) {
    return apiClient.get(`/v2/agent-orchestrator/${encodeURIComponent(symbol)}`);
  },
};
