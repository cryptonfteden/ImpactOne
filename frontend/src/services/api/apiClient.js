import { parseJsonResponse } from "../../utils/errorHandling";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
// Phase H2 — Beta User Isolation. Same localStorage key OnboardingFlow.jsx
// writes to after resolving an invite code (see betaUserRoutes.js). Never
// set for a non-beta session — this whole mechanism is additive and
// invisible when the key is absent.
const BETA_USER_ID_STORAGE_KEY = "impactone-beta-user-id";

function betaUserHeaders() {
  try {
    const betaUserId = window.localStorage.getItem(BETA_USER_ID_STORAGE_KEY);
    return betaUserId ? { "X-Beta-User-Id": betaUserId } : {};
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const headers = { ...betaUserHeaders(), ...(options.headers || {}) };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    // Sprint 34 — callers need to tell "the server told us this genuinely
    // doesn't exist" (404) apart from "the request failed" (offline,
    // timeout, 5xx) — a fetch() network failure has no .status at all,
    // which callers can also check for the same distinction.
    const httpError = new Error(data.error || `Request failed for ${path}`);
    httpError.status = response.status;
    // Phase X4 — distinguishable identity failures (MISSING_CODE/
    // INVALID_CODE/EXPIRED_CODE/NO_IDENTITY) so callers can branch on the
    // exact failure without parsing the human-readable message.
    httpError.errorCode = data.errorCode;
    throw httpError;
  }

  return data;
}

export const apiClient = {
  get(path) {
    return request(path);
  },
  post(path, body) {
    return request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },
  patch(path, body) {
    return request(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },
  // Phase H3 — first caller (watchlist folders / price alerts / clearing a
  // notification); no request body, matching every DELETE route's shape.
  delete(path) {
    return request(path, { method: "DELETE" });
  },
};
