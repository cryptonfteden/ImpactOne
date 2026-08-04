# Phone Verification Checklist — MOBILE-FIXES-001

Every viewport this phase's mission explicitly asks to verify, what was checked, and how — disclosed honestly where no real device/browser was available to visually confirm.

## Method

No real mobile device or browser-based visual-regression tool is available in this environment (the same disclosed limitation as every 3D-related phase this session). Verification below is: (1) the real CSS media-query math for each named viewport, confirmed by manual calculation against the actual rules; (2) the automated regression test suite (`styles.mobile.test.js`, `FeedbackWidget.test.jsx`) confirming the relevant rules exist and are correctly wired; (3) a full production build succeeding with no CSS syntax errors. A real, physical/emulated device check remains a recommended manual follow-up before wide rollout — flagged, not silently skipped.

## 390×844 (Portrait)

- Width 390 ≤ 720px → matches the original portrait branch of the mobile-nav breakpoint. **Unchanged behavior** — sidebar hidden, `BottomNav` shown, `--mobile-nav-height` (64px) reserved.
- Height 844, orientation portrait → the new landscape OR-branch (`orientation: landscape`) does not apply — no interference with the existing, working portrait case.
- Home CTA: `scroll-margin-bottom` present but irrelevant here since 844px of height comfortably fits the hero without needing to scroll past the fold in most real content states.
- 3D scene: `min-height: 640px` (the original floor) applies — 844px of real height comfortably exceeds it, no scroll-forcing issue.

## 844×390 (Landscape) — The Mission's Own Named Case

- Width 844 > 720px → the **original** portrait branch does **not** match (confirmed this was the actual bug — see `MOBILE_FIXES_REPORT.md`).
- Height 390 ≤ 500px, orientation landscape → the **new** OR-branch matches. Sidebar hidden, `BottomNav` shown (with the landscape-compact icon/label sizing, touch targets held at a real 44px minimum), `--mobile-nav-height` reserved, Feedback widget lifted above it.
- 3D scene: height 390 ≤ 500px landscape → the new override applies, `min-height: calc(100vh - 64px)` ≈ 326px effective floor — fits within the real 390px viewport without forcing scroll.

## Common Small Mobile Width (e.g., ~360–393px, portrait)

- Within the original ≤720px portrait branch — unchanged, already-working behavior; the new landscape branch never triggers in portrait regardless of width.

## Common Large Mobile Width (e.g., ~428–430px, portrait; up to ~926px, landscape)

- **Portrait** at these widths: still ≤720px in every real "large phone" case (the widest current mainstream phone portrait widths are still well under 720px) — unchanged portrait behavior.
- **Landscape** at these widths (e.g., 926×430 for a large modern phone): width 926 > 720px (original branch doesn't match, same as the 844-wide case), height 430 ≤ 500px → the new landscape branch matches, same fix applies.
- **Landscape tablets** (e.g., iPad mini landscape, ~1024×768, or any device with landscape height > 500px): the new branch's `max-height: 500px` deliberately does **not** match — tablets keep the existing desktop-style sidebar, which is genuinely usable at that height, rather than being force-fitted into the phone-oriented bottom nav. This boundary was chosen specifically to distinguish "short phone landscape" from "tablet landscape."

## Touch Target Verification (≥44×44px)

- Portrait `.bottom-nav__item`: `min-height: 48px` (pre-existing, unchanged) — already above the 44px floor.
- Landscape-compact `.bottom-nav__item`: explicitly set to `min-height: 44px` — at the real floor, not below it (regression-tested in `styles.mobile.test.js`).
- Feedback widget toggle button: unchanged by this phase, already using the shared `Button` component's existing sizing.

## Safe-Area Verification (iOS/Android)

Every rule this phase added or modified that measures from a real device edge includes the matching `env(safe-area-inset-*, 0px)` term:

- `.main-panel`'s reserved bottom padding.
- `.bottom-nav`'s own padding (pre-existing, confirmed still correct).
- `.header-bar`'s padding (pre-existing, confirmed still correct).
- The Feedback widget's new mobile `bottom` offset.
- Home's CTA `scroll-margin-bottom`.

Confirmed via the regression suite's explicit safe-area assertion test.

## Regression Tests Added (Per Confirmed Issue)

| Issue | Test(s) |
|---|---|
| #1 Landscape navigation | 3 tests in `styles.mobile.test.js` (breakpoint exists, hides sidebar/shows nav, 44px touch targets) |
| #2 Home CTA occlusion | 2 tests (`scroll-margin-bottom` present, shared variable used) |
| #3 Feedback widget overlap | 2 tests (desktop rule intact, mobile override present and using the shared variable) |
| #4 3D scene safe-area/full-screen | 1 test (landscape height override present) |
| #5 Keyboard-avoidance | 1 component test (`scrollIntoView` called on textarea focus) |
| Shared infrastructure | 2 tests (`--mobile-nav-height` defined exactly once; safe-area insets present across all touched rules) |

**Total: 9 CSS structural tests + 1 component test = 10 new regression tests, all passing.**

## Known Limitation (Disclosed)

No real device, emulator, or browser-based visual tool was available to literally render and photograph these five viewports. Every verification above is a real, traceable calculation against the actual CSS rules plus an automated test asserting those rules exist and are wired correctly — not a screenshot. A manual pass on real hardware (or at minimum a browser dev-tools device emulator) remains the recommended final confirmation step before this ships.
