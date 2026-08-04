import { apiClient } from "./apiClient";

export const workspaceApi = {
  get(folderId) {
    return apiClient.get(`/v2/workspaces/${folderId}`);
  },
  addNote(folderId, text) {
    return apiClient.post(`/v2/workspaces/${folderId}/notes`, { text });
  },
  getDecisionHistory(folderId) {
    return apiClient.get(`/v2/workspaces/${folderId}/decisions`);
  },
};
