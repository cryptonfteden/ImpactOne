import { apiClient } from "./apiClient";

export const providerApi = {
  list() {
    return apiClient.get("/v2/providers");
  },
  getHealth(providerId) {
    return apiClient.get(`/v2/providers/${encodeURIComponent(providerId)}/health`);
  },
  getMetrics(providerId) {
    return apiClient.get(`/v2/providers/${encodeURIComponent(providerId)}/metrics`);
  },
  getDiagnostics(providerId) {
    return apiClient.get(`/v2/providers/${encodeURIComponent(providerId)}/diagnostics`);
  },
  getMetadata(providerId) {
    return apiClient.get(`/v2/providers/${encodeURIComponent(providerId)}/metadata`);
  },
  run(providerId) {
    return apiClient.post(`/v2/providers/${encodeURIComponent(providerId)}/run`);
  },
};
