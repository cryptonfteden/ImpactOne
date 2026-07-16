// Registers the offline app-shell service worker and detects updates so a
// stale, already-cached build doesn't silently keep serving old code.
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent("impactone:update-available"));
            }
          });
        });
      })
      .catch(() => {
        // Offline shell is a progressive enhancement; a failed registration
        // must not block the app from loading and running normally.
      });
  });
}
