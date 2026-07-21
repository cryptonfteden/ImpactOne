import { apiClient } from "./apiClient";

// Sprint 38 — Investment Intelligence Committee. Sprint 41 — Committee
// Unification: this is now THE ONE committee client, used by the internal
// console (IntelligenceConsoleScreen.jsx) and by useVirtualPortfolio.js's
// auto-trading gate alike. The legacy committeeApi.js (Sprint 16/18A
// committee-debate system) was retired this sprint.
export const committeeIntelligenceApi = {
  convene(symbol) {
    return apiClient.get(`/v2/committee-intelligence/${encodeURIComponent(symbol)}`);
  },
};
