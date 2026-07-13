import { parseJsonResponse } from "../../utils/errorHandling";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || `Request failed for ${path}`);
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
