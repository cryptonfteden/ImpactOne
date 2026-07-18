import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import AppRoot from "./AppRoot";
import AppProviders from "./context/AppProviders";
import { registerServiceWorker } from "./registerServiceWorker";
import { trackEvent } from "./utils/analytics";

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

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <AppProviders>
        <AppRoot />
      </AppProviders>
    </React.StrictMode>
  );
}