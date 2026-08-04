// Phase X3 — Fibonacci extension point. ARCHITECTURE ONLY, per explicit
// mission instruction: "DO NOT IMPLEMENT. Create only the extension
// point." No compute/render function exists anywhere in this file or
// overlayRegistry.js's FIBONACCI entry — this documents the real shape a
// future, CEO-approved, TradingView-informed profile will need to match,
// and the real loader interface that will accept it, so implementation
// (once approved) is a matter of filling in this contract, not
// redesigning the chart.
//
// A FibonacciProfile (future shape, not implemented):
//   {
//     id: string,                 // unique profile identifier
//     name: string,                // display name (e.g. "Standard", "Extended")
//     levels: Array<{
//       ratio: number,              // e.g. 0.236, 0.382, 0.5, 0.618, 0.786, 1
//       label: string,              // display label for this level
//       color: string,              // real color token or hex
//       lineStyle: "solid" | "dashed" | "dotted",
//       visible: boolean,
//     }>,
//     extensions: Array<{ ratio: number, label: string, color: string, lineStyle: string, visible: boolean }>,
//     retracements: Array<{ ratio: number, label: string, color: string, lineStyle: string, visible: boolean }>,
//   }
//
// Multiple profiles will be loadable simultaneously (a real requirement
// named in the mission) — the future loader's real contract:
//   registerFibonacciProfile(profile: FibonacciProfile): void
//     Validates the shape above and adds it to an in-memory profile list.
//     Never mutates an already-registered profile — a re-import with the
//     same id replaces it atomically, matching this codebase's
//     "immutable, append-then-supersede" convention used elsewhere
//     (e.g. WorldMemoryThesisRevision).
//   listFibonacciProfiles(): FibonacciProfile[]
//     Returns every currently-loaded profile, for a future profile
//     switcher UI.
//   getActiveFibonacciProfile(): FibonacciProfile | null
//     The profile currently applied to the drawing layer, if any.
//
// None of the three functions above are implemented — this file exports
// only the documentation and a validation-shape check, so the contract
// itself is testable today without building the feature.

const LINE_STYLES = ["solid", "dashed", "dotted"];

function isValidLevel(level) {
  return (
    typeof level === "object" &&
    level !== null &&
    typeof level.ratio === "number" &&
    typeof level.label === "string" &&
    typeof level.color === "string" &&
    LINE_STYLES.includes(level.lineStyle) &&
    typeof level.visible === "boolean"
  );
}

// The one real, usable piece of this file today: a pure shape validator,
// so a future PR that actually implements Fibonacci (post CEO approval)
// has something to test against from day one, without this file claiming
// to render anything.
export function isValidFibonacciProfile(profile) {
  if (typeof profile !== "object" || profile === null) return false;
  if (typeof profile.id !== "string" || !profile.id) return false;
  if (typeof profile.name !== "string" || !profile.name) return false;
  if (!Array.isArray(profile.levels) || !profile.levels.every(isValidLevel)) return false;
  if (!Array.isArray(profile.extensions) || !profile.extensions.every(isValidLevel)) return false;
  if (!Array.isArray(profile.retracements) || !profile.retracements.every(isValidLevel)) return false;
  return true;
}

export const FIBONACCI_EXTENSION_STATUS = {
  implemented: false,
  pendingApproval: true,
  blockedOn: "CEO approval, pending receipt of TradingView settings to match a known-good reference configuration.",
};
