import { apiClient } from "./apiClient";

// Phase H2 — Beta User Isolation.
export const betaApi = {
  resolveInviteCode(code) {
    return apiClient.get(`/v2/beta/resolve?code=${encodeURIComponent(code)}`);
  },
  // Phase X4 — confirms a locally stored identity is still real and
  // non-expired before the app trusts it for a session restore.
  whoami() {
    return apiClient.get(`/v2/beta/whoami`);
  },
};
