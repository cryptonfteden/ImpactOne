import { apiClient } from "./apiClient";

export const dailyAgentPicksApi = {
  list({ refresh = false } = {}) {
    return apiClient.get(`/v2/daily-agent-picks${refresh ? "?refresh=true" : ""}`);
  },
};
