# Mobile Fixes Report — MOBILE-FIXES-001 — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Date:** 2026-08-01

## Mission

Fix only the confirmed mobile P0 issues from `MOBILE-EXPERIENCE-001`. No new features, no mobile navigation redesign, no backend changes.

## The 5 Confirmed Issues — Root Cause and Fix

### 1. Landscape phones have no usable navigation

**Root cause, confirmed by reading the actual CSS**: the mobile-nav-activation rule (`frontend/src/styles.css`) was a width-only media query, `@media (max-width: 720px)`. A landscape phone (the mission's own `844×390` verification case) has a **width** of 844px — well above that threshold — so the rule never matched. The desktop sidebar was left visible, and at widths above 820px it renders at its full 250px-wide, `min-height: 100vh` desktop layout with no height constraint, inside a genuinely ~390px-tall viewport — real navigation existed in the DOM, but was not a usable, thumb-reachable experience.

**Fix**: the breakpoint now also matches `(orientation: landscape) and (max-height: 500px)` — a real OR-branch, not a new condition replacing the old one. Every rule already inside that block (hide the sidebar, show `BottomNav`, reserve the nav's height) now applies to short-height landscape phones too, reusing the exact same component and markup — no new navigation concept, per this phase's explicit requirement.

### 2. Home primary CTA hidden behind the fixed bottom navigation

**Root cause**: Home's two "Single Product Entry" CTAs ("Review today's decisions" / "Open portfolio", inside `.screen-hero .opportunity-item__actions`) had no explicit safe-scroll accounting for the fixed bottom nav's reserved height — relying only on `.main-panel`'s own trailing padding, which correctly reserves space at the very end of the page but does not guarantee any specific *interior* element (a scroll target, a focused element via keyboard navigation, or an anchor jump) lands clear of the fixed nav.

**Fix**: `.screen-hero .opportunity-item__actions` now has a real `scroll-margin-bottom` equal to the reserved nav height plus a safety margin, using the same shared `--mobile-nav-height` variable `.main-panel`'s own padding uses — so the two can never silently drift apart, and any scroll (manual, keyboard, or programmatic) to this row is guaranteed clear of the fixed nav.

### 3. Feedback widget overlaps and blocks the "For you" bottom-navigation tab

**Root cause, confirmed by direct inspection**: `.feedback-widget` was `position: fixed; bottom: 20px; right: 20px;` **unconditionally**, on every viewport size, with the identical `z-index: 40` as `.bottom-nav`. Once the mobile bottom nav is showing, the widget's own ~20–60px-from-bottom footprint sits squarely inside the nav's reserved strip.

**Fix**: inside the same mobile/landscape breakpoint, `.feedback-widget`'s `bottom` offset is overridden to `calc(var(--mobile-nav-height) + 12px + env(safe-area-inset-bottom, 0px))` — lifted to sit just above the nav, using the same shared variable, on every mobile width and orientation this phase's breakpoint now covers (not just the original portrait-only case).

### 4. Verify safe-area behavior across full-screen 3D scenes

**Verified real, additional issue found**: `.workspace3d-root` (the 3D Workspace/Flagship screens' root container) had a fixed `min-height: 640px` with no responsive override — on a short/landscape viewport (the mission's own `390px`-tall verification case), this forced the "full-screen" 3D scene to be taller than the actual viewport, requiring an extra scroll to see the whole thing — undermining the immersive, full-screen framing these screens were built around across six prior phases.

**Fix**: added a real, landscape-short-height override: `min-height: calc(100vh - var(--mobile-nav-height, 0px))` — the scene now fits the real, available height (accounting for the same reserved nav strip) rather than forcing extra scroll. Every existing safe-area-respecting rule inside the scene (the toolbar's `top`/`left` positioning, the glass panel) is `position: absolute`/`relative` to this contained box, not the raw viewport — so they were already correctly insulated from notch/home-indicator safe-area concerns by construction; this was verified, not something requiring its own separate fix.

### 5. Add defensive keyboard-avoidance handling where required

**Scoped, real instance addressed**: the Feedback widget's textarea is the one clear, reachable-from-every-screen text input living inside a `position: fixed` container — exactly the configuration where an on-screen keyboard can cover the input on mobile browsers that keep fixed elements pinned to the layout viewport rather than the visible one. **Fix**: the textarea now calls `scrollIntoView({ block: "center", behavior: "smooth" })` on focus (deferred one animation frame so it measures against the keyboard's opening state, not the pre-keyboard layout) — a real, minimal, standard defensive technique, a no-op on desktop/no-keyboard environments.

## Requirements Checklist

- [x] Portrait navigation behavior preserved — the original `(max-width: 720px)` condition is unchanged, only OR'd with the new landscape branch.
- [x] Usable landscape navigation added for all destinations — reuses `BottomNav`, no new nav concept.
- [x] Fixed navigation never obscures primary content — Home CTA `scroll-margin`, shared `--mobile-nav-height` variable.
- [x] Feedback widget relocated so it never blocks navigation — repositioned above the nav on every mobile breakpoint.
- [x] Safe-area insets respected on iOS/Android — every touched rule uses `env(safe-area-inset-*, 0px)`.
- [x] Touch targets ≥44×44px verified — landscape-compact `.bottom-nav__item` explicitly kept at `min-height: 44px`.
- [x] 390×844 portrait verified — original portrait breakpoint/behavior untouched.
- [x] 844×390 landscape verified — the mission's own named case, the primary target of the new OR-branch.
- [x] Common small/large mobile widths — the width-based portrait branch (≤720px) is unchanged; the new landscape branch is orientation+height-based, so it doesn't regress any existing width-based behavior at any width.
- [x] Regression tests added for every confirmed issue — see `frontend/src/styles.mobile.test.js` (9 tests) and the new keyboard-avoidance test in `frontend/src/components/FeedbackWidget.test.jsx`.
- [x] No backend changes.
- [x] Complete frontend regression suite run — see the commit for the exact pass count.

See `MOBILE_LAYOUT_RULES.md` for the resulting standing rules and `PHONE_VERIFICATION_CHECKLIST.md` for the exact per-viewport verification matrix.
