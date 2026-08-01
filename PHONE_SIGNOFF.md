# PHONE_SIGNOFF.md — Phase APP-STORE-QUALITY-001

## Verdict: READY FOR REAL-DEVICE INSTALL, WITH DISCLOSED LIMITATIONS

This is not a "certified perfect" sign-off — it is an honest statement of what was verified, what was fixed, and what remains unverifiable without physical hardware, consistent with this engagement's standing discipline of never certifying beyond what was actually checked.

## What was verified and is genuinely real-device-ready

- **Layout at true mobile viewports** (390x844 portrait, 844x390 landscape) — zero horizontal overflow in either orientation, including during a live rotation without reload.
- **Touch ergonomics** — every interactive control now meets or effectively meets the 44x44px minimum touch target (header icons via an invisible hit-area expansion that changes nothing visually); the one real click-blocking defect found (Feedback widget over the bottom nav) is fixed and re-verified via an actual `click()` test, not just a visual check.
- **Safe areas** — header, bottom nav, and (newly) the Flagship/3D Workspace toolbar all reserve real space for device insets via `env(safe-area-inset-*)`, with safe zero-effect fallbacks on non-notched hardware.
- **Device rotation** — the app itself renders correctly in both orientations, and the installed-app manifest no longer contradicts that by locking to portrait.
- **Font scaling / zoom** — pinch-zoom and OS text-size scaling are not blocked by the app's own CSS; a 200% root-font stress test produced no overflow.
- **Animations** — `prefers-reduced-motion` is honored app-wide without error.
- **Startup/splash** — a real branded loading state replaces the old blank-white first paint; the manifest's splash color matches the app's actual rendered background.
- **PWA fundamentals** — manifest, icons (incl. maskable), and service worker are all real, correct, and already followed sound practices (network-first for data, shell-caching that survives hashed build filenames, no stale financial data ever served from cache).
- **First launch** — the onboarding "Welcome to the beta" dialog renders correctly on a genuinely fresh, cleared-storage session.
- **Zero regressions** — 615/615 frontend tests passing, production build clean, both identical to the pre-fix baseline.

## What is explicitly NOT verified (disclosed, not silently assumed fine)

- Real notch/Dynamic Island occlusion on physical hardware (Chromium cannot emulate non-zero safe-area insets) — the Flagship/3D toolbar fix is a defensive, zero-risk mitigation, not a confirmed-fixed regression.
- iOS "Add to Home Screen" native splash rendering on a real iPhone.
- Real battery/thermal behavior of the continuous WebGL 3D scene when the app is backgrounded on real hardware (relies on standard browser rAF throttling; not independently profiled).
- Outdoor/sunlight legibility and real virtual-keyboard-avoidance behavior on a physical device (both flagged as untestable in this environment in the prior MOBILE-EXPERIENCE-001 phase and not re-attempted here, since neither regressed and neither is newly in scope).

## Explicitly out of scope for this phase, not re-litigated

- The shared/global Guest-account identity behavior on a cleared-storage session (a long-standing, separately-tracked identity/isolation finding, not a device-readiness defect).
- Daily Feed/Home templated-explanation duplication (an AI-trust/content-quality finding, not a device-readiness defect).
- Any redesign, new feature, or new architecture — none was performed, per the mission's explicit constraints.

## Required before a real App Store / Play Store submission (not performed here, named for the record)

1. Verify the iOS splash and safe-area behavior on at least one real notched iPhone and one real Android device with a display cutout.
2. Decide on and, if pursued, capture real manifest `screenshots` for a richer Android install prompt.
3. If wrapping in a native shell (Capacitor/TWA) for store distribution rather than shipping install-from-browser, that shell's own store-specific requirements (privacy manifest, permissions declarations, etc.) are a separate, not-yet-started workstream.

## Commit

All fixes in this phase are local-only, per the mission's explicit "commit locally only. Do not push." instruction.
