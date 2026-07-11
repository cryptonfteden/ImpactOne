import { apiClient } from "./apiClient";

export const chatApi = {
  ask({ question, context } = {}) {
    return apiClient.post("/chat/ask", { question, context });
  },
};
