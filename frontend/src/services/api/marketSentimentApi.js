import { apiClient } from "./apiClient";

// Phase UI-INTEGRATION-001 — frontend entry point to the Market
// Sentiment Engine (backend built in Phase AI-ENGINE-002.1, routed this
// phase).
export const marketSentimentApi = {
  getOverview(market = "US") {
    return apiClient.get(`/v2/market-sentiment/overview?market=${encodeURIComponent(market)}`);
  },
};
