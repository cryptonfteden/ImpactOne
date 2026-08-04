import { apiClient } from "./apiClient";

// Sprint 39 — Explainability Layer. Internal-console consumer only this
// sprint; read-only, never a second recommendation path.
export const explainabilityApi = {
  explainRecommendation(recommendationId) {
    return apiClient.get(`/v2/explainability/recommendations/${encodeURIComponent(recommendationId)}`);
  },
  whatIf(symbol, excludeCategory) {
    return apiClient.get(`/v2/explainability/what-if/${encodeURIComponent(symbol)}?exclude=${encodeURIComponent(excludeCategory)}`);
  },
};
