# Private Beta Operations Platform — Phase X9 (current)

The operational *infrastructure* required to run the ImpactOne private beta as a professional SaaS product — every user interaction now measurable, every error now structured, every feature now toggleable without a redeploy. (The process document below this section — daily review sequence, bug triage, feedback classification — is preserved as-is; this section covers the real, built platform that document's process now runs against.)

## What was built

| Part | Deliverable |
|---|---|
| 1. Product Analytics | Full required event catalog (17 new events) added to the existing Sprint 35/36/40 `AnalyticsEvent` pipeline; `screen`/`durationMs` promoted to first-class columns. See `ANALYTICS_SCHEMA.md`. |
| 2. Feedback System | Real `Feedback` model, service, API, and an always-reachable `FeedbackWidget.jsx` (Bug/Suggestion/Question/Praise), auto-capturing screen/browser/version/user/timestamp — the same real four-way classification `BETA_FEEDBACK_ANALYSIS.md`'s process expects to receive as real, structured input rather than manually re-derived from raw messages. |
| 3. Crash & Error Reporting | Real `ErrorReport` model. Every frontend error already routed through `logError()` now also becomes a structured report; every unhandled backend error is captured by the global Express error handler. Both fire-and-forget — reporting a failure can never itself cause a second one. |
| 4. Feature Flags | Real `FeatureFlag` model, four required modes (`ENABLED`/`DISABLED`/`BETA_ONLY`/`USER_SPECIFIC`), evaluated fresh on every check — no code change required to toggle. See `FEATURE_FLAGS.md`. |
| 5. Admin Dashboard | `AdminDashboardScreen.jsx`, internal-only (dev-console gated), all ten required fields — the real, live data source the daily review sequence below now has to pull from. See `OPERATIONS_DASHBOARD.md`. |
| 6. Performance Monitoring | Real API latency (Express middleware, per-route), real client-reported screen-load/chart-render/AI-response timings, real live process memory, real frontend bundle size read from disk. |
| 7. Beta Metrics | All eight required metrics, computed fresh, honest about empty samples. See `BETA_METRICS.md`. |

## Architectural principle followed throughout

**Extend, don't duplicate.** Every new piece composes an already-real, already-tested source rather than building a second pipeline: analytics extends the existing Sprint 35 system; beta metrics reuses `ttvMetricsService.js` directly for Time-to-First-Value; the admin dashboard composes analytics/feedback/error-report repositories rather than aggregating raw data itself; error reporting hooks the *existing* `logError()` choke point instead of asking every screen to add a second call.

## What is intentionally in-memory, not persisted

`performanceMetricsService.js`'s API-latency ring buffers and client-timing samples reset on backend restart — real-time operational telemetry for the Admin Dashboard, not a permanent historical record. Documented, not silently assumed durable — the same tradeoff `systemHealthService.js` (Phase X6) already makes for live status.

## What was not built (real, disclosed scope boundaries)

- No admin UI for toggling feature flags yet — `PATCH /api/v2/feature-flags/:key` is real and works, but a control-panel UI is real follow-up work, deliberately deferred to stay within "no major product features" this phase.
- No persisted historical performance data (only live, in-memory samples) — a real future addition, not built here.

## Testing

38 new backend tests, 6 new/extended frontend tests. See `X9_COMPLETION_REPORT.md` for final counts.

---

# Private Beta Operations — Process (pre-existing, unchanged)
## Office of the Private Beta Readiness Board — ImpactOne

**Mandate:** Define exactly how the first private beta is run, day to day, once launched. This document governs operations only — it does not decide whether launch should happen (see `GO_NO_GO_BOARD.md`), only how the beta behaves once the board has said go.

---

## Daily Review Process

Every day, for the duration of the beta, the same fixed sequence runs, in order:

1. **Pull the prior 24 hours of data** — opens, session length, screens reached, any Bug or Trust Reports filed.
2. **Run the `MOBILE_TRUST_AUDIT.md` ten-check framework** against the current live build, using a real device and a real test account — not inferred from a changelog.
3. **Triage every new Bug and Trust Report** (see below) within the same day they were filed.
4. **Update `GO_NO_GO_BOARD.md`'s Status and Evidence columns** for any criterion touched by the day's findings — the board is a living document, not a one-time gate.
5. **One written daily note**, no longer than a paragraph, stating what changed and what didn't — sent to the same small group every day, weekends included, for the duration of the beta.

---

## Bug Triage

Every bug reported is classified within the same day using `BUG_SEVERITY_STANDARD.md`, then routed:

- **Critical** → the beta is paused for all participants until resolved or explicitly, evidence-backed downgraded.
- **High** → fixed before the next release cycle; participants affected are individually notified of the specific issue and its status.
- **Medium** → logged, scheduled, batched into the next release.
- **Low** → logged, addressed opportunistically.

No bug is silently closed without a written resolution note, and no severity is ever downgraded without a stated, evidence-based reason recorded alongside the change.

---

## Feedback Classification

Every piece of incoming feedback is run through the four-way classification in `BETA_FEEDBACK_ANALYSIS.md` (Noise / Opinion / Evidence / Behavior) before it influences any decision — a single participant's strongly worded opinion is never treated as equivalent to an independently verifiable, checkable finding.

---

## Communication Cadence

- **Daily:** the one-paragraph internal note described above.
- **Same-day:** acknowledgment of every Bug Report (within 24 hours) and every Trust Report (within the same day, per `PRIVATE_BETA_PLAYBOOK.md` §9).
- **Weekly:** the structured participant reflection (`PRIVATE_BETA_PLAYBOOK.md` §7) and a corresponding internal review of that week's aggregated findings.
- **Ad hoc:** any Critical finding triggers an immediate, individual message to every affected participant, explaining what was found and what's being done — never left for the next scheduled update.

---

## Release Cadence

No fixed release schedule overrides the evidence. A release ships as soon as a Critical or High finding is resolved and verified live — never batched to wait for a convenient date, and never delayed by a desire to bundle it with unrelated work. Cosmetic and Low-severity fixes are batched into a weekly release rhythm so participants aren't asked to update constantly for minor changes.

---

## Success Criteria

The operations described in this document are working when:

- Every Critical finding is resolved or the beta is paused within the same day it's confirmed — no exceptions logged as "in progress" for more than 24 hours without an explicit, evidence-based reason.
- The daily review sequence runs every single day of the beta, with zero skipped days.
- No participant ever has to ask "what happened to the thing I reported" — every report gets a specific, individual answer, whether the answer is "fixed," "scheduled," or "we looked and here's what we found."
