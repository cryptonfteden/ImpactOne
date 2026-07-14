// Sprint 27 Priority 5 — six screens/components each ran their own 60s
// setInterval poll with no check for whether the tab was actually visible,
// so a backgrounded tab kept firing real network requests indefinitely.
// This wraps setInterval so the interval still exists (same cleanup
// contract callers already had) but skips invoking the callback while the
// document is hidden, and immediately re-runs it the moment the tab comes
// back into view (so returning to the app doesn't leave stale data
// sitting for up to a full interval).
export function startVisibilityAwarePolling(callback, intervalMs) {
  const intervalId = setInterval(() => {
    if (document.visibilityState === "visible") {
      callback();
    }
  }, intervalMs);

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      callback();
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
