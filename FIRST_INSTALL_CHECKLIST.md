# First Install Checklist — MOBILE-EXPERIENCE-001

A concrete checklist for the first time ImpactOne is installed on a real phone (not a browser emulator). Grouped by what to do before installing, and what to specifically try once it's installed.

## Before Installing

- [ ] Fix G1 — add a landscape-orientation navigation fallback (currently: zero nav in landscape).
- [ ] Fix G2 — ensure the Home hero card's action buttons clear the fixed bottom nav (currently: hidden behind it on load).
- [ ] Fix G3 — reposition the Feedback button so it no longer overlaps the bottom nav (currently: blocks part of "For you" and "Profile").

## On First Real-Device Install

### Install & Launch
- [ ] Add to Home Screen on both iOS Safari and an Android Chromium browser; confirm the icon, name, and splash/launch behavior match `manifest.json`.
- [ ] Confirm the app launches full-screen (no browser chrome) per `apple-mobile-web-app-capable`.
- [ ] Confirm the status bar renders legibly against the app's dark background on first launch (`black-translucent` style).

### Safe Areas & Notch
- [ ] On a notched or Dynamic-Island device, open the Flagship and 3D Workspace screens specifically and confirm no interactive control (panel close button, camera hint, node label) sits under the cutout.
- [ ] Rotate to landscape on a notched device and re-check the same screens — the safe-area inset that protects portrait may not protect the landscape notch position.

### Navigation
- [ ] Rotate the phone to landscape from every primary screen and confirm a real navigation path exists (this is currently expected to fail — see G1).
- [ ] With the phone in landscape, try to reach Decision Center, Workspaces, and My Profile without rotating back.

### Touch & Reach
- [ ] One-handed, thumb-only: try to reach the header's alerts/notifications/quick-actions/account icons without shifting grip.
- [ ] Tap "For you" and "Profile" in the bottom nav several times in a row near the Feedback button's location — check whether the Feedback overlay ever intercepts the tap (G3).
- [ ] On the Home screen, without scrolling, try to tap "Review today's decisions" and "Open portfolio" (G2).

### Keyboard
- [ ] Open Workspaces and tap into "Folder name" — confirm the input and its submit button both stay visible above the keyboard.
- [ ] Open Portfolio's order form and tap into the quantity field — same check.
- [ ] With the keyboard open, confirm the bottom nav and any fixed widgets don't visually overlap the keyboard or the focused input.

### Gestures
- [ ] On the Flagship/3D Workspace screen, drag starting from within ~20px of the left screen edge and confirm it doesn't trigger the OS back-gesture instead of (or as well as) the camera drag.
- [ ] Repeat from the right edge on Android.

### Readability & Perception
- [ ] View the Home screen outdoors in direct sunlight or under bright indoor glare; note which text is hardest to read (expect: the smallest micro-copy, ~10–11px).
- [ ] On a throttled/slow connection, time how long the Flagship screen's loading state is visible and whether it reads as "loading" or "blank."

### Orientation Round-Trip
- [ ] Start in portrait, rotate to landscape, rotate back to portrait — confirm scroll position, active screen, and any open panel/modal all survive the round trip without resetting or breaking.

## Sign-Off

Only mark this phase's mobile experience "first-install ready" once every "Before Installing" box above is checked and at least the Navigation, Touch & Reach, and Safe Areas sections of the on-device checklist have been run on one real iOS and one real Android device.
