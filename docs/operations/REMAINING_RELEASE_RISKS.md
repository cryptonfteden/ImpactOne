# REMAINING_RELEASE_RISKS.md — Phase RC1-INDEPENDENT-VERIFICATION-001

Ranked risk register. Severity scale reused from this repository's own `BUG_SEVERITY_STANDARD.md` (Critical/High/Medium/Low), consistent with this engagement's established convention of reusing existing standards rather than inventing new ones.

---

## CRITICAL

### C1. Backend cannot start from a clean checkout — missing `userRepository.js`
- **Evidence:** `git log --oneline --all -- backend/services/userRepository.js` and `git ls-files backend/services/userRepository.js` both return empty — this file has never been committed. It is required, unconditionally and synchronously, by already-committed `backend/services/authService.js` and `backend/services/accountService.js`, which are in turn required by the committed, unconditional route-registration chain (`server.js → app.js → routes/index.js → authRoutes.js → authController.js → authService.js`).
- **Impact:** a fresh `git clone` + correct `npm install`, at current `HEAD`, would crash the entire backend process at startup with `Cannot find module './userRepository'` — not a degraded feature, the whole server never listens.
- **Owner:** backend engineering (whoever completed the `COMMERCIAL-MVP-001`/commercial-infrastructure auth work).
- **Exact closure requirement:** the file already exists on disk, is already used correctly by the code that requires it, and needs no rewrite — it only needs to be committed: `git add backend/services/userRepository.js && git commit`. Verify closure by performing an actual fresh clone into a scratch directory and confirming `node server.js` boots without a `MODULE_NOT_FOUND` error.

### C2. Backend cannot start from a clean checkout — undeclared dependencies
- **Evidence:** `git show HEAD:package.json` does not list `bcryptjs`, `jsonwebtoken`, or `stripe`; `git diff package.json`/`package-lock.json` show all three only as uncommitted working-tree additions. Already-committed `authService.js` requires `bcryptjs`/`jsonwebtoken`; already-committed `stripeBillingProvider.js` requires `stripe`.
- **Impact:** identical class of impact to C1 — a fresh `npm install` at current `HEAD` would not install these three packages, and the same `Cannot find module` crash would occur even if C1 were fixed first. The two defects are independent and compounding; fixing only one still leaves the backend unable to boot.
- **Owner:** backend engineering.
- **Exact closure requirement:** commit the already-present, already-correct working-tree changes: `git add package.json package-lock.json && git commit`. Verify by a fresh clone + `npm install` + boot, same as C1 — ideally verify both C1 and C2 together in the same clean-clone test, since either alone is insufficient.

---

## HIGH

### H1. Recommendations screen still shows fully templated, non-evidence-specific reasoning
- **Evidence:** live capture this session — GOOGL, NVDA, and MSFT recommendations share byte-identical "Would prove it wrong," "What would change my mind," and "Watch next" text, differing only in Quality/Confidence numbers. This is the same defect this engagement has documented across multiple prior phases, in the single highest-stakes trust workflow (actual buy/sell/hold guidance), and the current uncommitted `RC1-BLOCKERS-001` fix does not touch this code path at all.
- **Impact:** users evaluating real trade decisions are shown reasoning that reads as fabricated/generic rather than analysis-specific, directly undermining the "AI trust" pillar of this product's value proposition.
- **Owner:** AI/analytics engineering (recommendation-engine owner).
- **Exact closure requirement:** apply the same class of fix already proven to work in `impactIntelligenceService.js` (extract and lead with real, symbol-specific, checkable facts; use a genuine per-symbol differentiator instead of a category-level template) to the Recommendations engine's counterargument/invalidation/watch-next generation. Verify by live-capturing at least 3 recommendations in the same sector and confirming their reasoning text differs in ways traceable to real per-symbol facts.

### H2. Watchlist Folders is unreachable for Guest/no-invite-code sessions
- **Evidence:** live this session — clicking the newly-correctly-labeled "Watchlist Folders" nav entry as a Guest produces "Couldn't load your watchlist folders right now" and a console error "A beta user identity is required for watchlist folders" (HTTP 400).
- **Impact:** an entire, prominently-linked-to feature is non-functional for any user without a beta invite code — a real functional dead end, now more discoverable (not less) because the nav-consolidation fix correctly points more paths at it.
- **Owner:** frontend/backend (whoever owns the beta-identity vs. Guest-session boundary).
- **Exact closure requirement:** either (a) make the watchlist-folders endpoint tolerate a Guest/anonymous session with a clearly-scoped, non-persistent experience, or (b) if Guest access is intentionally out of scope for this feature, replace the generic error with an explicit, honest "Sign up with an invite code to use Watchlist Folders" message rather than a bare failure. Verify live as a Guest session.

---

## MEDIUM

### M1. 68 local commits are not backed up to any remote
- **Evidence:** `git rev-list --count origin/sprint-16-live-data..HEAD` = 68 of 277 total commits on the branch; a real, tracked remote exists (`origin`), so this is a genuine backup gap, not an absent-remote situation.
- **Impact:** loss or corruption of this single local working copy would lose 68 real commits of work, including every fix produced across this engagement's recent phases.
- **Owner:** repository owner/operator (this is a deliberate decision — pushing was out of scope for this audit phase and was not performed).
- **Exact closure requirement:** `git push origin sprint-16-live-data` (or the equivalent for whichever branch is intended as the shipping branch) once the operator has reviewed what's being pushed. Not performed in this session per the mission's explicit "do not commit" constraint (pushing is also a shared/hard-to-reverse action out of scope for an audit-only phase).

### M2. `intelligenceBusService.test.js` clock-flakiness fix not yet confirmed passing end-to-end
- **Evidence:** a real, well-targeted uncommitted fix exists (explicit fixed `now`/`publishedAt` values replacing real-wall-clock reads), but this session's own full backend test run had not reached a final summary line at report time, so the fix's actual effect on this specific historically-flaky test was not independently confirmed passing in this session.
- **Impact:** low functional risk (the fix is well-reasoned and narrowly scoped) but a real gap in this session's own verification completeness.
- **Owner:** whoever finishes the `RC1-BLOCKERS-001` work.
- **Exact closure requirement:** re-run `node --test backend/services/intelligenceBus/intelligenceBusService.test.js` in isolation to a clean completion and confirm 0 failures, ideally 2+ times in a row to rule out any remaining timing sensitivity.

### M3. AI-trust fix is only partial — numeric scores remain identical across differentiated events
- **Evidence:** "AAPL earnings" vs. "Earnings calendar concentration" now differ in affected-holdings text but remain identical in Importance/Confidence/Attention scores (63/67/69 for both).
- **Impact:** a user comparing the two events by their numeric scores alone would still see no difference, even though the qualitative text now correctly differs — a partial, inconsistent trust signal.
- **Owner:** AI/analytics engineering.
- **Exact closure requirement:** extend the scoring pipeline to weight the same real, checkable facts (ticker-specificity, event concreteness) already used by the affected-holdings fix, so the numeric scores and the qualitative text tell a consistent story. Verify live on the same two headlines used in this audit.

---

## LOW

### L1. Untracked `CEO_AUDIT_EXPORT/`/`CEO_EVIDENCE_PACK/` directories clutter the working tree
- **Evidence:** `git status --short` shows both as untracked; contents confirmed benign (summary/timeline docs only).
- **Impact:** none functional; minor repository-hygiene noise.
- **Owner:** whoever generated these exports.
- **Exact closure requirement:** either commit them (if intended as permanent artifacts) or add to `.gitignore`/delete (if meant to be transient) — a low-priority housekeeping decision for the repository owner, not a release blocker.

### L2. `RC1_CHECKLIST.md`'s remaining open items (react-router-dom removal, hosting/domain/secrets decisions, live SIGTERM test, physical Android install) are still open
- **Evidence:** directly read `RC1_CHECKLIST.md`, cross-checked each item's current state — all confirmed still genuinely open, none silently resolved or newly broken.
- **Impact:** none new; these are pre-existing, already-disclosed, operator-level decisions unrelated to code correctness.
- **Owner:** product/operations owner.
- **Exact closure requirement:** as previously documented in `RC1_CHECKLIST.md` — no new requirement introduced by this audit.
