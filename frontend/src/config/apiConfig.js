// Phase PHONE-INSTALLATION-001 — single source of truth for the public
// API origin. Three call sites (apiClient.js, analytics.js,
// DashboardFooter.jsx) previously each duplicated the same
// `import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"`
// line. (A fourth, AIInsightsSidebar.jsx, was removed as dead code in
// RELEASE-CANDIDATE-001 — it had zero real importers.) That fallback is
// harmless on a developer's own machine, but a
// real phone on cellular/Wi-Fi can never reach "localhost" — it resolves
// to the phone itself, not the founder's dev machine — so a production
// build missing VITE_API_BASE_URL would silently ship a URL no real
// device can ever connect to. See startupValidation.js's
// validateOrigins(), which surfaces exactly this as a real, reported
// startup issue instead of failing invisibly.
// Use the same loopback address as the local Vite app. On some desktop
// browser hosts `localhost` resolves to a separate IPv6/isolated endpoint,
// which can leave a perfectly healthy local backend appearing empty.
const isLocalPreview = typeof window !== "undefined"
  && ["127.0.0.1", "localhost"].includes(window.location.hostname);

// A local Vite preview must always address the local backend directly. This
// avoids a stale inherited VITE_API_BASE_URL making an otherwise healthy
// local chart look like it has no market data.
export const API_BASE_URL = isLocalPreview
  ? "http://127.0.0.1:5000/api"
  : import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";
