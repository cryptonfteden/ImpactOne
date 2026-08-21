import { apiClient } from "./apiClient";

export const weeklyFibonacciOpportunitiesApi = {
  list(symbols = []) {
    const query = Array.isArray(symbols) && symbols.length ? `?symbols=${encodeURIComponent(symbols.join(","))}` : "";
    return apiClient.get(`/v2/weekly-fibonacci-opportunities${query}`);
  },
};
