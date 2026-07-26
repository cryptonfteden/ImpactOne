import { apiClient } from "./apiClient";

export const priceAlertsApi = {
  list() {
    return apiClient.get("/v2/price-alerts");
  },
  create({ symbol, direction, targetPrice }) {
    return apiClient.post("/v2/price-alerts", { symbol, direction, targetPrice });
  },
  deactivate(id) {
    return apiClient.patch(`/v2/price-alerts/${id}/deactivate`);
  },
  remove(id) {
    return apiClient.delete(`/v2/price-alerts/${id}`);
  },
  check() {
    return apiClient.post("/v2/price-alerts/check");
  },
};
