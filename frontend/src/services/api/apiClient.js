import { parseJsonResponse } from "../../utils/errorHandling";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    // Sprint 34 — callers need to tell "the server told us this genuinely
    // doesn't exist" (404) apart from "the request failed" (offline,
    // timeout, 5xx) — a fetch() network failure has no .status at all,
    // which callers can also check for the same distinction.
    const httpError = new Error(data.error || `Request failed for ${path}`);
    httpError.status = response.status;
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
};
