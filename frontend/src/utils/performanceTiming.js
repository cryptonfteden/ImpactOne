// Sprint 40 — Performance. Measures real elapsed time from this page's
// actual navigation start to a later milestone (first useful content,
// first recommendation rendered) using the Navigation Timing API when
// available, falling back to a module-load timestamp in environments
// without it (e.g. some test runners). Never blocks rendering — a pure
// read of an existing timestamp, never awaited by a caller.
const FALLBACK_BOOT_TIMESTAMP = Date.now();

/** Milliseconds since this page began loading, rounded to a whole ms. */
export function msSinceBoot() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return Math.max(0, Math.round(performance.now()));
  }
  return Math.max(0, Date.now() - FALLBACK_BOOT_TIMESTAMP);
}
