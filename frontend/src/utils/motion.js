// Phase X12B — NOVA Foundation, Part 5: Motion Foundation (JS mirror).
//
// The JS-side twin of styles/motion.css's tokens, for any animation
// driven by JS (Canvas chart transitions, a JS-orchestrated stagger)
// rather than a CSS transition/animation. Values are kept numerically
// identical to tokens.css's --nova-motion-* custom properties by
// convention (there is no build-time codegen bridging CSS and JS in this
// project yet — see MOTION_FOUNDATION.md's "known duplication" note) so
// there is exactly one place either kind of caller looks for "how long
// should this take."
export const MOTION_DURATION_MS = Object.freeze({
  micro: 120,
  standard: 200,
  screen: 320,
  aiThinkingLoop: 1800,
});

export const MOTION_CURVE = Object.freeze({
  enter: "cubic-bezier(0.16, 1, 0.3, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
  hover: "ease-in-out",
});

// The one real detection function every JS-driven animation must call
// before choosing a duration — mirrors ThemeProvider's "OS signal OR
// explicit in-app override" rule so a JS animation and a CSS one always
// agree on whether motion is reduced for a given user, regardless of
// which mechanism triggered it.
export function prefersReducedMotion() {
  if (typeof document !== "undefined" && document.documentElement.getAttribute("data-motion") === "reduced") {
    return true;
  }
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The one helper every JS-driven animation should route its duration
// through — returns 0 under reduced motion so a caller's animation logic
// (e.g. requestAnimationFrame loops) can treat "reduced" as "skip
// straight to the end state" without a separate branch.
export function resolveDurationMs(durationMs) {
  return prefersReducedMotion() ? 0 : durationMs;
}
