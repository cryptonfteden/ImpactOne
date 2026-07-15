import { apiClient } from "./apiClient";

export const qualityDashboardApi = {
  get() {
    return apiClient.get("/v2/quality-dashboard");
  },
};
