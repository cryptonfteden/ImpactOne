export function normalizeError(error, fallbackMessage = "Unexpected error") {
  if (!error) {
    return { message: fallbackMessage };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {
    message: error.message || fallbackMessage,
    stack: error.stack,
  };
}

// Phase X9 — Part 3, Crash & Error Reporting. Every real call to
// logError() — already the established, single choke point every screen
// in this app already routes its caught errors through — now also
// becomes one real, structured ErrorReport row, and one real
// `error_encountered` analytics event. Both are fire-and-forget (never
// awaited, never able to throw back into the caller) and both are
// dynamically imported to avoid a require cycle with analytics.js/the
// API client, which themselves may call logError on their own failures.
let reportingModules = null;
function loadReportingModules() {
  if (!reportingModules) {
    reportingModules = Promise.all([import("../services/api"), import("./analytics")]);
  }
  return reportingModules;
}

export function logError(scope, error) {
  const normalized = normalizeError(error);
  console.error(`[frontend] ${scope}`, normalized.message, normalized.stack || "");

  if (typeof window === "undefined") return;
  loadReportingModules()
    .then(([{ errorReportApi }, { trackEvent }]) => {
      errorReportApi
        .report({ source: "frontend", message: normalized.message, stack: normalized.stack, action: scope })
        .catch(() => {
          // Reporting the error must never itself surface a second error.
        });
      trackEvent("error_encountered", { errorScope: String(scope).slice(0, 200) });
    })
    .catch(() => {
      // Same — a failure to even load the reporting modules stays silent.
    });
}

export async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}
