import { apiClient } from "./apiClient";

export const marketApi = {
  getQuote(symbol) {
    return apiClient.get(`/quote?symbol=${encodeURIComponent(symbol)}`);
  },
};
