import { useEffect, useState } from "react";

// Sprint 34 — registerServiceWorker.js already dispatches
// "impactone:update-available" the instant a new service worker installs
// while an old one is controlling the page, but nothing was listening:
// a user could sit on stale code indefinitely with no way to know a
// newer build existed. This surfaces that real signal and reloads to
// pick up the new version already sitting in the browser's cache.
export default function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    function handleUpdateAvailable() {
      setUpdateAvailable(true);
    }
    window.addEventListener("impactone:update-available", handleUpdateAvailable);
    return () => window.removeEventListener("impactone:update-available", handleUpdateAvailable);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="update-banner" role="status">
      <span>A new version of ImpactOne is ready.</span>
      <button type="button" className="update-banner__button" onClick={() => window.location.reload()}>
        Reload to update
      </button>
    </div>
  );
}
