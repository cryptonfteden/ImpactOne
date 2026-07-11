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
  run() {
    return apiClient.post("/v2/recommendations/run", {});
  },
  status() {
    return apiClient.get("/v2/recommendations/status");
  },
};
