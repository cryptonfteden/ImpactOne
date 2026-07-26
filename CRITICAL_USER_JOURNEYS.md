# CRITICAL_USER_JOURNEYS.md

**Phase X7-RC — Independent Release Certification**

---

## Journey 1: Fresh Browser, First Visit

Load succeeds (confirmed fixed this session). Welcome modal appears. The modal's "Got it" button did not respond to a real mouse click in this session's testing (see `REGRESSION_AUDIT.md` #7) — a JavaScript-dispatched click was required to proceed, which a real user cannot do. **Result: potentially blocked at the very first interaction, pending human confirmation of the click issue.** No invite-code entry screen ever appears; the session lands directly in the existing shared account (same portfolio, same positions as every other test session this engagement has run). **Result: identity is not actually established for a new user.**

## Journey 2: Returning Browser

Load succeeds cleanly, no errors, real content renders immediately. **Result: works.**

## Journey 3: Incognito / Cleared LocalStorage

Same as Journey 1 (cleared storage was the method used to simulate this) — loads without crashing (a genuine improvement), but the same lack of an invite-gate/new-identity path applies. **Result: functions like a returning session against the shared account, not like a genuine new identity.**

## Journey 4: Cleared SessionStorage Only

Not independently tested this session (localStorage is the relevant persistence layer for this app's identity/onboarding flags); not expected to differ meaningfully from Journey 3 given the architecture, but not directly confirmed.

## Journey 5: Production Build vs. Development Build

Not tested this session — all testing was against the Vite development server (port 5174). A production build (`npm run build` + serving the static output) was not exercised. This is a real, named gap in this certification: nothing here confirms the production bundle behaves identically to the dev server, particularly for the module-resolution class of bug found and fixed this cycle (dev-server ESM resolution and a bundler's resolution can behave differently for a genuine export/import mismatch).

## Journey 6: Reach Decision Center

Reachable via navigation. Fails with a clear (if slightly inaccurate) error message and a working retry button, rather than a crash. Correctly, honestly gated behind an identity requirement — but since no real identity can be obtained (Journey 1), this journey cannot be completed end-to-end by any real user today.

## Journey 7: Reach Market Dashboard

Reachable, and once a fresh backend was confirmed, loads real, honest, well-curated content. **Result: works, once the backend is verified current.**

## Journey 8: Reach Workspaces (Watchlist Folders)

Reachable, same identity gate as Decision Center, same practical dead end.

## Journey 9: Reach the Stock Side Panel / Charts / Impact Graph / Notifications

Not independently re-tested this session given time constraints; no new evidence either way. Prior sessions found these functional once reached.

---

## The One Journey That Matters Most

**A genuinely new person, receiving an invite for the first time, still cannot establish their own identity or see their own data separately from the existing shared account.** Every other journey in this document is downstream of this one. This is the fourth consecutive session to confirm this exact gap.
