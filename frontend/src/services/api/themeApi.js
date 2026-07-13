import { apiClient } from "./apiClient";

export const themeApi = {
  list() {
    return apiClient.get("/v2/themes");
  },
  get(themeKey) {
    return apiClient.get(`/v2/themes/${encodeURIComponent(themeKey)}`);
  },
};
