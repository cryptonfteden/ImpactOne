# BETA_RISK_REVIEW.md

**Phase F1 — Product Risk Review**
**Date:** 2026-07-23
**Scope:** Operational risk only — assuming five real beta users start using ImpactOne tomorrow. This is deliberately not a code-quality or AI-quality review; recommendation logic, committee output, and scoring are out of scope. Every finding below is grounded in a specific file, config, or directly-observed fact (git status, running process, live endpoint), not speculation.

---

## 1. User Onboarding

The product-level onboarding (a one-time welcome modal plus a guided profile setup) is real and reasonably built. The operational risk here isn't the UI — it's what happens underneath it for a *second* real person.

**Finding:** `InvestorProfile` and `Portfolio` are both single global rows in Postgres, fetched with `findFirst()` and no `userId` column anywhere in the schema (confirmed in `backend/prisma/schema.prisma` and `investorProfileRepository.js`/`portfolioRepository.js`). There is no authentication and no per-device/per-user scoping anywhere in the stack. **If five real people use the same deployed backend, "onboarding" the second person overwrites the first person's investor profile, and every trade any of them places lands in the same shared portfolio.** This is not a hypothetical edge case — it is the default, guaranteed behavior of the current architecture the moment a second person opens the app against the same backend.

This is the single largest operational risk in this entire review, because it doesn't degrade gracefully — it silently corrupts data across users with no error, no warning, and no way for a user to know their portfolio just changed because someone else logged in.

---

## 2. Support Burden

**Finding:** There is no real, working support channel anywhere in the shipped product. `DashboardFooter.jsx` explicitly renders "Help," "Feedback," "Terms," and "Product updates" as inert `<span>` labels with `title="Not available yet"` — not broken links, but deliberately non-functional placeholders (confirmed directly in code, not inferred). The only functioning feedback mechanism anywhere in the app is a six-option reaction picker (Useful / Not useful / Too early / Too late / Already knew / Don't understand) scoped narrowly to individual Recommendation cards (`RecommendationCard.jsx`, `POST /v2/recommendations/:id/feedback`).

This means: if a beta user is confused by the Portfolio screen, hits an error on AI Analysis, or simply wants to say "this seems off," there is currently no in-app path to tell anyone. `PRIVATE_BETA_PLAYBOOK.md` describes an extensive planned bug-reporting and trust-reporting flow (§8, §9) with 24-hour and same-day response commitments — none of that plan is built. Support burden today would fall entirely on whatever informal channel (text, email, a phone call) the beta operator sets up manually outside the product, and there's no guarantee a confused or frustrated user finds that channel before simply giving up.

---

## 3. Missing Analytics

**Finding:** A real, well-designed, genuinely anonymous analytics pipeline exists (`frontend/src/utils/analytics.js` → `POST /v2/analytics/event` → `analyticsService.js` → `AnalyticsEvent` table). It has a fixed allowlist of 13 events and property keys, no user/device identifier beyond a random per-browser UUID, and fails silently so it can never break the product. This part is solid.

**The gap:** there is no dashboard, report, or aggregation view anywhere in the product for anyone to actually look at this data. `analyticsEventRepository.countByEventName()` exists as a raw building block, and a `GET /v2/analytics/ttv-metrics` endpoint exists, but neither is surfaced in any UI reachable during normal operation — retrieving "how many of the 5 users actually opened the app today" requires someone to manually query the database or hit an internal API by hand. During a live 5-person beta, this means the team has no real-time visibility into engagement, drop-off, or usage patterns without manual intervention — exactly the kind of blind spot `PRIVATE_BETA_PLAYBOOK.md`'s "CEO Dashboard" (§12) was designed to prevent, and that dashboard does not exist as a built feature.

---

## 4. Missing Monitoring

**Finding:** `backend/app.js`'s `/health` endpoint is a static `res.json({ status: "ok" })` with no dependency check whatsoever — it will report healthy even if Postgres, Finnhub, or OpenAI are completely unreachable (confirmed by reading the route directly). No error-tracking SDK (Sentry or equivalent), no APM, and no uptime/alerting service exists anywhere in either `package.json`. Logs go only to the terminal's stdout with no aggregation, no request correlation ID, and vanish the moment the process restarts or the terminal closes.

**Why this is not hypothetical:** across this multi-week review engagement, the backend has already gone down for real, unattended, for periods spanning multiple consecutive review sessions (confirmed via direct port checks on separate days) — and nothing paged anyone or even logged the outage anywhere durable. For a live beta, this means an outage affecting all 5 users simultaneously could persist for hours or days with zero automatic detection, discovered only if a user happens to complain and someone happens to check.

---

## 5. Feedback Workflow

**Finding:** `PRIVATE_BETA_PLAYBOOK.md` and `BETA_FEEDBACK_ANALYSIS.md` describe a mature, well-designed feedback process (daily checklist, weekly structured reflection, a four-tier Noise/Opinion/Evidence/Behavior classification, a dedicated same-day trust-reporting path). `PRIVATE_BETA_GO_LIVE_CHECKLIST.md` Section C ("Feedback & Monitoring Systems Readiness," 7 items) — end-to-end testing of the bug/trust-reporting flows, a named reviewer with a stated response-time commitment, a dry-run of the categorization system — shows every item unchecked.

**The gap is between plan and system:** the weekly survey, the trust-reporting flow, and the "named individual who owns same-day review" are process commitments that require a person and a tool, and neither is confirmed to exist yet. Absent the actual product feedback UI (see §2 above), the entire feedback workflow described in the playbook currently depends on manual, ad hoc collection (e.g., a phone call or a shared document) rather than anything the product itself supports.

---

## 6. Privacy

**Finding:** `InvestorProfile` persists age, country, risk tolerance, investment goal, and investment horizon server-side in Postgres — real personal/financial-preference data, even without a name or email attached (no such fields exist in the schema for this model). There is no visible Privacy Policy, Terms of Service, or data-deletion control anywhere in the shipped frontend; `HELP_CENTER_STRUCTURE.md` plans a "Trust and Safety" section covering exactly this ("What data does ImpactOne collect... How do I delete my account and data?") but it is a design document, not a built screen.

**Separately, and more urgently:** `frontend/.env` — containing live, real Finnhub and OpenAI API keys — is confirmed tracked in git today (`git ls-files frontend/.env` returns the file). Anyone with repository access, including a future collaborator, contractor, or accidental public push, can read these live credentials. This is a real, current exposure independent of anything AI-quality related, and independent of user count — it exists whether 1 or 5,000 people are using the beta.

**Combined with §1:** because there's no per-user data isolation, "my data" and "another beta user's data" are, today, the literal same database rows — a privacy concern distinct from and worse than a policy-document gap.

---

## 7. Crash Recovery

**Finding:** `npm run server` runs `node backend/server.js` directly — confirmed via `package.json` — with no process supervisor (no nodemon, pm2, systemd unit, or container restart policy anywhere in the repo). `backend/server.js` itself contains no `process.on("uncaughtException")` or `process.on("unhandledRejection")` handler, and no graceful-shutdown (`SIGTERM`/`SIGINT`) logic exists to drain in-flight requests or close the database connection cleanly.

**Practical consequence:** if the Node process crashes for any reason — an unhandled promise rejection in a background scheduler, an OOM, a terminal window closing — nothing restarts it. It stays down until a person notices and manually re-runs the start command. This is not a theoretical risk: the exact failure mode (backend down, unnoticed, for an extended stretch) has already occurred multiple times during this review engagement's own testing.

---

## 8. Beta Communication

**Finding:** `PRIVATE_BETA_PLAYBOOK.md` specifies a detailed, high-quality communication cadence: a personal welcome message, a Day-1 personal check-in within 24 hours, a persistent in-app "Beta — Cohort 1" banner linking to bug/trust reporting, and a weekly structured check-in. None of this is confirmed operational: `PRIVATE_BETA_GO_LIVE_CHECKLIST.md` Section B (7 items — invite tracking, welcome-message delivery confirmation, agreement acknowledgment, the persistent beta banner's presence, a scheduled Day-1 check-in owner per candidate) is entirely unchecked, and no in-app "beta banner" component was found anywhere in `frontend/src/components`.

**Risk:** without the planned banner and check-in cadence actually wired up and owned by a named person, beta users have no persistent, visible reminder that they're in a beta, no obvious path to reach the team, and no scheduled first-week contact — meaning the entire success of the communication plan currently rests on manual, undocumented follow-through rather than anything the product or process enforces.

---

## Summary

The product's user-facing polish (reviewed in Phase E2/E3.5) is in reasonably good shape. The operational layer underneath it is not: there is no multi-user data isolation, no crash supervision, no real monitoring, no working support channel beyond one narrow feedback button, and a live secrets leak already in git. None of these are AI-quality or recommendation-logic problems — they are infrastructure and process gaps that would surface the moment more than one real person uses the product at the same time, or the moment the single backend process has a bad day.
