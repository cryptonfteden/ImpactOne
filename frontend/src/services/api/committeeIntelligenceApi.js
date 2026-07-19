import { apiClient } from "./apiClient";

// Sprint 38 — Investment Intelligence Committee. Internal-console consumer
// only this sprint (see IntelligenceConsoleScreen.jsx); read-only, never a
// verdict. Distinct from the legacy committeeApi.js (Sprint 16/18A
// committee-debate system wired into the live recommendation flow).
export const committeeIntelligenceApi = {
  convene(symbol) {
    return apiClient.get(`/v2/committee-intelligence/${encodeURIComponent(symbol)}`);
  },
};
