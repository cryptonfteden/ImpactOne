import { apiClient } from "./apiClient";

// Phase PERSONAL-INTELLIGENCE-001 — the frontend's first consumer of the
// already-real, already-tested backend personalization snapshot
// (personalizationService.js's getPersonalizationProfile, routed at
// GET /api/v2/personalization). No new backend logic — this is a thin
// client, the same one-call-per-route shape every other API client
// module in this file already follows.
export const personalizationApi = {
  get() {
    return apiClient.get("/v2/personalization");
  },
};
