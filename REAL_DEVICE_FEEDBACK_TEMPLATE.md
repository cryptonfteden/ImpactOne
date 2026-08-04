# REAL_DEVICE_FEEDBACK_TEMPLATE.md — Phase FOUNDER-PILOT-001

Copy the relevant block below for every session (Morning/Midday/Evening) described in `SEVEN_DAY_USAGE_SCRIPT.md`. Fill in every field — write "none" or "N/A" rather than leaving a field blank, so a missing observation is never confused with a field that was simply forgotten.

---

## A. Session log entry (fill one per session)

```
Day: [1-7]        Session: [Morning / Midday / Evening]
Date/time: 
Device model + OS version: 
Backend environment (dev/staging/beta):
Network conditions (Wi-Fi / cellular, bars if known):
Battery % at session start: 
Battery % at session end (if a long session, e.g. Flagship): 

Screens visited this session:

Observations (one line each, plain language, what you actually saw — not what you expected to see):
1.
2.
3.

Findings requiring a full Bug/Trust/Friction record below (list finding IDs): 

Overall: [Normal / Minor friction / Notable issue(s) — see findings below]
```

## B. Bug-report format (one per finding)

```
Finding ID: D[day]-[sequence, e.g. D3-01]
Title: (one line, specific — "Daily Feed: 3 unrelated items share identical explanation text", not "feed looks off")
Screen(s): 
Severity: [Critical / High / Medium / Low]   — per BUG_SEVERITY_STANDARD.md, assigned from the observed user-facing effect only, never downgraded because a fix "sounds easy"
Category: [Trust defect / UX friction / Functional bug / Performance / Battery-heat / Install-update / Accessibility]
Orientation: [Portrait / Landscape / Both]
Steps to reproduce:
1.
2.
3.
Expected: 
Actual: 
Screenshot/recording filename(s): 
Reproducible again on a second attempt? [Yes / No / Not retried]
Notes: 
```

## C. Screenshot and screen-recording protocol

- **Screenshot required for:** every finding logged under §B, regardless of severity; Day 1's install/home-screen icon/first-launch state; the morning brief text on at least 3 separate days (for the Day 3/Day 7 trust comparison); any empty state encountered; any error/offline state encountered.
- **Screen recording required for:** any finding involving motion, animation, a multi-step interaction, or anything that "resolves itself after a moment" (e.g. a spinner that eventually loads vs. one that never does — a screenshot alone can't distinguish these); the entire Day 5 Flagship/3D session (or at minimum its first and last 60 seconds, to compare frame smoothness); any landscape-rotation check where nav/content behavior is being verified.
- **Naming convention:** `D[day]-[session]-[sequence].[png|mp4]`, e.g. `D3-midday-01.png`. Store all captures in one place per day so `FOUNDER_GO_NO_GO.md`'s synthesis can reference them by filename, not by memory.
- **Never crop or edit a capture before logging it** — the raw, unedited capture is the evidence; annotate separately if needed, but keep the original.

## D. Trust-defect criteria (reused, not reinvented — see MOBILE_TRUST_AUDIT.md for full detail)

Apply all 10 checks below to every session where they're relevant; log a "Trust defect" finding (§B) for any fail condition met, exactly as `MOBILE_TRUST_AUDIT.md` defines it:

1. Stale data shown as current, with no visible age/staleness label.
2. Any personalized-sounding claim ("your portfolio," a specific holding) that doesn't match the real account state.
3. Two distinct content items sharing identical explanatory text.
4. Confidence values clustering into a handful of fixed points rather than varying per item.
5. A confidence score shown with no adjacent, independently valued uncertainty score.
6. The app looking "live" while genuinely offline, with no visible offline indicator.
7. A forced failure producing a blank/raw-error/silent-infinite-loading state instead of a plain-language explanation + next step.
8. Any destructive action (reset, delete, disconnect) completing without a confirmation step.
9. Any critical context (confidence, uncertainty, source, invalidation condition) unreachable on the smallest screen, in either orientation.
10. The same educational explanation reappearing for an account that has clearly already engaged with that concept multiple times.

## E. UX-friction criteria

Log a "UX friction" finding (§B) for any of the following, even if none of them individually feel severe — friction compounds, and the point of a real week of use is to notice what a single test session wouldn't:

- A tap, swipe, or gesture that required more than one attempt to register.
- Any screen transition, load, or animation that felt noticeably slower than the rest of the app.
- Any control smaller or harder to hit reliably one-handed than the rest of the app (note the screen/control explicitly).
- Any content that required an unexpected scroll, pinch, or rotation to become reachable.
- Any moment of genuine confusion about what to do next, what a number/label meant, or whether an action succeeded.
- Landscape orientation reverting to a desktop-style layout, hiding navigation, or clipping content — a specific, previously-recurring failure mode in this product; always name it explicitly if seen, never lump it into a generic "layout issue."

## F. Battery and heat observation criteria

Record for every session, mandatory detail for Day 5's Flagship/3D session:

- Battery % at session start and end (for any session over ~10 minutes).
- A plain-language warmth rating: "no noticeable warmth" / "slightly warm" / "noticeably warm/hot to the touch," and roughly how long into the session it started.
- Any visible frame-rate degradation, stutter, or the OS's own low-power-mode/thermal-throttling indicator appearing.
- Whether backgrounding and returning to the app during/after a heavy (3D) session caused a crash, black screen, or loss of scroll position/state.

## G. Installation and update-behavior fields

```
Install date/time: 
Install method (Safari "Add to Home Screen" / Chrome "Install app" / other): 
Home-screen icon correct (artwork, name)? [Yes / No — describe]
Launched standalone (no browser chrome)? [Yes / No]
Branded boot/loading state shown before content (no blank/white flash)? [Yes / No]
Onboarding dialog shown, wording matched expectation? [Yes / No — describe]

Update banner observed this week? [Yes / No / Not exercised — no new build deployed]
If yes: did tapping it reload cleanly, with no lost local state? [Yes / No — describe]
```

## H. End-of-day summary (append to the running log, one per day)

```
Day: [1-7]
Total findings today: [count] — Critical: [ ] High: [ ] Medium: [ ] Low: [ ]
Coverage areas touched today (from FOUNDER_PILOT_PLAN.md §3): 
One-sentence summary of the day: 
```
