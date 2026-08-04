# UI Inconsistencies — APPLE-QUALITY-001

Itemized findings from this phase's audit. Each entry states the real inconsistency, its real severity, and whether it was fixed this pass or only documented for a future one.

## Fixed This Pass

| # | Inconsistency | Where | Severity | Status |
|---|---|---|---|---|
| 1 | Cursor left in `"grab"`/`"grabbing"`/`"pointer"` state forever if the component unmounted mid-interaction | `Earth.jsx`, `OrbitalNode.jsx` | High — affects the whole app's cursor, not just the 3D scene | Fixed |
| 2 | 3D panel-selection nodes had no keyboard equivalent at all | `OrbitalNode.jsx` | High — a real accessibility blocker for keyboard/switch-control users | Fixed |
| 3 | `GlassPanel` markup duplicated (hand-copied) in `FlagshipScreen.jsx` instead of reusing the shared component | `FlagshipScreen.jsx` | Medium — real drift risk, already causing #4 to apply inconsistently | Fixed |
| 4 | No focus-on-open / Escape-to-close for the glass panel overlay | `GlassPanel.jsx` | Medium — missing a standard, expected dismissible-overlay behavior | Fixed |
| 5 | `data-nova-interactive` (the design system's own documented global focus-ring mechanism) was applied by zero components app-wide, including the primary `Button` | `Button.jsx` | High — every button in the app was using an unstyled fallback instead of the intended, polished focus ring | Fixed |
| 6 | Header search input suppressed its outline with no visible focus replacement | `styles.css` (`.search-box input`) | Medium — a specific, real keyboard-focus-invisibility gap | Fixed |

## Documented, Not Fixed This Pass (Disclosed Scope Boundary)

These are real observations from this session's review, not confirmed-and-then-skipped bugs of the same certainty as the items above — flagging them honestly for a future, more exhaustive pass rather than either silently ignoring them or claiming a fix that wasn't actually made and verified.

| # | Observation | Where | Why not fixed now |
|---|---|---|---|
| 7 | `data-nova-interactive` is likely missing from other interactive Nova components beyond `Button` (e.g., any clickable `Card`, nav links) — only `Button.jsx` was confirmed and fixed this pass | `components/nova/*` | A full audit of every Nova component's interactive elements against this one attribute was not completed within this phase's time; `Button` was fixed because it's confirmed as the single highest-traffic interactive element, not because it's the only one affected |
| 8 | The legacy, pre-Nova `styles.css` file (thousands of lines, several visual eras) was only spot-checked for outline-suppression patterns, not read in full | `frontend/src/styles.css` | This file predates the Nova design system and is large; a targeted grep-based check found and fixed the one real, confirmed gap (#6) rather than a line-by-line read of the entire file |
| 9 | No screen-by-screen review of the ~25 non-3D screens' spacing/typography/empty-state/error-state consistency was performed this phase | All screens outside the 3D/Flagship stack | Time-boxed scope decision — see `APPLE_QUALITY_AUDIT.md`'s Honest Scope Statement; these screens were built and reviewed across many prior, dedicated phases (Nova Foundation, Design System phases) already, so this pass prioritized the newest, never-yet-reviewed 3D/Flagship code instead of re-auditing already-reviewed ground without new evidence of a defect |

## Confirmed Already Correct (No Action Needed)

- `nova-input`/`nova-select` already have their own explicit, correct `:focus-visible` rules in `components.css` — used as the reference pattern for fixes #5 and #6 above.
- The `advanced-chart__canvas-stack` component in `styles.css` already has a correct `outline: none` + real replacement focus-visible pair — the pattern every other suppressed-outline site should match, and now does (post-fix #6).
- `CameraRig.js`'s easing curve, `OrbitalNode`'s `React.memo`/stable-array memoization, and the World State Engine's single-computation design were all re-verified this phase and found to already be correct — not touched.
