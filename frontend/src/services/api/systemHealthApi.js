import { apiClient } from "./apiClient";

// Phase X6 — Part 4/5.
export const systemHealthApi = {
  get() {
    return apiClient.get("/v2/system-health");
  },
};
