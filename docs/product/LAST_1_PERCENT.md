# The Last 1% — FINAL-CEO-REVIEW-001

Every remaining detail preventing a perfect 10, ordered strictly by visible user impact (highest first). Each item was directly, live-confirmed this session — none are assumed from prior reports.

## P0 — Blocks a world-class first impression today

1. **Scroll position isn't reset on navigation.** Confirmed live and reproducible on Themes, Alerts, My Profile, and Settings: navigating from a long, scrolled-down screen to a shorter one leaves the viewport scrolled into empty space below the new screen's content — the new screen looks completely blank until the user manually scrolls up. This is the single highest-impact fix available: near-certainly a one-line "reset scroll to top on route change" fix, and it currently makes a working product look broken on ordinary use.
2. **Identical AI reasoning across unrelated events.** "Fed rate hike," "FOMC Rate Decision," and "Shipping rates surge" share byte-identical explanation text and identical Confidence 81/100 scores — visible simultaneously on Alerts, Daily Feed, and Home today. This is the one defect that actively contradicts the product's own "real, honest, non-fabricated" premise, in the first five minutes, without the user needing to dig.
3. **Mobile Feedback widget physically blocks bottom navigation.** At 390px width, the fixed "Feedback" button intercepts the "For you" tab's tap target — confirmed via a real, repeatedly-failing interaction (not a visual guess). A user's thumb may simply not be able to reach a primary nav item on the device most people will demo the product on first.
4. **Error banner and "nothing to show" empty state rendered together.** Decision Center, Watchlist Folders, and Decision Timeline all show "Couldn't load..." directly above an unrelated "no items right now" message for a Guest session — reads as contradictory and unfinished, not gracefully degraded.

## P1 — Meaningfully holds the product back from "one coherent flagship"

5. **Two visual languages under one roof.** AI Analysis, Recommendations, Daily Feed, Themes, Alerts, the legacy Portfolio screen, and Market Dashboard use an older, denser "IMPACTONE TERMINAL" visual style, visibly different from the Flagship/NOVA Workspace screens. A user bouncing between Mission Control and Daily Feed would reasonably think these are two different products.
6. **Flagship and 3D Workspace are near-duplicates.** Same Earth scene, same interaction model, a different subset of orbital panels. Neither screen explains why the other exists, or which one is "the" flagship.
7. **Market Intelligence exists twice with identical content** — once as a 3D orbital panel inside both 3D screens, once as its own full standalone Workspace page. Same finding pattern as #6, one level down.
8. **24 sidebar destinations, no search or "recently used."** Even collapsed behind "More tools," this is a lot of surface for a product whose own Flagship screen is pitched as "everything that matters, on one screen."
9. **Market Positioning degrades to a plain wall of "unavailable" text rows** with zero visual hierarchy when quote data is rate-limited — an easily-reproduced worst case that currently looks like the weakest-designed screen in the app, despite being one of the more honest ones.

## P2 — Real, but smaller, polish gaps

10. **Grammar: "0 item needs your attention"** on Mission Control's closing summary line (singular "item" with a zero count).
11. **Empty-state glyph inconsistency:** Watchlist Folders uses "◎" while every other screen uses "◇".
12. **Raw enum leaking into UI copy:** "Horizon: SHORT_TERM" on Personal Intelligence Workspace instead of "Short term."
13. **Language selector currently offers only "English"** in Settings, despite real RTL/i18n plumbing existing elsewhere in the app — a visible gap between infrastructure and what a user can actually pick.
14. **Sparse, mostly-empty screens for a first-time Guest** (Watchlist Workspace, AI Analysis Workspace with no symbol context) — honest, but visually a large void with no onward suggestion beyond a single line of copy.

## P3 — Cosmetic, no user-facing risk

15. Minor sidebar-label wrapping on long item names ("Intelligence Workspace" etc.) at 1440px — readable, just not perfectly tidy.

---

## What Would Move the Overall Score Fastest

If only three items could be fixed before the next review: **#1 (scroll reset)**, **#2 (templated reasoning)**, and **#5 (two visual languages)** — in that order. #1 is the cheapest fix with the single largest first-impression impact; #2 is the most damaging to the product's core promise; #5 is the largest single lever on "does this feel like one premium product."
