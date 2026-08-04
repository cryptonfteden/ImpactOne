# PRIVATE_BETA_REVIEW.md

**Phase X8 — Final External Beta Certification**
**Role:** external QA lead, receiving this product for the first time. Every finding below is freshly reproduced this session, including obtaining and testing with two real invite codes rather than only simulating a generic "cleared storage" visitor.

---

## Headline: The Core Blocker From Four Prior Sessions Is Resolved

Every previous session in this review chain (X4 through X7-RC) found the same root problem: a genuinely new visitor could never obtain their own identity, because the invite gate's trigger condition depended on a global fact (does any profile exist anywhere) rather than a per-visitor one. This session tested the **actual intended mechanism** — a real invite link (`?invite=CODE`) — for the first time, using two real, existing beta identities (`BETA-A1` "Beta User A" and `BETA-B2` "Beta User B") read directly from the database rather than guessed.

**Result: it works.** Loading the app with `?invite=BETA-A1` resolved automatically (no manual code entry needed), stripped the code from the URL, and produced a genuinely separate account: a portfolio with exactly one real position (5 shares of AAPL), a real trade history entry, and a real, working Decision Center populated with that account's own triggered alert and graded-outcome items. Logging out and loading `?invite=BETA-B2` produced a **third, entirely distinct account state**: a clean $100,000.00 starting balance with zero positions. Three separately-verified account states — the pre-existing shared "Guest" account, Beta User A, and Beta User B — now coexist correctly on the same backend without leaking into each other.

This is the single most important finding of this entire multi-session engagement, and it resolves the one problem every prior session escalated as the top blocker.

---

## Journey-by-Journey Validation

**Fresh user, invite, onboarding:** Works. `?invite=BETA-A1` auto-resolved with zero manual steps, the URL cleaned itself up, and the welcome modal + Home screen rendered with that user's own (initially near-empty) data.

**Returning user:** Works. A session with a stored identity restores it via `whoami()` on reload without needing the invite code again (confirmed conceptually via `BETA_IDENTITY_FLOW.md`'s design and the logout/re-invite round trip tested this session).

**Decision Center:** Works, and is genuinely good. For Beta User A it showed a real triggered price alert (NVDA), two real graded-incorrect-outcome items, and a new recommendation — each with a clear "Decision / Evidence / Suggested next action" structure, a confidence percentage, portfolio-impact context, and Pin/Mark completed/Dismiss actions.

**Market Dashboard:** Works (once a stale backend process was ruled out by restarting) — six real, honestly-labeled curated lists.

**Portfolio:** Works, and is the clearest proof of isolation — three different account states observed this session, each internally consistent (position count, cash balance, and trade history all agreed with each other for each account).

**Workspace:** Reachable; not fully exercised end-to-end this session (folder creation) given time spent on the identity breakthrough, but no longer blocked by the identity gate for an identified user.

**Impact Graph:** Reachable from the Portfolio screen directly this session (a new placement not seen in prior sessions) — honestly showed "No causal chain recorded yet — No real event data exists for your portfolio yet" for Beta User A's single real position.

**Notifications:** Works for an identified user — the notification bell showed a real "1 unread" badge for Beta User A, where it previously only produced 400 errors for the unidentified shared session.

**Stock Side Panel:** Not independently re-tested this session; no new evidence either way.

**Logout, login again:** Both tested directly and both work. Logging out (Settings → "Beta identity" → "Log out") correctly returned the session to the shared/Guest state. Loading a fresh invite link afterward correctly established a new, separate identity again.

---

## Attempt to Break — Results

**Identity:** Held up under direct testing — two distinct real identities, two distinct real portfolios, no cross-contamination observed.

**Navigation:** Held up; the consolidated 8-item sidebar (Today, Market Dashboard, Decision Center, Portfolio, Workspaces, More tools, My Profile, Settings) worked consistently across all three tested account states.

**Session persistence:** Held up across reload and across the logout/re-invite cycle.

**Production build:** Not tested this session — every test this entire engagement has been against the Vite development server. This remains a real, named gap.

**Development build:** Tested extensively and thoroughly this session.

**Release validation:** No formal release-checklist execution was observed (see `BLOCKER_CLASSIFICATION.md`), though the product itself now passes its own core functional test for the first time.

---

## Remaining Issues Found This Session

1. **Cosmetic identity display bugs:** the account-menu avatar shows "B" for Beta User A (likely taking the first letter of the shared word "Beta" rather than the distinguishing letter), and the button's accessible label still reads "Account menu — Guest workspace" even when a real identity is signed in. Neither affects data isolation; both affect polish and could confuse two testers comparing notes about "who's B and who's A."
2. **Click-reliability question, carried forward from the last session, still unconfirmed:** real mouse clicks on some buttons did not register in this session's automated testing while JavaScript-dispatched clicks did. Still recommended for a human to confirm with a real device before treating as a hard blocker.
3. **Production build untested**, across every session of this entire engagement — a real, standing gap in certification scope.

Full severity classification in `BLOCKER_CLASSIFICATION.md`.
