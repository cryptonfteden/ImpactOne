import { apiClient } from "./apiClient";

export const personalProgressApi = {
  get() {
    return apiClient.get("/v2/personal-progress");
  },
};
