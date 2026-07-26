import { apiClient } from "./apiClient";

// Phase PRODUCT-001 — the frontend's one entry point to the canonical
// Morning Brief service. Never recomputed client-side; the returned
// items are already prioritized by the real Attention Engine.
export const morningBriefApi = {
  getToday() {
    return apiClient.get("/v2/morning-brief/today");
  },
};
