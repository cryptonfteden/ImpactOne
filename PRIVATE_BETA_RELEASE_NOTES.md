# ImpactOne — Private Beta Release Notes

**Covers:** Sprint 33 (Mobile Private Beta Candidate) + Sprint 34 (Private Beta Go-Live) · **Branch:** `sprint-16-live-data` (not pushed)

## What's new for mobile

- **Installable app.** Add ImpactOne to your home screen — it opens full-screen, no browser chrome, with its own icon.
- **Redesigned navigation.** Five thumb-reachable destinations at the bottom of the screen: Home, Feed, Portfolio, For You, Profile. Everything else (Themes, AI Analysis, Alerts, Global Intelligence, Watchlist, Dashboard, Settings) is one tap away under Profile → More.
- **Faster morning brief.** Home opens straight to what matters today — no extra scrolling, no desktop-only assumptions.
- **Onboarding you can back out of.** Tap Back on any onboarding step without losing what you already entered.
- **Lighter Daily Feed cards.** Evidence, reasoning, and portfolio impact are one tap away instead of always expanded — faster to scan.
- **Offline awareness.** A banner tells you when you're offline instead of screens silently failing. Already-loaded data stays visible and usable; nothing is presented as live when it isn't.
- **Update notifications.** When a new version is ready, a banner offers a one-tap reload.
- **Freshness labels.** Home tells you exactly when its data was last updated, and honestly distinguishes "nothing changed" from "we couldn't check."

## What's fixed under the hood

- Recommendation timelines no longer show a false "thesis changed" entry every time a live quote refreshes — only real analytical changes are reported now.
- Portfolio's data tables no longer overflow the screen on narrow phones.
- A landscape phone no longer gets a broken sidebar layout.
- A permanently-visible search-suggestion overlay that could silently block taps anywhere in the app has been removed (now only shows while actively searching).
- Refreshing Daily Feed, Portfolio, or Recommendations no longer wipes already-loaded data when the refresh itself fails.
- The offline app shell now actually caches the app's code, not just its HTML — reopening the app while offline shows the real interface, not a blank page.
- A returning user's session is no longer wrongly reset to onboarding just because one network request failed (e.g., while offline).

## What's unchanged

No public or external API contract changed in either sprint. This is a client-experience and resilience release, not a data or capability change.
