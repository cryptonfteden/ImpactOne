import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Sprint 36 — utils/analytics.js's trackEvent() calls the real global
// fetch() (Node's built-in fetch, available in this test environment)
// fire-and-forget on real user interactions across many components. Left
// unmocked, those calls hit the real dev backend during test runs,
// which caused at least one real timeout (RecommendationsScreen's
// "expands full evidence" test) once recommendation_expanded/_viewed
// telemetry was added to that interaction. Stubbing fetch globally here
// means any test that doesn't explicitly mock it gets an instantly-
// resolved no-op response instead of a real network round-trip.
global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve({}) }));
