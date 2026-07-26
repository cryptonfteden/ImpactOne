import { apiClient } from "./apiClient";

export const notificationsApi = {
  list({ groupBy } = {}) {
    const query = groupBy ? `?groupBy=${encodeURIComponent(groupBy)}` : "";
    return apiClient.get(`/v2/notifications${query}`);
  },
  markRead(id) {
    return apiClient.patch(`/v2/notifications/${id}/read`);
  },
  pin(id) {
    return apiClient.post(`/v2/notifications/${id}/pin`);
  },
  unpin(id) {
    return apiClient.post(`/v2/notifications/${id}/unpin`);
  },
  clear(id) {
    return apiClient.delete(`/v2/notifications/${id}`);
  },
};
