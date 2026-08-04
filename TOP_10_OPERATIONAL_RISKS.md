# TOP_10_OPERATIONAL_RISKS.md

**Phase F1 — Product Risk Review**
**Date:** 2026-07-23
**Ranking basis:** likelihood × severity × how directly it could make a 5-person closed beta fail operationally (not AI/recommendation quality). Every risk below was directly confirmed against the running product, its git state, or its schema this session — none are speculative.

---

### 1. Five users would silently share one account, one portfolio, and one profile
No authentication exists, and both `Portfolio` and `InvestorProfile` are single global rows fetched via `findFirst()` with no `userId` column anywhere in the schema. The second beta user to open the app overwrites the first user's profile; every trade any of the five places lands in the same shared portfolio. This is guaranteed, default behavior, not an edge case — and it would look to each user like the product is randomly changing their own data.
**Why it tops the list:** it doesn't degrade gracefully or produce an error — it silently corrupts data with no warning, for every user, on day one.

### 2. Nothing restarts the backend if it crashes
`npm run server` is a bare `node backend/server.js` — no nodemon/pm2/systemd, no `uncaughtException`/`unhandledRejection` handlers, no graceful shutdown. This exact failure mode (an unattended, multi-day backend outage) has already occurred repeatedly during this review engagement. For a live beta, one crash means all 5 users are locked out until a human notices and manually restarts the process.

### 3. There is no working support or feedback channel
The in-app "Help," "Feedback," "Terms," and "Product updates" links are literally inert placeholders (`title="Not available yet"`), confirmed directly in code. The only functioning feedback mechanism is a 6-option reaction limited to individual Recommendation cards. A confused or frustrated beta user has no in-product way to ask a question or report a problem outside that one narrow surface.

### 4. No monitoring means an outage could go undetected indefinitely
`/health` is a static `{status:"ok"}` with zero dependency checks — it reports healthy even if the database or every external API is down. No error-tracking SDK, APM, or uptime alerting exists anywhere. Combined with Risk #2, an outage affecting all 5 users could persist for hours or days before anyone on the team knows, discovered only if a user happens to complain.

### 5. Live API keys are currently committed to git
`frontend/.env`, containing real Finnhub and OpenAI keys, is confirmed tracked in git today. This is a live cost and security exposure to anyone with repository access, entirely independent of user count or beta size, and already outstanding across multiple prior reviews without being remediated.

### 6. The planned feedback/communication process isn't actually built yet
`PRIVATE_BETA_GO_LIVE_CHECKLIST.md`'s Sections B and C (beta banner presence, invite tracking, welcome-message delivery, a named owner for same-day trust-report review, end-to-end tested bug/trust-reporting flows) are entirely unchecked, and no in-app beta banner component exists. The playbook describing what *should* happen is excellent; almost none of the tooling or ownership behind it is confirmed operational.

### 7. No backup exists for the one shared database
No `pg_dump` script, scheduled backup job, retention policy, or restore runbook exists anywhere in the repo. Combined with Risk #1's shared-write contention, a single bad write or accidental reset could lose all 5 users' data with no way to recover it.

### 8. No rate limiting on cost-bearing AI/data endpoints
Nothing prevents a single user (or a frontend bug causing repeated calls) from triggering unbounded OpenAI/Finnhub API usage. For an operator running a small beta on a personal budget, an unexpected cost spike is a real operational failure mode, not just a technical one.

### 9. No privacy disclosure or data-deletion path for real personal data
`InvestorProfile` persists age, country, risk tolerance, and investment goals server-side, but there is no Privacy Policy, Terms of Service, or account/data-deletion control anywhere in the shipped product for a beta participant to read or invoke — a real gap for anyone asked to hand over even lightweight personal/financial-preference data.

### 10. No way to diagnose "something happened to my account" reports
With console-only logging (no request IDs, no aggregation) and all 5 users sharing one account (Risk #1), if a user reports something strange happened to their portfolio, there is currently no reliable way to trace which action caused it or attribute it to a specific person's session.

---

## Bottom Line

The top 3 risks (shared-account data corruption, no crash recovery, no working support channel) are sufficient on their own to make a 5-person beta fail within days, independent of anything about the product's content quality. All three are operational/infrastructure gaps, not feature gaps, and none require touching AI logic, recommendation quality, or the learning system to address.
