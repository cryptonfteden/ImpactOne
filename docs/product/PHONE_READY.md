# Phone Ready — MOBILE-EXPERIENCE-001

**Question:** Is ImpactOne ready for its first real installation on a phone?
**Answer:** Not yet — one Critical navigation defect (landscape) and one Critical layout defect (hidden hero CTAs) should be closed first. Everything else is real but secondary.

## What Is Already Genuinely Phone-Ready

- **Installable as a PWA today.** `manifest.json` is linked, `apple-mobile-web-app-capable`/`apple-mobile-web-app-status-bar-style`/`apple-mobile-web-app-title` are all set correctly in `index.html` — a user can genuinely "Add to Home Screen" and get an app-like launch.
- **`viewport-fit=cover` + real `env(safe-area-inset-*)` usage** on the header and bottom nav — this is not a guess, it's confirmed in `styles.css` and is the correct, deliberate choice for a notch/Dynamic-Island device.
- **Portrait bottom navigation is correctly designed** — 5 items, 48px-tall tap targets, positioned in the natural thumb zone.
- **Honest, text-based loading state on Home** ("Building today's summary") — a good pattern that should be the house standard everywhere, including the 3D scenes.
- **Body text baseline of 16px** — a healthy, readable default that most of the app's content actually uses.
- **No crashes, no console errors caused by responsive breakpoints** — the width-based breakpoints that exist work correctly within their intended ranges; the gaps found are edge cases (landscape, keyboard, notch verification), not broad instability.

## What Must Be Fixed Before the First Real Install

1. **Landscape navigation is completely absent** (`MOBILE_GAPS.md` G1) — this alone should block a first real-device install, since rotating the phone is not an edge case, it's an ordinary action.
2. **The home screen's own primary action buttons are hidden behind the fixed bottom nav on load** (G2) — a first-time user's very first "what do I tap" moment is broken.
3. **The Feedback button overlaps and blocks part of the bottom nav** (G3) — confirmed via a real failed tap interaction, not a visual guess.

## What Should Be Verified On an Actual Device Before Wider Rollout

- Keyboard behavior on real inputs (no `visualViewport` handling exists in code today — G4).
- Notch/Dynamic-Island occlusion specifically on the fullscreen 3D scenes (G9).
- Edge-swipe gesture collision between the 3D camera drag and the OS back-gesture (G10).
- Status-bar icon contrast against the 3D scene's varying dark backgrounds (G11).
- Real outdoor/sunlight legibility of the ~14% of text sampled below 12px (G8).

## Bottom Line

The foundation is real: this is an installable, safe-area-aware PWA with a correctly-designed portrait navigation model — most of the hard infrastructure decisions were made correctly. The blockers are specific, nameable, and shallow to fix (a missing landscape breakpoint, a spacing/z-index collision, a floating widget's position) — not a sign the mobile experience needs to be rebuilt. Recommended: fix the 3 "must fix" items above, then do one real-device pass against the 5 "verify" items, then this is genuinely ready for a first real install.
