# Mobile Layout Rules — MOBILE-FIXES-001

The standing rules this phase establishes for any future mobile-affecting change.

## The One Shared Nav-Height Variable

```css
:root {
  --mobile-nav-height: 64px;
}
```

Any element that needs to clear the mobile bottom nav — a scroll-margin on a CTA, a fixed widget's offset, a full-screen scene's available height — **must** reference `var(--mobile-nav-height)`, never a repeated literal pixel value. This is the direct fix for how issue #3 (the Feedback widget) happened in the first place: the nav's own height and the widget's clearance offset were two independent, unrelated numbers that had already drifted apart. One shared variable makes that class of bug structurally impossible going forward.

## The Real Mobile-Nav-Activation Breakpoint

```css
@media (max-width: 720px), (orientation: landscape) and (max-height: 500px) {
  /* hide sidebar, show BottomNav, reserve --mobile-nav-height */
}
```

This is now the **one** real condition for "should the mobile nav be showing." Any future screen-specific mobile behavior should key off this same condition (or a subset of it), not invent a second, competing breakpoint. It combines two real signals:

- **Narrow width** (`max-width: 720px`) — the original portrait-phone signal, unchanged.
- **Short landscape height** (`orientation: landscape` AND `max-height: 500px`) — the new signal this phase adds, chosen because real phone landscape heights (typically 375–430px) fall well under 500px, while tablets/desktops in landscape do not.

## Rule: Fixed Mobile Chrome Must Account for the Reserved Nav Height

Any `position: fixed` element that can appear on a mobile viewport (a floating action button, a toast, a widget) must have a real mobile-breakpoint override that either:

1. Sits **above** `var(--mobile-nav-height)` (like the Feedback widget's fix this phase), or
2. Is explicitly confirmed not to spatially overlap the nav's own screen region (e.g., a top-anchored element).

A fixed element with a bottom offset that was only ever designed/tested against a no-nav desktop layout is exactly the bug class found this phase.

## Rule: Full-Screen/Immersive Containers Must Have a Responsive Height Floor

A `min-height` chosen for a "full-screen" experience on a typical viewport (e.g., `640px`, chosen for the 3D scene) is not automatically safe on every real device — a short/landscape phone can be shorter than that floor. Any such container needs a real, landscape/short-height override that yields the actual, available height rather than forcing scroll on a screen meant to read as immersive and complete.

## Rule: Primary/Actionable Content Gets a Real `scroll-margin-bottom`

Any button or interactive element positioned near a screen's natural end (a hero CTA, a form's submit button) should carry `scroll-margin-bottom: calc(var(--mobile-nav-height) + <safety margin> + env(safe-area-inset-bottom, 0px))` inside the mobile-nav-activation breakpoint — this guarantees any scroll to it (manual, keyboard-focus-driven, or a programmatic `scrollIntoView`) always clears the fixed nav, independent of the specific reason it might otherwise have landed short.

## Rule: `env(safe-area-inset-*, 0px)` Everywhere a Real Device Edge Is Involved

Every rule this phase touched that measures from a real screen edge (top, bottom, left, right) includes the matching `env(safe-area-inset-*, 0px)` term with an explicit `0px` fallback — never a bare pixel value assuming a non-notched, non-gesture-bar device. This was already the established convention before this phase (see the pre-existing `.bottom-nav`/`.main-panel`/`.header-bar` rules); this phase's own new rules (`--mobile-nav-height` consumers, the Feedback widget override) follow it too.

## Rule: A Landscape-Compact Variant Never Drops Below 44×44px

Any landscape-specific size reduction (icon size, label font size, padding) applied to conserve a short phone's limited vertical space must leave the real, interactive touch-target area (`min-height`/`min-width` on the actual clickable element) at or above 44px — reduce visual chrome around the target, never the target itself.

## Regression Testing Convention for CSS-Only Mobile Fixes

No real browser/visual-regression tool is available in this environment (the same disclosed limitation carried through every 3D-related phase this session). CSS-only layout fixes that jsdom cannot render or measure are regression-tested by reading the real stylesheet source and asserting the specific rules/values a fix depends on are present and correctly wired to each other (see `frontend/src/styles.mobile.test.js`) — the same "read the real source and assert its structure" technique already established in this codebase's backend (`unification.test.js` and similar), applied here to CSS instead of JS. Any future mobile CSS fix should add its own test to this same file rather than relying on visual inspection alone.
