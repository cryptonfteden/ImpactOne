import useOnlineStatus from "../hooks/useOnlineStatus";

// Sprint 33 Priority 8 — a persistent, honest signal whenever the device
// itself has no connection, distinct from any one screen's own request
// failure. Names exactly what's true: you're offline, cached screens
// still work, live data won't update, reconnect to resume. Never claims
// data is current while this banner is showing.
export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-banner" role="status">
      You're offline. Already-loaded screens stay usable, but nothing here is live right now — reconnect to get current data.
    </div>
  );
}
