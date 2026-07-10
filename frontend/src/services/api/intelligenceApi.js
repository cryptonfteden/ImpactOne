import { apiClient } from "./apiClient";

export const intelligenceApi = {
  analyze({ event, symbol }) {
    const params = new URLSearchParams();
    if (event) params.set("event", event);
    if (symbol) params.set("symbol", symbol);
    const query = params.toString();
    return apiClient.get(`/intelligence/analyze${query ? `?${query}` : ""}`);
  },
  impact({ event, symbol }) {
    const params = new URLSearchParams();
    if (event) params.set("event", event);
    if (symbol) params.set("symbol", symbol);
    const query = params.toString();
    return apiClient.get(`/intelligence/impact${query ? `?${query}` : ""}`);
  },
  history({ event }) {
    const params = new URLSearchParams();
    if (event) params.set("event", event);
    const query = params.toString();
    return apiClient.get(`/intelligence/history${query ? `?${query}` : ""}`);
  },
  scenario({ event }) {
    const params = new URLSearchParams();
    if (event) params.set("event", event);
    const query = params.toString();
    return apiClient.get(`/intelligence/scenario${query ? `?${query}` : ""}`);
  },
  portfolio(holdings = []) {
    return apiClient.post("/intelligence/portfolio", { holdings });
  },
};
