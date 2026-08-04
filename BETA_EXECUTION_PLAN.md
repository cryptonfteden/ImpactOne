# Beta Execution Plan — Phase G1

Head-of-Product execution plan for ImpactOne's first closed beta. 5 invited users, founder support via WhatsApp, no auth platform, `BetaUser` isolation in place (nullable-key design from Phase F2), recommendations globally generated and personalized only at presentation time, AI engine frozen unless a critical bug forces an exception.

## 1. Beta Timeline

### Day 0 — Launch Day
- Founder personally sends each of the 5 users their invite link + invite code (Phase F2's resolve flow) + WhatsApp contact, one at a time, not a group blast — first impressions are 1:1, not mass.
- Pre-flight, before the first message is sent: `RELEASE_CHECKLIST.md` fully executed — Finnhub key verified *live* (not just present in `.env`, per D1.8's own caught mistake), one real engine cycle already run so Recommendations isn't guaranteed-empty on first open (per Phase E3's single highest-ROI finding), full test suite green.
- Founder available and watching WhatsApp continuously for the first 2 hours after each invite goes out — this is the highest-risk window for a silent onboarding failure going unreported.
- Goal for the day: all 5 users complete onboarding. Nothing else is expected to happen yet.

### Day 1 — First Real Session
- Founder checks: did each user actually open the app a second time (not just complete onboarding)? Per-user, via the isolation-scoped analytics (Phase F2's `betaUserId` on `AnalyticsEvent`).
- Founder sends a personal WhatsApp check-in to any user who hasn't returned: not a bug report request, just "did it make sense yesterday?" — cheap, human, catches confusion before it becomes silent churn.
- Watch specifically for: an empty Recommendations screen with no context (E1's Critical finding), any error-reporting hits (F1's proposed endpoint, if implemented) tied to a specific `betaUserId`.

### Day 3 — Habit Formation Checkpoint
- First point where "did they come back on their own" is a meaningful question rather than noise.
- Founder reviews: recommendation open rate, AI Analysis usage, whether anyone has used the per-recommendation feedback mechanism unprompted.
- If any user has gone completely silent (no session since Day 1) — this is the trigger for the first direct WhatsApp outreach beyond a check-in: ask directly what happened.

### Day 7 — First Full-Week Review
- The real Day-7 retention metric is computed here (see `SUCCESS_METRICS.md`).
- Founder sends the structured async check-in (Phase F1's design: "what did you almost stop using this week, and why") to all 5 users, individually.
- Decision point: does the beta continue as-is, need a scoped adjustment (e.g. a UX fix within Phase E's already-completed Critical/High backlog), or hit a Failure Criterion (§4)?
- This is also the checkpoint where a **critical bug exception** to the frozen-AI-engine rule would be evaluated, if one has been reported — see §4.

### Day 14 — Beta Conclusion Checkpoint
- Full exit debrief with all 5 users (Phase E3's founder-simulation framing, now run against real users instead of the founder's own judgment) — "would you keep using this tomorrow, why or why not."
- Compile the full `SUCCESS_METRICS.md` scorecard against its thresholds.
- Produce a plain go/no-go recommendation for the next phase (wider beta, paused for fixes, or stopped) — not made in this document, but this is the day it gets made.

## 2. User Journey

**Invitation** — 1:1, personal, from the founder, via whatever channel got the relationship (not cold). Includes the invite code (Phase F2), a one-paragraph honest framing of what's real vs. simulated (matching the product's own "never fabricate" ethos), and the WhatsApp contact for support up front — not buried in Settings.

**Onboarding** — the existing real onboarding flow (age + quick taps), now preceded by Phase F1's proposed beta-framing card and the invite-code entry that resolves to a `betaUserId`. Ends with Phase E2's `WelcomeOverlay` setting expectations: recommendations take time, portfolio is simulated, everything is advisory.

**First Recommendation** — the single highest-risk moment in the whole journey (Phase E3's own finding). Because recommendations stay globally generated (not per-user, per this phase's explicit assumption), every user sees the same underlying recommendation set, personalized only by presentation — meaning Day 0 readiness (one real engine cycle already run) determines all 5 users' first impressions simultaneously. If the global feed is empty, all 5 users have a bad first impression at once, not just one.

**Portfolio** — each user's own isolated paper-trading sandbox (Phase F2's scoped `Portfolio` row). This is the one part of the journey that's genuinely personal to each user from minute one, and Phase E2 already made it the better-instrumented default screen.

**AI Analysis** — deep-dive screen, most information-dense; expect the lightest and latest engagement of the five core screens, since it requires a user to already have a ticker in mind.

**Feedback** — two real, distinct channels stay distinct on purpose: per-recommendation feedback (already shipped, reasoning-quality signal) vs. the general WhatsApp line (product/trust signal, founder-facing). Do not let one substitute for the other in analysis — conflating "I don't understand this recommendation" with "I'm frustrated with the product" would misdiagnose real problems.

**Retention** — the entire point of Day 3/Day 7/Day 14. Retention here is not a vanity number; with 5 users, every single return-or-not is individually legible and should be treated as a real, personal signal, not averaged into a percentage until Day 14.

## 3. Deliverables Cross-Reference

- `SUCCESS_METRICS.md` — the KPI scorecard and thresholds referenced throughout this timeline.
- `FOUNDER_DAILY_CHECKLIST.md` — the exact morning routine implementing this plan's daily review cadence.

## 4. Critical-Bug Exception to the Frozen AI Engine

The mission freezes the AI engine "unless a critical bug is found." Defined narrowly here so it's not a loophole: a critical bug is a **factual/data-integrity defect** (e.g. a recommendation citing a wrong price, a fabricated benchmark, a committee vote that doesn't match its own stored evidence) — never a **quality/preference** issue (e.g. "the reasoning wasn't convincing," "I wanted a BUY not a REDUCE"). The former gets an immediate, scoped, logged exception; the latter gets logged as feedback for a future phase, not an in-beta engine change. This distinction protects the mission's own "no recommendation logic changes" intent while still allowing a genuine correctness bug to be fixed rather than shipped to all 5 users for two weeks.
