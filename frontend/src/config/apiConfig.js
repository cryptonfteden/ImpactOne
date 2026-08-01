// Phase PHONE-INSTALLATION-001 — single source of truth for the public
// API origin. Four call sites (apiClient.js, analytics.js,
// DashboardFooter.jsx, AIInsightsSidebar.jsx) previously each duplicated
// the same `import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"`
// line. That fallback is harmless on a developer's own machine, but a
// real phone on cellular/Wi-Fi can never reach "localhost" — it resolves
// to the phone itself, not the founder's dev machine — so a production
// build missing VITE_API_BASE_URL would silently ship a URL no real
// device can ever connect to. See startupValidation.js's
// validateOrigins(), which surfaces exactly this as a real, reported
// startup issue instead of failing invisibly.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
