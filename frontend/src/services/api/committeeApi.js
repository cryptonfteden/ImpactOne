import { apiClient } from "./apiClient";

export const committeeApi = {
  analyze({ symbol, context, intelligenceReport, altDataSummary, marketImpact } = {}) {
    return apiClient.post("/committee/analyze", {
      symbol,
      context,
      intelligenceReport,
      altDataSummary,
      marketImpact,
    });
  },
  trackRecord(symbol) {
    const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return apiClient.get(`/committee/track-record${query}`);
  },
};
