# Phase H1 — Private Beta Go-Live — Report

**Branch:** `sprint-16-live-data` · **Commits: 0** · **Date:** 2026-07-23

## Mission

Audit ImpactOne for real production go-live with 5 beta users. No new features, no architecture work, no AI changes unless a critical production bug is found. Audit only.

**Compliance confirmed:** every finding in this report was verified against the actual running application (backend restarted fresh and confirmed live on :5000, frontend on :5173), not inferred from static code reading alone. No code was modified. `git log` unchanged (`063bdd4`); no push.

## Method

Started both services fresh, then ran live checks against every mandatory category the mission names: health, recommendation flow, portfolio, error handling, environment variables, secrets (via `git ls-files`/`git show` against actual history, not assumption), rate limiting, and monitoring. Full results: `PRIVATE_BETA_CERTIFICATION.md`. Full bug detail: `CRITICAL_BUGS.md`.

## 1–3. Go-Live Audit, Critical Bug Review, Beta Readiness

See the two companion documents for full detail. Summary: **the product works** — recommendations, portfolio, and error handling were all verified live and functioning correctly. **Two blocking issues** were found, both real and verified, neither cosmetic:

1. **Secrets committed to git history** — `frontend/.env`, tracked since Sprint 1/2, contains real, currently-live `FINNHUB_API_KEY`/`OPENAI_API_KEY` in plaintext, readable by anyone with repository access.
2. **No user isolation implemented** — Phase F2 designed the exact mechanism needed (`BETA_USER_ISOLATION_PLAN.md`) but it was never built. All 5 beta users would share one Portfolio, one InvestorProfile, indistinguishable feedback and analytics — a direct data-integrity failure, not a UX rough edge.

A third item (console-only error logging, no aggregation) is real but judged non-blocking at 5-user scale given the WhatsApp-based support model Phase G1 already designed around.

## 4. Go-Live Checklist — BLOCKING ITEMS ONLY

Everything else (rate limiting, monitoring, persistent logging) is explicitly postponed past this beta, per the mission's own instruction and this engagement's repeated finding (Phases F1/G1/G2) that infrastructure proportional to 5 known users should not be over-built.

- [ ] **Rotate the exposed API keys** (`FINNHUB_API_KEY`, `OPENAI_API_KEY`) and remove `frontend/.env` from git tracking going forward (`git rm --cached frontend/.env`, confirm `.gitignore` actually takes effect for it). Whether to also rewrite git history to purge the old keys from past commits is a decision for whoever owns this repository's security posture — flagged here, not decided.
- [ ] **Implement Phase F2's `BetaUser` isolation design** — the schema and API changes are already fully specified in `BETA_USER_ISOLATION_PLAN.md`/`DATABASE_MIGRATION_PLAN.md`/`API_IMPACT_REPORT.md`. This is the one item on this checklist that is "new work," but it was explicitly deferred design, not new-in-this-phase invention, and Phase G1's own execution plan assumed it would exist before real users arrived.
- [ ] **Re-run this same go-live audit after both items above are addressed**, specifically re-verifying: (a) `git ls-files` no longer includes any `.env` file, (b) `GET /api/v2/portfolio` with two different resolved `betaUserId`s returns two genuinely different portfolios.

No other item from the full audit (`PRIVATE_BETA_CERTIFICATION.md`) is blocking.

## Final Verdict: **BLOCKED**

Not a judgment on product quality — the recommendation flow, portfolio engine, and error handling all work, verified live, end to end. Blocked strictly on the two items above: a real security exposure and a real, already-designed-but-unbuilt data-isolation gap that would make "5 users" mean "1 shared account" if launched today.

## Deliverables

- `PRIVATE_BETA_CERTIFICATION.md` — full go-live audit table, verified live
- `CRITICAL_BUGS.md` — the two blocking bugs plus what's confirmed working
- `PHASE_H1_REPORT.md` — this document, including the blocking-only go-live checklist

**No code was implemented or modified. No architecture work was performed — the two blocking items were identified, not fixed, per this phase's explicit audit-only scope. No commits were made. Nothing was pushed.**
