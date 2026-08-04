# RC1_EVIDENCE_MATRIX.md — Phase RC1-INDEPENDENT-VERIFICATION-001

Every claim checked this session, with its exact evidence. Status: ✅ Confirmed true · ⚠️ True but incomplete/partial · ❌ Confirmed false or contradicted · 🔬 In progress, disclosed as such.

## AI Trust

| Claim | Status | Evidence |
|---|---|---|
| "AAPL earnings"/"Earnings calendar concentration" now show genuinely different affected-holdings | ✅ | Live: first shows `AAPL, NVDA, MSFT, AMZN,...`; second shows `SPY, AAPL, NVDA, MSFT, AMZN,...` — SPY correctly prepended only for the headline naming no specific company |
| Same pair's numeric scores (Importance/Confidence/Attention) are now differentiated | ❌ | Live: 63/67/69 vs. 63/67/69 — unchanged, fully identical |
| "Fed rate hike"/"FOMC Rate Decision" are differentiated by the RC1-BLOCKERS-001 fix | ❌ | Live: identical explanation text, Importance 73/73, Confidence 81/81, Attention 81/81, identical affected-holdings — fix correctly does not fabricate a difference where neither headline names a ticker, but the pair remains fully indistinguishable |
| Recommendations (GOOGL/NVDA/MSFT) templating is resolved by this fix | ❌ | Live: all 3 still share byte-identical "Would prove it wrong"/"What would change my mind"/"Watch next" text — this fix does not touch the Recommendations engine's own code path |
| No fabricated variation was introduced by the fix | ✅ | The fix's own logic (`extractMentionedTicker`) only differentiates when a real, literal ticker is named in the headline — a genuine fact, not an invented one; confirmed it does NOT force artificial variety on genuinely-similar events (Fed rate hike/FOMC pair above) |

## Navigation Clarity

| Claim | Status | Evidence |
|---|---|---|
| 3D Workspace demoted from Primary nav | ✅ | Live: Primary list is `Today, Flagship, Market Dashboard, Decision Center, Portfolio, Workspaces` — 3D Workspace confirmed absent, present under "More tools ▾" instead |
| Watchlist mobile "More" link points at the canonical destination | ✅ | Live: label now "Watchlist Folders", clicking it renders the real `WatchlistFoldersScreen.jsx` — same screen the desktop "Workspaces" sidebar entry reaches |
| Watchlist Folders works for a Guest (no invite code) session | ❌ | Live: "Couldn't load your watchlist folders right now" / console: "A beta user identity is required for watchlist folders" — unchanged, this is a functional gap the nav-consolidation fix never addressed |
| Tablet/desktop responsive fixes from PIXEL-PERFECT-001 still hold | ✅ | `styles.css` untouched by any uncommitted change this session; no plausible regression mechanism, spot-checked live at 1440px |

## Repository Integrity

| Claim | Status | Evidence |
|---|---|---|
| `backend/services/userRepository.js` is committed | ❌ | `git log --oneline --all -- backend/services/userRepository.js` → empty. `git ls-files backend/services/userRepository.js` → empty. File has never existed in git history. |
| Already-committed code requires this file | ✅ | `authService.js` (committed, `git status` clean on this path): `const userRepository = require("./userRepository");`. `accountService.js` (committed) also requires it. |
| `bcryptjs`/`jsonwebtoken`/`stripe` are declared in the committed `package.json` | ❌ | `git show HEAD:package.json` → none of the three present. `git diff package-lock.json` → all three shown only as uncommitted additions. |
| Already-committed code requires these three packages | ✅ | `authService.js` (committed): `require("bcryptjs")`, `require("jsonwebtoken")`. `stripeBillingProvider.js` (committed): `require("stripe")`. |
| A clean checkout of `HEAD` can start the backend | ❌ | Direct consequence of the two rows above — `Cannot find module` at synchronous, unconditional `require()` time, before the server ever listens. Not directly re-executed as a literal clean-clone test this session (would require destructively altering the shared dev environment) — established via exhaustive, cross-referenced git-history + require-chain evidence instead, which is definitive for this specific class of claim (a `require()` either resolves or it doesn't; there is no ambiguity to test live once the manifest/git-history state is confirmed). |
| 68 local commits are unpushed | ✅ | `git rev-list --count origin/sprint-16-live-data..HEAD` = 68; `git rev-list --count HEAD` = 277. Remote confirmed real and tracked (`git remote -v`, `git branch -a`). |
| `react-router-dom` is genuinely unused | ✅ | Repo-wide grep for `react-router-dom` in `*.{js,jsx}` → zero matches anywhere. |
| The 3 deleted components (`KpiCard`/`WatchlistTable`/`AIInsightsSidebar`) have zero remaining importers | ✅ | Grepped each basename across `frontend/src` — zero real import matches for any of the three (one historical code-comment reference to `AIInsightsSidebar`, not a live import). |
| `CEO_AUDIT_EXPORT/`/`CEO_EVIDENCE_PACK/` contain anything sensitive | ❌ (i.e., confirmed they do NOT) | Directly listed both directories' contents — benign summary/timeline markdown files only. |

## Test Integrity

| Claim | Status | Evidence |
|---|---|---|
| Frontend suite passes cleanly | ⚠️ | 620/621 this session's own fresh run; the 1 failure (`AdvancedChart.test.jsx` ResizeObserver) is a known, pre-existing, non-deterministic jsdom flake — confirmed non-deterministic by contrast with the immediately preceding same-day `PIXEL-PERFECT-001` phase's own independent 621/621 run of the identical test with no relevant code changed in between |
| Backend suite passes cleanly (2502/2504 per `RELEASE-CANDIDATE-001`'s own claim) | 🔬 | This session independently started and directly monitored a full, fresh run (not trusted from the commit message) — zero failures observed across every checkpoint through 450+KB of real test output, but the run had not reached its own final summary line within this session's time budget. Disclosed as genuinely in-progress, not fabricated as complete. |
| The long-documented `intelligenceBusService.test.js` clock-flakiness has a real fix in progress | ✅ (fix present) / 🔬 (not yet confirmed passing in this session's own run) | Diff read directly: both affected tests now pass an explicit fixed `now` to `getEventById()` instead of the real system clock — the exact class of fix this flake has needed since first documented in this engagement's history. |
| Production build succeeds | ✅ | Independently re-run this session — clean, only pre-existing unrelated warnings. |

## Production Honesty

| Claim | Status | Evidence |
|---|---|---|
| No demo data shown as live | ✅ | Every unavailable state checked this session (Fear & Greed, Portfolio zero-trade state) was honestly, distinguishably labeled |
| No localhost dependency in production code paths | ✅ | Re-grepped `frontend/src` — same 3 legitimate, unchanged matches as the immediately preceding phase found |
| No hardcoded secret in tracked source | ✅ | Grepped for common live-secret key shapes — zero matches; `.env` confirmed untracked and gitignored |
| Production startup validation would fail fast on an insecure `JWT_SECRET`/missing `DATABASE_URL` | ✅ | Re-confirmed via source read (`backend/config/startupValidation.js`, unchanged by this session's uncommitted diffs) — real, already independently verified in an earlier phase |
| `/health`, `/health/live`, `/health/ready` all work | ✅ | Directly hit all three against a freshly booted instance this session — real, correct responses |

## Visual/Device Readiness

| Claim | Status | Evidence |
|---|---|---|
| Tablet/desktop/phone responsive fixes from `PIXEL-PERFECT-001` are unreverted | ✅ | `styles.css` confirmed untouched by any file in this session's `git status` diff; spot-checked live at 1440px |

## Operational Readiness

| Claim | Status | Evidence |
|---|---|---|
| A real production deployment exists | ❌ | Re-confirmed zero hosting config files anywhere in the repository |
| Database is real and connected | ✅ | `/health/ready`'s live `database: true` check |
| The commercial auth path is usable today | ❌ | Cannot even be exercised — the backend process containing it cannot start from a clean checkout (see Repository Integrity above) |
| Service-worker/PWA update mechanism still correct | ✅ (unchanged) | Not touched by any file in this session's diff; not re-derived from scratch, no plausible regression mechanism |
