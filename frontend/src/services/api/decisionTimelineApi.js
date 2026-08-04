import { apiClient } from "./apiClient";

// Phase X7 — Part 3, Decision Timeline.
export const decisionTimelineApi = {
  get() {
    return apiClient.get("/v2/decision-timeline");
  },
};
