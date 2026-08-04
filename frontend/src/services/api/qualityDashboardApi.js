import { apiClient } from "./apiClient";

export const qualityDashboardApi = {
  get() {
    return apiClient.get("/v2/quality-dashboard");
  },
  getLearningSignals() {
    return apiClient.get("/v2/quality-dashboard/learning-signals");
  },
};
