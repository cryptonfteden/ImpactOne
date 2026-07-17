import { useEffect, useState } from "react";

// Sprint 33 Priority 8 — resilience/offline behavior. The app had no
// online/offline awareness anywhere; a dropped connection just looked
// like every request silently failing, one screen at a time, with no
// single honest signal that the *device* is offline versus one request
// having failed for its own reason.
export default function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
