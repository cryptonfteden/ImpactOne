import { apiClient } from "./apiClient";

export const outcomeIntelligenceApi = {
  listLessons(limit) {
    return apiClient.get(limit ? `/v2/lessons?limit=${limit}` : "/v2/lessons");
  },
};
