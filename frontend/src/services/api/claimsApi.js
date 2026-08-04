import { apiClient } from "./apiClient";

// Phase UI-INTEGRATION-001 — the frontend's one entry point to the Claim
// Intelligence Layer. Every screen that shows "what does the platform
// believe, why, and how confident" should read through this file, never
// recompute a belief client-side.
export const claimsApi = {
  listActive({ limit } = {}) {
    const query = limit ? `?limit=${encodeURIComponent(limit)}` : "";
    return apiClient.get(`/v2/claims/active${query}`);
  },
  listBySymbol(symbol, { limit } = {}) {
    const query = limit ? `?limit=${encodeURIComponent(limit)}` : "";
    return apiClient.get(`/v2/claims/symbols/${encodeURIComponent(symbol)}${query}`);
  },
  listPortfolioRelevant() {
    return apiClient.get("/v2/claims/portfolio-relevant");
  },
  listContested({ limit } = {}) {
    const query = limit ? `?limit=${encodeURIComponent(limit)}` : "";
    return apiClient.get(`/v2/claims/contested${query}`);
  },
  listRecentlyInvalidated({ limit } = {}) {
    const query = limit ? `?limit=${encodeURIComponent(limit)}` : "";
    return apiClient.get(`/v2/claims/invalidated${query}`);
  },
  listOvernightChanges({ limit } = {}) {
    const query = limit ? `?limit=${encodeURIComponent(limit)}` : "";
    return apiClient.get(`/v2/claims/overnight-changes${query}`);
  },
  listRecentlyResolved({ since, limit } = {}) {
    const params = new URLSearchParams();
    if (since) params.set("since", since);
    if (limit) params.set("limit", limit);
    const query = params.toString();
    return apiClient.get(`/v2/claims/resolved${query ? `?${query}` : ""}`);
  },
  getHistory(claimId) {
    return apiClient.get(`/v2/claims/${encodeURIComponent(claimId)}/history`);
  },
  getStrongestEvidence(claimId, { limit } = {}) {
    const query = limit ? `?limit=${encodeURIComponent(limit)}` : "";
    return apiClient.get(`/v2/claims/${encodeURIComponent(claimId)}/strongest-evidence${query}`);
  },
};
