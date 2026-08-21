import { apiClient } from "./apiClient";

export const insiderOpportunitiesApi = {
  list(symbols = []) {
    const query = Array.isArray(symbols) && symbols.length ? `?symbols=${encodeURIComponent(symbols.join(","))}` : "";
    return apiClient.get(`/v2/insider-opportunities${query}`);
  },
};
