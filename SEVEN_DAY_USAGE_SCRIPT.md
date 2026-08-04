# SEVEN_DAY_USAGE_SCRIPT.md — Phase FOUNDER-PILOT-001

A concrete, repeatable script. Each day has a **Morning**, **Midday/Anytime**, and **Evening** session (see `FOUNDER_PILOT_PLAN.md` §5 for why three, not one). Every session ends with a log entry in `REAL_DEVICE_FEEDBACK_TEMPLATE.md`'s format, even if the entry is just "no findings." A day with zero logged entries is not the same as a day that wasn't actually used — always log at least a one-line "used normally, nothing notable" confirmation so Day 7's synthesis can tell the difference.

Throughout: hold the phone the way it's actually held — one-handed in portrait for most of the day, rotated to landscape deliberately at least once per day (a historically fragile area for this product), and never propped on a desk pretending to be a laptop.

---

## Day 1 — Install day

**Before opening the app at all:**
- [ ] Note device model, OS version, browser used to install (Safari/Chrome), and which backend environment the app is pointed at.

**Morning — first install:**
1. Navigate to the app URL in the phone's real browser (not a desktop remote-debug session).
2. Use the browser's native "Add to Home Screen"/install affordance.
3. Confirm a real home-screen icon appears (correct artwork, not a generic globe/placeholder).
4. Launch from the home-screen icon (not the browser). Record: does it open standalone (no browser address bar/chrome)? Does the branded "Loading ImpactOne" boot state appear before content, or is there a blank/white flash first?
5. Complete the onboarding "Welcome to the beta" dialog if shown. Record its exact wording and whether it matches what's expected.
6. Screenshot the first real screen reached after onboarding.

**Midday — first real briefing:**
- Open Home. Read the morning brief. Record: does it read as a real, specific summary of an actual account/portfolio state, or as generic/templated text? (This is the first live trust check — see the reused `MOBILE_TRUST_AUDIT.md` checks #2 and #3.)

**Evening — first rotation + close-out:**
- Rotate to landscape on Home. Record whether navigation is still reachable and usable (this exact failure mode has recurred multiple times in this product's history — never assume it's fixed without checking).
- Log Day 1 entry, including install screenshots.

---

## Day 2 — Portfolio + Watchlist depth

**Morning:**
1. Home → read morning brief again. Compare wording to Day 1's — is it genuinely different, or the same sentence with a date swapped?
2. Portfolio (bottom nav) → review every position shown. Record: do the numbers (value, P/L, allocation %) look internally consistent (do sector percentages sum sensibly, does cash + positions equal the stated total)?

**Midday:**
3. Watchlist Folders ("Workspaces" in the sidebar/"More tools") → add one real ticker to a folder if none exist yet. Confirm it persists (leave the app, reopen it later the same day, confirm the ticker is still there — persistence across a real app close/reopen, not just in-session state).

**Evening:**
4. Rotate to landscape on Portfolio specifically (tables/numbers are historically more prone to breaking in landscape than simple cards). Record any column clipping, overlap, or unreachable content.
5. Log Day 2 entry.

---

## Day 3 — News + Recommendations trust check

**Morning:**
1. Home brief + Portfolio glance (quick, per-habit).

**Midday:**
2. Daily Feed ("Feed") → read at least 8-10 distinct items in one sitting. For each: note the confidence value and the first sentence of its explanation.
3. Recommendations ("For you") → read every recommendation shown. Note the action (Buy/Reduce/Exit/Hold), confidence, and whether a "why now"/reasoning section is present and specific.

**Evening:**
4. **Trust check for the day:** compare the notes from step 2 across items — do any two *unrelated* items share identical or near-identical explanation text? Do confidence values look like they vary genuinely per item, or cluster into 2-3 repeated numbers? (Directly reuses `MOBILE_TRUST_AUDIT.md` checks #3 and #4 — this is a known, previously-documented failure pattern in this product; the pilot's job is to check whether it's still present on a real device today, not to assume either way.)
5. Log Day 3 entry with the comparison result explicitly stated (pass or fail, with the exact text/numbers if it fails).

---

## Day 4 — Alerts + AI Analysis

**Morning:**
1. Home + Portfolio (habit check).

**Midday:**
2. Alerts → review the current list. If empty, record the empty-state wording (does it explain *why* it's empty, or just show nothing?). If populated, note whether each alert clearly states what triggered it and when.
3. AI Analysis (or AI Analysis Workspace) → pick one held or watched symbol. Read every section (AI report, confidence, evidence/reasoning, any third-party analyst-consensus card). Record whether the platform's own verdict and any third-party consensus card are clearly, separately labeled (a real, previously-fixed defect in this product's history — check it's still fixed, don't assume).

**Evening:**
4. Rotate to landscape on AI Analysis specifically — this screen has historically been the most content-dense; check nothing critical (confidence, evidence, source link) becomes unreachable.
5. Log Day 4 entry.

---

## Day 5 — Flagship / 3D experience + battery

**Morning + Midday:** habit check (Home, Portfolio, Feed) — keep it brief today; today's focus is the evening session.

**Evening — the dedicated Flagship/3D session:**
1. Note the phone's battery percentage and (if the OS exposes it) whether the phone already feels warm before starting.
2. Open Flagship. Spend a genuine, continuous 10-15 minutes exploring it: rotate/pan the Earth view, open at least 4 of the different intelligence panels, trigger the Mission Chain view.
3. Repeat briefly in 3D Workspace if it's a materially different experience from Flagship (per prior audits, these two screens may be near-duplicates — record whether that's genuinely true from a founder's real-use perspective, not just structurally).
4. Immediately after, note: battery percentage again, whether the phone feels noticeably warm, whether the frame rate/interaction felt smooth throughout or degraded over time, and whether backgrounding the app (switching to another app) and returning caused any crash, black screen, or lost state.
5. Rotate to landscape during this session at least once — the 3D toolbar's safe-area handling was a defensive fix in `APP_STORE_QUALITY.md` that could not be verified on real notched hardware; this is the real-device check for it.
6. Log Day 5 entry with explicit battery-before/after numbers and a plain-language warmth/smoothness rating (e.g., "no noticeable warmth, smooth throughout" or "phone warm to the touch after ~10 min, minor stutter by minute 8").

---

## Day 6 — Speed and friction, real network

**Morning + Midday:** normal habit use, but this time explicitly timing things: how long from tapping the home-screen icon to seeing real content on Home? How long does Daily Feed take to populate? Does anything spin indefinitely with no feedback?

**Evening:**
1. Deliberately use the app somewhere with a real, imperfect network (not home Wi-Fi if that's been the pattern all week) — a train, a car, a spot with 1-2 bars. Record what happens: does the app clearly say it's offline/slow, or does it silently look broken?
2. Note any tap that required more than one attempt to register, any scroll that felt janky, any screen transition that felt slower than the rest of the app.
3. Log Day 6 entry with concrete timings where possible ("Home content appeared in ~2 seconds," not just "felt fast").

---

## Day 7 — Synthesis + update behavior + final review

**Morning + Midday:** one final full pass through all 5 bottom-nav destinations plus Flagship, in both portrait and a quick landscape check on each — a last "does everything from the week still hold" pass, not new territory.

**Evening — synthesis session:**
1. Check whether an update banner (`UpdateBanner.jsx`'s real reload prompt) appeared at any point this week. If yes, record whether tapping it worked cleanly. If no new build was deployed this week, record that plainly rather than guessing.
2. Re-read the full week's log. For each of the 14 coverage areas in `FOUNDER_PILOT_PLAN.md` §3, confirm at least one real observation exists — if any area was accidentally skipped all week, note it explicitly as a gap in this pilot's own coverage rather than silently omitting it.
3. Tally findings by severity using `BUG_SEVERITY_STANDARD.md`.
4. Complete `FOUNDER_GO_NO_GO.md` honestly, based only on what was actually observed this week.
