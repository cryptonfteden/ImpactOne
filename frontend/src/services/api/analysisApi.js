import { apiClient } from "./apiClient";

export const analysisApi = {
  analyze(payload) {
    return apiClient.post("/ai/analyze", payload);
  },
  compare(symbol) {
    return apiClient.get(`/compare?symbol=${encodeURIComponent(symbol)}`);
  },
};
