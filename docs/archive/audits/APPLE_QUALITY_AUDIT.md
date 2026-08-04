# Apple-Quality Audit — APPLE-QUALITY-001 — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Date:** 2026-08-01

## Mission

The product is feature complete. From this point, behave like a Human Interface review preparing for launch — no new features, no new APIs, no backend work, only production-quality refinement. Fix only objectively inferior implementation; never redesign functionality or information architecture.

## Honest Scope Statement

This audit is real, not exhaustive-by-claim. Given the size of this codebase (dozens of screens, an established Nova design system spanning multiple prior phases, and five prior phases of freshly-written 3D/Flagship code), this pass prioritized two real, defensible strategies rather than a superficial pass over every file:

1. **Deep review of the newest, least-scrutinized code** — the 3D Workspace/Flagship/cinematic/data-visualization/living-world stack built across the five immediately preceding phases. This code had never been through a dedicated quality/accessibility review pass before now, and is exactly where a real launch-readiness review would expect to find genuine defects in freshly-built, rapidly-iterated work.
2. **Targeted verification of the established, older Nova design system's own stated guarantees** — specifically its accessibility foundation (`accessibility.css`), since that file's own comments describe a global contract ("no future component can accidentally ship with `outline: none` and no replacement") worth actually verifying rather than trusting by assumption.

Every finding below is a real, confirmed defect, verified by reading the actual code and (where applicable) tracing the actual CSS cascade — not a guess or a generic checklist item marked "reviewed" without evidence. Where I did not have time to review a given screen or component in depth, I say so rather than imply full coverage. See `UI_INCONSISTENCIES.md` for the itemized findings and `FINAL_FRONTEND_POLISH.md` for the fix-by-fix summary and what remains for a future pass.

## Real Defects Found and Fixed

### 1. Cursor-state memory leak on unmount (`Earth.jsx`, `OrbitalNode.jsx`)
Both components set `document.body.style.cursor` (`"grab"`/`"grabbing"`/`"pointer"`) on hover/drag, but neither reset it if the component unmounted while that state was active (e.g., navigating away from the Flagship screen mid-drag or mid-hover). The browser's cursor would stay stuck in a non-default state indefinitely, affecting the entire rest of the app, not just the 3D scene. **Fixed**: both components now reset `document.body.style.cursor = "auto"` in their unmount cleanup.

### 2. Zero keyboard accessibility for 3D panel selection (`OrbitalNode.jsx`)
Every one of the 3D Workspace's 7 modules and the Flagship screen's 10 panels could only be selected by clicking the 3D mesh directly — there was no way for a keyboard-only or switch-control user to reach any of them at all. The label rendered next to each node was a plain, non-interactive `<div>`. **Fixed**: the label is now a real `<button>`, reachable by Tab in document order, activatable with Enter/Space, with a real, visible `:focus-visible` ring — while the 3D mesh's own click/hover behavior is unchanged for mouse users.

### 3. Duplicated `GlassPanel` implementation (`FlagshipScreen.jsx`)
The 3D Workspace screen correctly reused the shared `GlassPanel.jsx` component; the Flagship screen instead had its own, separately hand-maintained copy of the exact same markup (header, title, close button, body). This is a real, objectively worse implementation — any future fix or improvement to the panel shell would need to be made twice, and already had started to drift (see #4 below, which only existed in `GlassPanel.jsx` until this fix). **Fixed**: `FlagshipScreen.jsx` now imports and uses the shared `GlassPanel` component; the duplicate markup is gone.

### 4. Missing focus management on panel open/close (`GlassPanel.jsx`)
Opening a panel never moved keyboard focus into it, and there was no Escape-to-close handler — both standard, expected behaviors for any dismissible overlay, present in essentially every real production UI. A keyboard or screen-reader user had no indication a panel had appeared, and no fast way to dismiss it. **Fixed**: focus now moves to the panel's own close button the instant it opens; Escape closes it from anywhere.

### 5. The app's single most-used interactive component never opted into its own design system's focus-ring mechanism (`Button.jsx`)
`accessibility.css` (from the earlier NOVA Foundation phase) defines a global, correct `:focus-visible` ring keyed off a `data-nova-interactive` attribute or `.nova-focus-ring` class, with its own comment stating this exists specifically "so no future component can accidentally ship with `outline: none` and no replacement." A repo-wide search found **zero** components anywhere actually setting `data-nova-interactive` — including `Button.jsx`, the shared, everywhere-used button component. Every `nova-button` in the entire app was falling back to the browser's unstyled default focus outline rather than the design system's own intended, polished ring. **Fixed**: `Button.jsx` now sets `data-nova-interactive`.

### 6. Header search input suppressed its focus outline with no replacement (`styles.css`)
`.search-box input` sets `outline: 0` with no accompanying focus style anywhere — a keyboard user tabbing into the header search box got zero visual confirmation it was focused. **Fixed**: added a `.search-box:focus-within` rule using the same visual language (`border-color`/`box-shadow`) already established elsewhere in the same file for exactly this purpose.

## What Was Reviewed and Found Already Correct (Not Touched)

- The eased camera transition system (`CameraRig.js`), confirmed already frame-rate-independent and already using the correct `easeInOutCubic` curve — no timing/easing defect found.
- `OrbitalNode`'s `React.memo` wrapping and the module-level stable position arrays (from `FLAGSHIP-POLISH-001`) — confirmed still correctly preventing unnecessary re-renders; no new memoization gap introduced by this phase's edits.
- The World State Engine's single-computation, no-duplicated-calculation design (`LIVING-WORLD-001`) — re-verified, still holds.
- `nova-input`/`nova-select`'s own explicit `:focus-visible` rules — already correct, used as the reference pattern for the two fixes above.

## Deliverables

See `UI_INCONSISTENCIES.md` for the full itemized list (including lower-severity notes not requiring a code change this pass) and `FINAL_FRONTEND_POLISH.md` for the complete list of files changed, test/build verification, and an honest list of what a future, more exhaustive pass should still cover.
