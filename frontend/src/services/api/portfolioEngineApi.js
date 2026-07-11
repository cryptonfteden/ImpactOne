import { apiClient } from "./apiClient";

function withLimit(path, limit) {
  return limit ? `${path}?limit=${encodeURIComponent(limit)}` : path;
}

export const portfolioEngineApi = {
  getSummary() {
    return apiClient.get("/v2/portfolio");
  },
  placeOrder({ symbol, side, quantity, sector, assetType }) {
    return apiClient.post("/v2/portfolio/orders", { symbol, side, quantity, sector, assetType });
  },
  getTrades(limit) {
    return apiClient.get(withLimit("/v2/portfolio/trades", limit));
  },
  getTransactions(limit) {
    return apiClient.get(withLimit("/v2/portfolio/transactions", limit));
  },
  getPerformance(limit) {
    return apiClient.get(withLimit("/v2/portfolio/performance", limit));
  },
  captureSnapshot() {
    return apiClient.post("/v2/portfolio/performance/snapshot", {});
  },
  reset() {
    return apiClient.post("/v2/portfolio/reset", {});
  },
};
