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
  dailyBrief({ watchlist = [], scenarios = [], sessionType = "morning" } = {}) {
    const params = new URLSearchParams();
    if (watchlist.length) params.set("watchlist", watchlist.join(","));
    if (scenarios.length) params.set("scenarios", scenarios.join(","));
    if (sessionType) params.set("sessionType", sessionType);
    const query = params.toString();
    return apiClient.get(`/intelligence/daily-brief${query ? `?${query}` : ""}`);
  },
};
