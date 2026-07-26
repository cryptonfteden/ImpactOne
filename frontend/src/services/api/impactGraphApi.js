import { apiClient } from "./apiClient";

export const impactGraphApi = {
  getGraph(symbol) {
    return apiClient.get(`/v2/impact-graph/${encodeURIComponent(symbol)}`);
  },
  // Phase X4 — merges the real per-symbol graphs for every symbol the
  // beta user actually holds / tracks in a workspace.
  getPortfolioGraph() {
    return apiClient.get(`/v2/impact-graph/portfolio`);
  },
  getWorkspaceGraph(folderId) {
    return apiClient.get(`/v2/impact-graph/workspace/${encodeURIComponent(folderId)}`);
  },
};
