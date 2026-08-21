import { apiClient } from "./apiClient";

export const strategyLabApi = {
  status() { return apiClient.get("/v2/strategy-lab"); },
};
