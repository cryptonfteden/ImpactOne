import { apiClient } from "./apiClient";

// Phase X7 — Part 4, Market Dashboard.
export const executiveDashboardApi = {
  get() {
    return apiClient.get("/v2/executive-dashboard");
  },
};
