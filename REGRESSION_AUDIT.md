# REGRESSION_AUDIT.md

**Phase X7-RC — Independent Release Certification**
**Format:** each item states what regressed or persisted, what was found this session to confirm or refute it, and current status.

---

### 1. Whole-app startup crash (found in the two immediately preceding sessions)
**Prior finding:** `Header.jsx` imported `BETA_USER_LABEL_STORAGE_KEY` from `BetaInviteGate.jsx`, which didn't export it — total blank-screen failure on every load.
**This session:** confirmed fixed. `Header.jsx` now imports from `useBetaIdentity`. Verified live, twice, including a genuinely cleared-storage session.
**Status: RESOLVED.**

### 2. Fresh-user path crash (found in the immediately preceding session)
**Prior finding:** a different export mismatch (`symbolIntelligenceApi`) crashed specifically the cleared-storage path.
**This session:** confirmed fixed — `services/api/index.js` now correctly exports it, and the underlying file provides it. Fresh sessions load without this error.
**Status: RESOLVED.**

### 3. Sidebar breadth / navigation consolidation (a running complaint across many sessions)
**Prior finding:** the sidebar had grown to roughly 14 items across this engagement's testing.
**This session:** confirmed reduced to 8 (Today, Market Dashboard, Decision Center, Portfolio, Workspaces, More tools, My Profile, Settings).
**Status: RESOLVED / genuine improvement.**

### 4. The invite/identity gate cannot actually trigger for a new user (first diagnosed 3 sessions ago)
**Prior finding:** the gate's rendering condition depends on a global `hasProfile` fact, so it can never show once any profile exists anywhere on the shared backend.
**This session:** confirmed still present — `AppRoot.jsx`'s relevant condition still includes `!hasProfile` as a requirement. Live-tested: a cleared-storage session does not see the invite gate and lands directly in the pre-existing shared account.
**Status: NOT RESOLVED — persisted across 4 consecutive sessions now (X4, X5, X6, X7, this one).**

### 5. Decision Center's contradictory error/empty-state double-messaging (found across 2 prior sessions)
**Prior finding:** the screen shows a real error and a "nothing to show" empty state simultaneously.
**This session:** the error presentation improved (a proper card with a retry button) but the double-messaging itself is still present, and the error copy ("usually temporary") is inaccurate for what is actually a persistent identity-gate failure.
**Status: PARTIALLY RESOLVED — presentation improved, underlying contradiction and message accuracy not fixed.**

### 6. Market Dashboard / Executive Dashboard (new this cycle)
**This session:** initially 404'd due to a stale backend process (not a code defect — resolved by restarting). Once fresh, rendered correctly with six real, honest, well-curated lists.
**Status: WORKING, once backend freshness is confirmed** — flagging the stale-process risk itself as a process gap, not a product defect.

### 7. Click reliability on multiple buttons (new this session)
Real mouse clicks (via browser automation) at the correct coordinates of the welcome modal's "Got it" button and several sidebar navigation buttons had no effect, while JavaScript-dispatched synthetic clicks on the same elements worked immediately. Reproduced on more than one button.
**Status: NEW, UNCONFIRMED SEVERITY** — reported with explicit uncertainty about whether this reflects a real product defect or a testing-environment artifact; recommend a human verify with a real mouse before treating this as certain.

---

## Summary

Two real regressions from prior sessions are now confirmed fixed (items 1–2), one long-running complaint is resolved (item 3), one long-running root-cause bug remains open across four sessions (item 4), one prior finding is partially improved (item 5), and one new finding needs human confirmation (item 7).
