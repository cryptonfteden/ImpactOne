import { apiClient } from "./apiClient";

// Phase H3 — every call relies on apiClient's existing X-Beta-User-Id
// header injection (Phase H2); no betaUserId is ever passed explicitly
// from the frontend.
export const watchlistFoldersApi = {
  list() {
    return apiClient.get("/v2/watchlist-folders");
  },
  create(name) {
    return apiClient.post("/v2/watchlist-folders", { name });
  },
  rename(id, name) {
    return apiClient.patch(`/v2/watchlist-folders/${id}`, { name });
  },
  remove(id) {
    return apiClient.delete(`/v2/watchlist-folders/${id}`);
  },
  addSymbol(id, symbol) {
    return apiClient.post(`/v2/watchlist-folders/${id}/symbols`, { symbol });
  },
  removeSymbol(id, symbol) {
    return apiClient.delete(`/v2/watchlist-folders/${id}/symbols/${encodeURIComponent(symbol)}`);
  },
  moveSymbol(fromFolderId, toFolderId, symbol) {
    return apiClient.post(`/v2/watchlist-folders/${fromFolderId}/move`, { toFolderId, symbol });
  },
  // Phase X5 — Part 4, Professional Watchlists. `flags` is a partial
  // patch, e.g. { pinned: true } — only the provided keys change.
  setItemFlags(folderId, symbol, flags) {
    return apiClient.patch(`/v2/watchlist-folders/${folderId}/symbols/${encodeURIComponent(symbol)}`, flags);
  },
};
