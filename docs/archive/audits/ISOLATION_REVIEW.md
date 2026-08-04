# ISOLATION_REVIEW.md

**Phase F2 — Isolation Design Review**
**Date:** 2026-07-23
**Objective:** break the proposed Beta User Isolation architecture. Assume exactly five beta users. No feature expansion, no code changes made in this review.

---

## 0. There Is No Proposed Design to Review — Verified, Not Assumed

Before attacking anything, I checked whether a "Beta User Isolation" design actually exists: `git log` (no new commits since `063bdd4`), `git status` (no new tracked or untracked isolation/tenancy files), and a repo-wide search for "isolation," "multi-tenant," and "userId" across every markdown file. **No proposed architecture document, RFC, or code change for beta-user isolation exists anywhere in this repository as of this session.** What exists instead is the *diagnosis* — several prior audits (`PRODUCTION_READINESS_REPORT.md`, `IMPACTONE_CTO_REVIEW.md`, `SPRINT17_MASTER_PLAN.md`, `FIVE_YEAR_ARCHITECTURE_ROADMAP.md`, and this engagement's own `TOP_10_OPERATIONAL_RISKS.md` #1) all independently confirm the same problem (`Portfolio` and `InvestorProfile` are single global rows, no `userId` column anywhere) but none of them contain an actual proposed *solution* design.

Rather than stop here, this review evaluates the **minimal, most-likely design** implied by the repo's own already-written recommendations — `FIVE_YEAR_ARCHITECTURE_ROADMAP.md`'s "add nullable `userId`/`tenantId` columns to every table now" and `SPRINT17_MASTER_PLAN.md`'s "add a `User` model... `userId` FK on `Portfolio`/`Recommendation`/watchlist persistence" — scoped down to exactly five known, pre-invited beta users (not public signup, consistent with "no feature expansion"). This is stated explicitly as an inferred stand-in, not a document anyone actually wrote or approved. Every finding below assumes this reference design unless noted.

**Reference design assumed for this review:**
1. Add a nullable `userId` (or `betaUserId`) column to `Portfolio` and `InvestorProfile`.
2. No full auth system — each of the 5 pre-provisioned users gets a unique invite-link token (a UUID), stored client-side and sent on every request; backend middleware resolves it to a `userId` and scopes repository reads/writes by it.
3. Repository functions move from `findFirst()` (global singleton) to `findFirst({ where: { userId } })`.
4. Existing pre-beta data is migrated to one designated user or archived.

---

## 1. Data Leakage

**The most serious finding in this entire review:** isolating `Portfolio` and `InvestorProfile` storage does nothing on its own if the *recommendation-generation loop* isn't also isolated. `autonomousRecommendationEngine.runOnce()` currently evaluates a single portfolio/watchlist universe per scheduled run. If the reference design scopes storage but the scheduler still runs once globally (the cheaper, more likely implementation given "no feature expansion"), all five users would continue to see **identical recommendations, generated from whichever one portfolio the engine actually evaluated** — meaning a sentence like "Technology now makes up 46% of your portfolio" could be entirely true for User A and entirely false, but still displayed, for Users B through E. This is the exact same class of bug already found and flagged as the single worst prior trust failure in this product's history (a false personalized claim), except systemically guaranteed rather than incidental — isolating storage without isolating generation makes it worse, not better, because it would look fixed while still being broken for 4 of 5 users.

**Second finding:** any individual controller that forgets to add the new `where: { userId }` filter silently falls back to `findFirst()`'s old behavior — "whichever row exists" — meaning a partial rollout across the dozen or so call sites that touch `Portfolio`/`InvestorProfile` (portfolio controller, portfolio-engine controller, the recommendation engine's portfolio-summary builder, `feedPersonalizationService.js`) is not a smaller version of the bug, it's a silent, undetectable one — 4 users could work correctly while a 5th sees someone else's real financial data with zero error thrown.

**Third finding:** if the invite-link token is anything less than a cryptographically random UUID (sequential IDs, a predictable pattern, or a token embedded in a guessable URL), any one of five users could trivially enumerate and view the other four's tokens — a real, low-effort attack surface precisely because there are only five possible values to guess.

---

## 2. Race Conditions

**Shared in-process caches are the sharpest edge here.** This codebase already has five separate in-memory TTL caches (`finnhubCache`, `altDataCache`, `intelligenceCache`, plus inline caches in `openaiService.js`/`chatService.js`, confirmed in prior architecture review) that key by symbol/query, not by user. If isolation is added to the database layer but these caches aren't also re-keyed to include `userId`, a computed result for User A's portfolio composition could be served to User B from cache within the TTL window — a leakage bug that would be intermittent and hard to reproduce, exactly the worst kind to debug in a live 5-person beta.

**Find-or-create races.** If the "resolve token → find or create a Portfolio/InvestorProfile row for this userId" logic is a `findFirst()` followed by a separate `create()` (not a single atomic upsert), two near-simultaneous first requests from the *same* user (e.g., opening the app in two browser tabs, which is a completely normal thing for a real person to do) can race and create two different Portfolio rows for one person — surfacing to that user as "my portfolio randomly reset," indistinguishable from a bug report about data loss.

**Order-placement transactions.** The existing paper-trading order flow already wraps balance/position updates in a Prisma transaction scoped by `portfolioId`. If that `portfolioId` is fetched via a separate, unscoped call at the top of the request during a partial migration window (a common refactor mistake — updating the read path but not immediately updating the write path in the same commit), two users placing trades "at the same time" during the cutover could still contend on the same underlying row.

---

## 3. Accidental Sharing

**Device/browser sharing is a real, named risk for this specific cohort, not a generic edge case.** `PRIVATE_BETA_PLAYBOOK.md`'s own cohort design explicitly includes "parents (35–55) evaluating it to teach a teenager" pairs — i.e., a parent and teen sharing a household computer is an anticipated, encouraged usage pattern for this beta. If the beta-user token is stored in `localStorage` under a fixed key (mirroring the existing `impactone-watchlist`/`impactone-session-id` convention already used elsewhere in this codebase), two people sharing one browser profile would silently share one identity with no login screen to distinguish them — the isolation fix would not even apply to the cohort composition this product's own plan calls out by name.

**Watchlist stays unscoped regardless.** The frontend's watchlist is confirmed `localStorage`-only today, not server-persisted at all. A reference isolation design focused on `Portfolio`/`InvestorProfile` would leave watchlist exactly as browser-local as it is now — meaning a user switching devices loses their watchlist entirely. This isn't leakage, but it is a "why did my data disappear" support ticket indistinguishable from a bug, for a product that will already lack a working support channel (per `BETA_RISK_REVIEW.md` §2).

---

## 4. Migration Risks

**Existing data has no honest home.** Every `Portfolio`, `InvestorProfile`, `Recommendation`, `DecisionTrace`, and `Outcome` row generated so far belongs to the single pre-isolation account used throughout this entire review engagement. A migration must decide: attach this history to one of the five real beta users (confusing — that person would see months of trades and graded outcomes they never made), or discard it (losing the "Lessons Learned"/calibration track record, one of the few features this engagement's reviews found to be genuinely trust-building). Neither option is clean, and a design that doesn't make this decision explicitly is not actually ready to implement.

**`DecisionTrace` immutability collides with backfill.** Prior architecture review confirmed `DecisionTrace` is immutable by convention (no update method exists anywhere in the codebase). Backfilling a `userId` onto historical `DecisionTrace` rows after the fact is either a one-time, deliberate exception to that immutability guarantee (a real precedent worth naming explicitly, not doing quietly), or those rows stay permanently unattributed — meaning the calibration/"Lessons Learned" history can never be correctly scoped to a specific beta user's account going forward, undermining the exact feature this migration is nominally trying to preserve.

**Nullable-first is the only safe schema path.** Every Prisma migration in this repo's history so far has been additive (nullable new columns, same-day, no destructive changes, per this engagement's own architecture notes). Adding a *required* `userId` to a table with existing rows would fail outright unless the column is nullable-first and explicitly backfilled in the same migration — a materially different, riskier class of change than anything shipped to date, and worth flagging as a new category of risk this specific change introduces.

---

## 5. Analytics Contamination

**The analytics pipeline is deliberately, explicitly anonymous today** — `AnalyticsEvent` has no `userId`/profile/device-identifier column, only a random per-browser UUID, and the backend service's own code comments state this is intentional so "nothing from the investor profile... could be smuggled in even by an incorrect caller." **The single biggest risk an isolation build-out introduces here is the natural temptation to "helpfully" add the new beta-user identity to analytics events** so the team can see "what did beta user #3 do" — doing so would silently reverse an explicit, already-shipped privacy invariant without that reversal ever being reviewed as its own decision.

**A subtler version of the same risk:** if the existing per-browser `sessionId` (already used purely for anonymous Time-To-Value measurement) is reused or conflated with the new beta-user identifier as a shortcut, analytics becomes identifiable by construction — and retroactively contaminates every historical event already collected under the explicit promise that it couldn't be tied to a person.

**Recommendation for any real design:** state explicitly, as a named non-goal, that the beta-user identity system and the analytics identity system remain permanently separate and never share a token, a database column, or a join key.

---

## 6. Feedback Contamination

`RecommendationFeedback` (the six-option reaction picker on `RecommendationCard.jsx`) has no user scoping today either — same single-global-account problem as Portfolio. If the isolation design fixes `Portfolio`/`InvestorProfile` but Recommendations/DecisionTrace stay generated from one shared universe (the Data Leakage §1 risk), feedback submitted by different users would still land against the *same* underlying recommendation records, with no way to tell whose "Not useful" or "Don't understand" reaction came from whom.

**With only five users, this is a sharper statistical risk than it would be at larger scale.** `PRIVATE_BETA_PLAYBOOK.md`'s own cohort deliberately includes "experienced or semi-professional investors, deliberately skeptical by disposition" specifically because they're expected to react differently than beginners. If that one person's feedback pattern (e.g., marking many things "Not useful") can't be separated from the other four's, the Learning Loop panel's aggregate signals (`feedbackSignals.byType`, already a real, built feature per this session's research) would misrepresent one skeptical person's pattern as "the beta cohort thinks this is unhelpful" — precisely the small-N misattribution risk `BETA_FEEDBACK_ANALYSIS.md` itself warns about, except caused by an isolation gap rather than an interpretation error.

---

## Summary of What Would Have to Be True Before This Could Work

1. Recommendation/DecisionTrace generation must be scoped per user, not just storage — otherwise isolation is cosmetic.
2. In-process caches must be re-keyed by user, not just by symbol/query.
3. The find-or-create path for a new user's first row must be a single atomic operation.
4. A named person must decide, explicitly, what happens to all pre-existing Portfolio/Recommendation/Outcome history before migration — not leave it implicit.
5. Analytics must remain permanently, structurally separate from the new beta-user identity, stated as an explicit non-goal.
6. Feedback records need the same per-user scoping as Portfolio, or the small-N misattribution risk above is guaranteed, not hypothetical.

None of these six conditions are addressed by the reference design inferred for this review, because no actual design exists yet to address them.
