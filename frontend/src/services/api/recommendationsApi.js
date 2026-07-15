import { apiClient } from "./apiClient";

export const recommendationsApi = {
  list({ status, symbol } = {}) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (symbol) params.set("symbol", symbol);
    const query = params.toString();
    return apiClient.get(query ? `/v2/recommendations?${query}` : "/v2/recommendations");
  },
  getById(id) {
    return apiClient.get(`/v2/recommendations/${id}`);
  },
  getDecisionTrace(id) {
    return apiClient.get(`/v2/recommendations/${id}/decision-trace`);
  },
  run(watchlist = []) {
    return apiClient.post("/v2/recommendations/run", { watchlist });
  },
  status() {
    return apiClient.get("/v2/recommendations/status");
  },
  submitFeedback(id, feedbackType) {
    return apiClient.post(`/v2/recommendations/${id}/feedback`, { feedbackType });
  },
  getFeedback(id) {
    return apiClient.get(`/v2/recommendations/${id}/feedback`);
  },
  recordView(id) {
    return apiClient.post(`/v2/recommendations/${id}/view`);
  },
};
