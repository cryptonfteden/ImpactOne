import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
// Phase X12B — NOVA Foundation. Loaded after styles.css so its token-
// driven utility classes are available, but nothing in styles.css or any
// existing screen references a --nova-* token or .nova-* class yet — this
// import is additive only, changes zero existing rendered pixels.
import "./styles/tokens.css";
import "./styles/theme.css";
import "./styles/typography.css";
import "./styles/motion.css";
import "./styles/layout.css";
import "./styles/accessibility.css";
// Phase X12C.0 — NOVA Showcase. The real, reusable NOVA component
// library's styles — consumed only by the dev-only Showcase this phase,
// not by any existing screen.
import "./styles/components.css";
import AppRoot from "./AppRoot";
import AppProviders from "./context/AppProviders";
import AppErrorBoundary from "./components/AppErrorBoundary";
import NovaShowcaseScreen from "./screens/NovaShowcaseScreen";
import { registerServiceWorker } from "./registerServiceWorker";
import { trackEvent } from "./utils/analytics";

// Phase X12C.0 — NOVA Showcase. A real route (a literal URL path,
// checked here since this app has no router — see NOVA_SHOWCASE.md's
// "why no react-router" note), gated the same way every other dev-only
// screen in this codebase is gated (VITE_DEV_CONSOLE, same precedent as
// Health/Admin Dashboard/Intelligence Console). BOTH conditions must be
// true: the flag is never set in a production build, so this route is
// structurally unreachable in production regardless of the URL typed —
// not just hidden from nav.
const IS_NOVA_SHOWCASE_ROUTE =
  typeof window !== "undefined" && window.location.pathname === "/nova-showcase" && import.meta.env.VITE_DEV_CONSOLE === "true";

registerServiceWorker();

// Sprint 35 Priority 5 — "first open" telemetry. Fires exactly once per
// device/browser profile, ever — gated on its own localStorage flag so
// reloads and subsequent sessions don't repeat it (that's what
// "returning_user", tracked elsewhere, is for).
const FIRST_OPEN_KEY = "impactone-first-open-tracked";
if (typeof window !== "undefined" && !window.localStorage.getItem(FIRST_OPEN_KEY)) {
  window.localStorage.setItem(FIRST_OPEN_KEY, "true");
  trackEvent("first_open");
}

// Phase X9 — Part 1. `app_opened` fires every real load (unlike
// `first_open`, which is once-ever) — the real "a session started" event
// Beta Metrics' DAU/session counts are built from. `session_ended` fires
// on real tab-close/navigate-away, with the real elapsed duration —
// `visibilitychange`'s "hidden" transition is the standard, reliable
// signal for this (unlike `beforeunload`, which mobile browsers often
// skip entirely).
const SESSION_START_MS = Date.now();
if (typeof window !== "undefined") {
  trackEvent("app_opened");
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      trackEvent("session_ended", {}, { durationMs: Date.now() - SESSION_START_MS });
    }
  });
}

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <AppProviders>{IS_NOVA_SHOWCASE_ROUTE ? <NovaShowcaseScreen /> : <AppRoot />}</AppProviders>
      </AppErrorBoundary>
    </React.StrictMode>
  );
} else {
  // Phase X6 — Part 1. If the mount point itself is missing, React never
  // gets a chance to render anything — this is the one failure mode
  // AppErrorBoundary structurally cannot catch (it's a React component;
  // there's no tree to catch into). A plain-DOM fallback is the only way
  // to avoid a blank white page here.
  document.body.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;text-align:center;padding:24px;">' +
    "<div><h1>ImpactOne couldn't start</h1><p>Please reload the page. If this keeps happening, let us know.</p></div></div>";
}