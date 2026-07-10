import { apiClient } from "./apiClient";

export const watchlistApi = {
  getIntelligence(symbols = []) {
    const query = symbols.length ? `?symbols=${encodeURIComponent(symbols.join(","))}` : "";
    return apiClient.get(`/watchlist${query}`);
  },
};
