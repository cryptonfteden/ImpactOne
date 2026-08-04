import { apiClient } from "./apiClient";

export const homeApi = {
  getSummary(watchlist = []) {
    const query = watchlist.length ? `?watchlist=${encodeURIComponent(watchlist.join(","))}` : "";
    return apiClient.get(`/v2/home-summary${query}`);
  },
};
