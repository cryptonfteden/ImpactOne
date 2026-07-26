import { apiClient } from "./apiClient";

// Phase X9 — Private Beta Operations Platform.
export const feedbackApi = {
  submit({ type, message, screen, browser, appVersion }) {
    return apiClient.post("/v2/feedback", { type, message, screen, browser, appVersion });
  },
  list() {
    return apiClient.get("/v2/feedback");
  },
};

export const errorReportApi = {
  report({ source, message, stack, screen, action, apiInvolved, correlationId }) {
    return apiClient.post("/v2/error-reports", { source, message, stack, screen, action, apiInvolved, correlationId });
  },
  list() {
    return apiClient.get("/v2/error-reports");
  },
};

export const featureFlagApi = {
  list() {
    return apiClient.get("/v2/feature-flags");
  },
  evaluate(key) {
    return apiClient.get(`/v2/feature-flags/${encodeURIComponent(key)}/evaluate`);
  },
  set(key, { mode, enabledForUsers, description }) {
    return apiClient.patch(`/v2/feature-flags/${encodeURIComponent(key)}`, { mode, enabledForUsers, description });
  },
};

export const adminDashboardApi = {
  get() {
    return apiClient.get("/v2/admin-dashboard");
  },
};

export const betaMetricsApi = {
  get() {
    return apiClient.get("/v2/beta-metrics");
  },
};

export const performanceMetricsApi = {
  get() {
    return apiClient.get("/v2/performance-metrics");
  },
  recordClientTiming(kind, durationMs) {
    return apiClient.post("/v2/performance-metrics/client-timing", { kind, durationMs });
  },
};

// Phase X10 — Part 7, AI Performance Dashboard.
export const aiPerformanceDashboardApi = {
  get() {
    return apiClient.get("/v2/ai-performance-dashboard");
  },
};
