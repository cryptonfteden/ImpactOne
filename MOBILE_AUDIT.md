# Mobile Experience Audit — MOBILE-EXPERIENCE-001

**Scope:** Live audit of the installable PWA at 390×844 (portrait phone) and 844×390 (landscape phone), cross-checked against source (`frontend/index.html`, CSS media queries, JS). No production code modified. `sprint-16-live-data` @ `1fd39fc`.
**Method:** Real browser viewport emulation + DOM/computed-style measurement (exact pixel rectangles, not visual guesses) + targeted source greps for the mechanisms that would only matter on a real device (safe-area insets, visualViewport handling, orientation media queries).

---

## 1. Touch Ergonomics

**Measured, live:** Bottom nav items are 73×48px — the 48px height clears Apple's 44pt / Material's 48dp minimum. The four header icon buttons (alerts, notifications, quick actions, account) are **38×38px** — below both platforms' minimum touch target guidance. The header "Go" search button is 46×36px — width fine, height below minimum. The two hero-card primary CTAs ("Review today's decisions", "Open portfolio") are 38px tall.
**Why it matters:** Sub-44px targets measurably increase mis-taps, especially for icon-only buttons stacked vertically with no gap-tolerant hit-slop.
**Severity:** Medium — nothing is unreachable, but everything above the bottom nav is smaller than it should be.

## 2. Thumb Reach

**Finding:** The bottom nav (primary destinations) is correctly placed in the natural thumb zone. Everything else of consequence — search, alerts, notifications, quick actions, account — sits at the very top-left, the single hardest spot to reach one-handed on a large phone. There is no bottom-anchored primary action for the most common single task (e.g. "check today's brief") beyond the nav itself.
**Why it matters:** A phone-first product should put its most-used actions where thumbs naturally land; right now the daily-use actions (alerts/notifications) require a stretch or a hand-shift.
**Severity:** Medium

## 3. Navigation

**Finding (portrait, 390px):** Correct — a clean 5-item bottom nav (Home / Feed / Portfolio / For you / Profile).
**Finding (landscape, 844×390 — confirmed via live DOM measurement, not a visual guess):** **Zero primary navigation is rendered.** `<aside class="sidebar">` computes to `display: none`; both `<nav>` elements compute to 0×0. The only remaining path to any screen is the header's "Quick actions" menu, which contains exactly **3** shortcuts (Open Home / Open Portfolio / Open Alerts) — out of 24 real destinations. Confirmed reproducible after a full page reload, not a stale-resize artifact.
**Why it matters:** Rotating a phone to landscape is one of the most natural, common gestures (reading a chart, watching a video-style panel, wide typing). On a real device this is a **complete navigation dead-end** to 21 of 24 screens until the phone is rotated back — worse than the desktop-sidebar-in-landscape regression this app has fought (and partially fixed) across many prior phases; the current build appears to have regressed to "no nav at all" rather than "wrong nav."
**Severity:** Critical

## 4. Safe Areas

**Finding:** `env(safe-area-inset-*)` is genuinely used — bottom nav padding (`calc(6px + env(safe-area-inset-bottom))`), and header padding on all four sides — a real, correct implementation, not a guess. However, it exists in exactly **one** stylesheet (`styles.css`); the fullscreen, edge-to-edge Flagship/3D Workspace scenes (`flagshipScreen.css`, `workspace3d.css`) were not confirmed to apply the same insets to their own overlay UI (panel headers, close buttons, camera controls) — these render full-bleed behind the status bar/notch area by design, and their in-scene controls should be independently verified against a real notch before shipping.
**Why it matters:** A control rendered under a physical notch or Dynamic Island is unreachable, not just ugly — this only becomes visible on a real device with a real cutout, never in a browser viewport emulation.
**Severity:** Medium (verify-before-ship item, not a confirmed defect)

## 5. Status Bar

**Finding:** `apple-mobile-web-app-status-bar-style: black-translucent` is set, meaning the web content extends under the status bar and must supply its own contrast there. Combined with the safe-area-inset-top padding on the header (§4), the header itself should be correctly protected — but this was not re-verified against the 3D fullscreen scenes, which have dark space/starfield backgrounds that may or may not provide enough contrast for system status-bar icons (time, battery, signal) at every scroll/camera position.
**Severity:** Low-Medium (verify-before-ship)

## 6. Notches

**Finding:** `viewport-fit=cover` is correctly set, meaning the app opts into using the full display including the notch/Dynamic-Island cutout area — this is the right choice given the header's own safe-area padding (§4), but it raises the stakes on §4/§5's open verification items, since opting in without protecting every full-bleed screen risks content actually sitting under the cutout rather than just near it.
**Severity:** Low-Medium (verify-before-ship)

## 7. Gestures

**Finding:** The 3D scenes (Flagship, 3D Workspace) use pointer-drag for camera orbit/parallax. This was not stress-tested against iOS's edge-swipe-back gesture or Android's system back-gesture, both of which claim screen-edge drag input on real devices in a way desktop browser emulation cannot reproduce. A drag that starts near the left or right screen edge on a real phone may trigger the OS "go back" gesture instead of (or in addition to) the camera drag.
**Why it matters:** This is a textbook "only visible on a real phone" risk — untestable in this environment, but a well-known collision class for any full-bleed draggable 3D/carousel UI.
**Severity:** Medium (untested, flagged for real-device verification)

## 8. Keyboard

**Finding:** No `visualViewport` API usage and no `scrollIntoView`-on-focus handling exist anywhere in the frontend (confirmed via a repo-wide search — the one existing `scrollIntoView` call is for an unrelated anchor link, not form-input focus). Every text input relies entirely on the browser's own default keyboard-avoidance behavior.
**Why it matters:** iOS Safari in particular does not automatically resize the layout viewport when the keyboard opens; without explicit handling, an input lower on a page (e.g. "Folder name" on Workspaces, the trade-quantity field on Portfolio) can end up hidden behind the keyboard, and fixed-position elements (bottom nav, the Feedback pill) can behave inconsistently while the keyboard is open. This cannot be fully verified in a desktop browser and needs a real-device pass.
**Severity:** Medium-High (unverified, but a well-known real-phone-only failure mode given the confirmed absence of any mitigation code)

## 9. Orientation

**See §3 (Navigation)** — the confirmed, most severe orientation-specific finding. Beyond navigation, no dedicated `@media (orientation: landscape)` rule exists anywhere in the CSS (confirmed via search) — every mobile/desktop layout decision is width-based only, which is the direct root cause of §3.
**Severity:** Critical (same finding as §3)

## 10. Performance Perception

**Finding:** Not deeply load-tested this session (no network throttling available in this environment), but the "first paint" experience is dominated by four stacked header icons and a large empty dark area while data loads (see §11) — nothing communicates "the app is working," only "the app has icons and then nothing."
**Severity:** Medium

## 11. Loading Perception

**Finding:** Two different loading treatments were observed: Home shows a text status ("Building today's summary") — good, communicates progress. The Flagship 3D scene showed only a small, bare, unstyled spinner glyph in the corner of an otherwise empty dark viewport during initial load — easy to miss, and indistinguishable from "nothing is happening" on a small phone screen glanced at quickly.
**Why it matters:** The flagship, highest-value screen has the weakest loading treatment in the app.
**Severity:** Medium

## 12. Readability Outdoors

**Finding:** Body baseline is a healthy 16px, but a live sample of visible text nodes on the Home screen found **8 of 58 (≈14%)** rendered below 12px (as low as 10px and 11.2px) — micro-copy, timestamps, and secondary labels. Combined with this app's dark, glass-heavy visual language (real, deliberately restrained blur/contrast per the recent design-token work), small text on a dark background is the single hardest combination to read in direct sunlight or screen glare.
**Severity:** Medium

## 13. One-Handed Use

**Finding:** The bottom nav is correctly one-hand-friendly. Two direct contradictions exist in the same viewport: (a) the floating "Feedback" pill sits directly on top of the bottom nav's rightmost items (see `MOBILE_GAPS.md` for exact pixel overlap), forcing an unnatural grip/reach to avoid it; (b) the hero card's own primary action buttons ("Review today's decisions", "Open portfolio") render at the exact vertical position of the fixed bottom nav on initial load, effectively hidden behind it rather than being a second, reachable action row.
**Severity:** High

## 14. Visual Balance

**Finding:** On first load, the top ~35% of a 390×844 viewport is consumed by title + search bar + market-status pill + four vertically-stacked icon buttons, before any real content appears — a top-heavy layout that pushes the actual "morning brief" content below the fold on the very screen meant to be the daily habit-forming moment.
**Severity:** Medium

---

## What Cannot Be Verified From This Environment

Real-device-only risks that were reasoned about but not directly observed, listed honestly rather than guessed at: exact keyboard-avoidance behavior on iOS Safari vs. Android Chrome (§8); edge-swipe gesture collision with the 3D camera drag (§7); real notch/Dynamic Island occlusion on the fullscreen 3D scenes (§4–6); true outdoor-glare legibility (§12, contrast math only, no real sunlight test); real network-throttled first-load perception (§10).
