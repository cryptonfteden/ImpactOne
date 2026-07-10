import { apiClient } from "./apiClient";

export const altDataApi = {
  getCot(symbol) {
    const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return apiClient.get(`/alt-data/cot${query}`);
  },
  getPolymarket(symbol) {
    const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return apiClient.get(`/alt-data/polymarket${query}`);
  },
  getMacro() {
    return apiClient.get("/alt-data/macro");
  },
  getSec(symbol) {
    const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return apiClient.get(`/alt-data/sec${query}`);
  },
  getCongress(symbol) {
    const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return apiClient.get(`/alt-data/congress${query}`);
  },
  getEvents(symbol) {
    const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return apiClient.get(`/alt-data/events${query}`);
  },
  getSummary(symbol) {
    const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return apiClient.get(`/alt-data/summary${query}`);
  },
};
