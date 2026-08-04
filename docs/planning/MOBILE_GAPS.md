# Mobile Gaps — MOBILE-EXPERIENCE-001

Every gap found this session, ranked strictly by real-phone user impact. Each entry states the exact evidence gathered (measurement or code citation), not a visual impression alone.

## Critical

### G1 — Landscape phone has zero primary navigation
**Evidence:** At 844×390 (confirmed after a full page reload, not a resize artifact): `<aside class="sidebar">` computes `display: none`; both `<nav>` elements compute to 0×0 dimensions. The only remaining path to any screen is "Quick actions," which exposes exactly 3 of 24 real destinations (Home, Portfolio, Alerts).
**Impact:** A user who rotates their phone — one of the most ordinary gestures there is — loses access to Decision Center, Workspaces, Mission Control, every Workspace screen, Market Positioning, Global Intelligence, AI Analysis, Recommendations, Daily Feed, Themes, My Profile, and Settings until they rotate back.
**Fix shape:** Add an explicit `@media (orientation: landscape)` fallback nav (even a compact top bar or the existing bottom-nav rotated to a side rail) rather than relying purely on the current width-based breakpoint, which treats a landscape phone the same as a narrow desktop window.

### G2 — Primary hero CTAs hidden behind the fixed bottom nav on first load
**Evidence:** At 390×844, scrolled to top: "Review today's decisions" (top 790 / bottom 828) and "Open portfolio" (top 836 / bottom 875, i.e. **31px past the bottom of the 844px viewport**) render at the same vertical band as the fixed bottom nav (top 790 / bottom 838). Confirmed visually — neither button is visible in the initial viewport; the hero card appears to end abruptly where the nav begins.
**Impact:** The two most important actions on the app's own daily-use screen are effectively unreachable without scrolling in a very specific, non-obvious way.
**Fix shape:** Add bottom padding/margin to the hero card's action row equal to the fixed nav's real height + safe-area inset, the same pattern already correctly used for the bottom-nav's own safe-area padding.

## High

### G3 — Floating Feedback button overlaps the bottom navigation
**Evidence:** Feedback button rect: left 244 / right 355 / top 783 / bottom 824. "For you" nav tab rect: left 224 / right 297 / top 790 / bottom 838. Overlap: **~53×34px directly over "For you"**, with the Feedback button's right edge (355) also reaching 57px into "Profile"'s left edge (298). A real Playwright click on "For you" failed after 18+ actionability retries with `<button aria-label="Give feedback">... intercepts pointer events` as the reported cause — not a hypothesis, a reproduced interaction failure.
**Impact:** Two of five primary nav destinations are difficult or impossible to tap reliably depending on exact tap coordinates and target device's touch-hit-testing behavior.
**Fix shape:** Reposition the Feedback affordance off the bottom-nav row entirely (e.g. a smaller icon integrated into the header, or raised well above the nav's safe area).

### G4 — No keyboard-avoidance handling anywhere
**Evidence:** Zero matches for `visualViewport` and zero focus-triggered `scrollIntoView` calls anywhere in `frontend/src` (the one existing `scrollIntoView` call is for an unrelated anchor link).
**Impact:** Inputs positioned lower on a page (folder-name field on Workspaces, trade-quantity field on Portfolio) may render behind the on-screen keyboard on a real phone, especially iOS Safari, which does not auto-resize the layout viewport.
**Fix shape:** Add a shared `useKeyboardAvoidance`-style hook (visualViewport resize listener + conditional scroll/margin) applied to the app's text inputs, or at minimum verify + fix the specific inputs most likely to sit low on a page.

## Medium

### G5 — Header controls below minimum touch-target size
**Evidence:** Alerts/notifications/quick-actions/account icon buttons all measure 38×38px; the search "Go" button measures 46×36px. Apple HIG minimum is 44×44pt, Material minimum is 48×48dp.
**Impact:** Increased mis-tap rate for the app's most frequently used top-level controls.
**Fix shape:** Increase the tappable hit area (padding or a larger invisible hit-slop) to at least 44×44px without necessarily growing the visual icon.

### G6 — Top-heavy first paint
**Evidence:** On a 390×844 viewport, title + search + market-status pill + four stacked icon buttons occupy roughly the top 35% of the screen before any real content renders.
**Impact:** Pushes the "morning brief" — the app's own stated daily-habit moment — below the fold on first load.
**Fix shape:** Collapse the icon row to a single horizontal line (already partially achieved on some screens) and/or reduce vertical padding in the header on narrow viewports.

### G7 — Weak loading state on the flagship 3D screen
**Evidence:** The Flagship scene shows only a small, unstyled spinner glyph in the corner of an otherwise empty dark viewport during initial load, vs. Home's descriptive text state ("Building today's summary").
**Impact:** The single highest-value, most differentiated screen in the product has the weakest "something is happening" signal.
**Fix shape:** Reuse Home's descriptive-text loading pattern, or add a branded loading treatment consistent with the scene's own visual language.

### G8 — Small text sampled below outdoor-readable size
**Evidence:** Live sample of Home-screen text nodes: 8 of 58 (≈14%) render below 12px, down to 10px and 11.2px.
**Impact:** Hard to read in direct sunlight or screen glare, compounding the app's dark/glass visual language.
**Fix shape:** Raise the floor for any user-facing micro-copy to ≥12px; reserve sub-12px only for genuinely decorative/non-essential marks.

### G9 — Safe-area handling not yet confirmed on fullscreen 3D scenes
**Evidence:** `env(safe-area-inset-*)` is used correctly in `styles.css` (header, bottom nav) but was not found in `flagshipScreen.css`/`workspace3d.css`, which render full-bleed under the status bar/notch by design (`viewport-fit=cover` is set).
**Impact:** Unconfirmed risk that in-scene controls (panel close buttons, camera hints) could render under a real notch/Dynamic Island — cannot be verified without a real device.
**Fix shape:** Add explicit safe-area padding to any interactive UI layered over the 3D canvas; verify on at least one notched and one Dynamic-Island device before first real install.

## Low / Verify Only (no code defect confirmed, but real-phone-only risk)

### G10 — Edge-swipe gesture collision, untested
Full-bleed 3D camera-drag interactions have a well-known collision risk with iOS edge-swipe-back and Android's system back-gesture. Not reproducible in this environment; needs a real-device pass before first install.

### G11 — Status bar contrast on 3D scenes, untested
`black-translucent` status-bar style means the app must supply its own contrast under system time/battery/signal icons; not verified against the 3D scene's varying dark backgrounds.
