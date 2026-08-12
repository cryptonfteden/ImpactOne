import { apiClient } from "./apiClient";

export const marketApi = {
  getQuote(symbol) {
    return apiClient.get(`/quote?symbol=${encodeURIComponent(symbol)}`);
  },
  getShortVolumeRange(symbol, sessions) {
    return apiClient.get(`/quote/short-volume?symbol=${encodeURIComponent(symbol)}&sessions=${encodeURIComponent(sessions)}`);
  },
};
