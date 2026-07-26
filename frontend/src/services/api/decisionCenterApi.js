import { apiClient } from "./apiClient";

export const decisionCenterApi = {
  getDecisions({ source, priority, sortBy, includeDismissed } = {}) {
    const params = new URLSearchParams();
    if (source) params.set("source", source);
    if (priority) params.set("priority", priority);
    if (sortBy) params.set("sortBy", sortBy);
    if (includeDismissed) params.set("includeDismissed", "true");
    const query = params.toString();
    return apiClient.get(`/v2/decisions${query ? `?${query}` : ""}`);
  },
  // Phase X4 — Decision Center V1 actions. Every decision item's id
  // (e.g. "alert-<id>", "lifecycle-<id>", "new-rec-<id>") doubles as its
  // decisionKey — the server persists status against that exact string.
  pin(id) {
    return apiClient.post(`/v2/decisions/${id}/pin`);
  },
  dismiss(id) {
    return apiClient.post(`/v2/decisions/${id}/dismiss`);
  },
  complete(id) {
    return apiClient.post(`/v2/decisions/${id}/complete`);
  },
  clearStatus(id) {
    return apiClient.delete(`/v2/decisions/${id}/status`);
  },
};
