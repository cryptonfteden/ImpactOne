# POST_DEPLOYMENT_RISK_REGISTER.md — Phase REMOTE-AND-DEPLOYMENT-VERIFICATION-001

Ranked risk register, reusing this repository's own established `BUG_SEVERITY_STANDARD.md` Critical/High/Medium/Low scale. Covers mission Sections 4 (Product honesty) and 5 (Device readiness), plus the repository/remote-integrity findings from `REMOTE_BACKUP_AUDIT.md` that carry real operational risk.

---

## CRITICAL

### C1. Real API keys are exposed in git history that is now confirmed pushed to GitHub
- **Evidence:** `git show 7676e23:frontend/.env` / `git show 5d855ea:frontend/.env` (both real, reachable ancestors of the current `HEAD`) contain a real `FINNHUB_API_KEY` and a real, correctly-shaped `OPENAI_API_KEY`. Both commits are confirmed present on GitHub via `git ls-remote`/a real network clone. See `REMOTE_BACKUP_AUDIT.md` §1/"Secret exposure."
- **Mitigating factor, independently confirmed:** the repository is private (anonymous fetches of the repo page and raw file content both returned HTTP 404) — not confirmed public-internet-readable.
- **Impact:** any current or future collaborator with repository access (or anyone who gains access, e.g. a future accidental visibility change, a compromised collaborator account, or a fork) can read both real key values from history, even though current `HEAD` doesn't track any `.env` file.
- **Owner:** repository operator (the same person who already made the documented decision not to rewrite history).
- **Exact closure requirement:** rotate both keys now (revoke `FINNHUB_API_KEY` in the Finnhub dashboard, revoke the `OPENAI_API_KEY` in the OpenAI dashboard, issue new ones) and confirm the new values are only ever placed in untracked `.env` files, never committed. This was already identified and disclosed by the `GITHUB-BACKUP-AND-DEPLOYMENT-001` phase; this audit found no evidence rotation has been completed yet — closure requires confirming it has actually happened, not just that it was decided.

### C2. No real production deployment exists — the mission's own premise is unmet
- **Evidence:** zero hosting configuration files anywhere in the repository (confirmed via file search on the real GitHub clone); `DEPLOYED_ENVIRONMENT_MATRIX.md` itself lists every production variable as "not yet provisioned"/"not yet known"; no frontend or backend HTTPS URL exists anywhere to check against.
- **Impact:** the majority of this mission's Section 2 (Deployment evidence) and part of Section 5 (Device readiness "where technically possible") cannot be verified at all, not because of a testing gap but because there is nothing deployed to test. See `DEPLOYMENT_EVIDENCE_VERIFICATION.md` for the full itemized breakdown.
- **Owner:** repository operator (hosting-platform choice, credentials, and real secrets are all explicitly named as operator-only decisions in `PRODUCTION_DEPLOYMENT_RESULT.md`, correctly not fabricated by any prior phase).
- **Exact closure requirement:** complete `PRODUCTION_DEPLOYMENT_RESULT.md`'s own operator checklist (choose a host, provision a real Postgres instance, generate real `JWT_SECRET`/`ADMIN_API_KEY`, set real `CORS_ALLOWED_ORIGINS`/`VITE_API_BASE_URL`, deploy, then re-run this exact verification phase against the real resulting URLs).

---

## HIGH

### H1. The long-documented AI-trust "repeated generic reasoning" defect is still live on two key surfaces
- **Evidence, freshly re-verified this phase via a live local browser walkthrough:** Daily Feed's "Fed rate hike" and "FOMC Rate Decision" — two different real headlines — share byte-identical Importance (73/100), Confidence (81/100), Attention score (81/100), and affected-holdings list. Recommendations screen's GOOGL/NVDA/MSFT all share byte-identical "Would prove it wrong" ("Compute buildout guidance is walked back next quarter"), "What would change my mind" ("Prediction markets lean unfavorable"), and "Watch next" ("Sector concentration: 47% of portfolio in this sector.") text.
- **What has genuinely improved (credited, not just criticized):** "AAPL earnings" vs. "Earnings calendar concentration" now correctly show *different* affected-holdings lists (SPY correctly prepended only for the headline naming no specific company) — the RC1-BLOCKERS-001 partial fix is real and still holding.
- **Impact:** this is the single most-repeated, most-persistent trust defect across this entire multi-month engagement's history (documented in some form since Sprint 26). It directly undermines the product's core "real, evidence-specific reasoning" value proposition, and is now confirmed present in the *highest-stakes* surface (Recommendations — actual buy/sell guidance), not just informational feed content.
- **Owner:** AI/analytics engineering (recommendation-engine and historicalSimilarityService/propagationEngineService owner).
- **Exact closure requirement:** apply the same class of fix already proven to work in `impactIntelligenceService.js` (real, checkable per-event/per-symbol differentiation) to (a) the Fed-rate-hike/FOMC-decision scoring pipeline and (b) the Recommendations engine's counterargument/invalidation/watch-next generation, which remains a completely separate, unfixed code path. Verify by live-capturing the same two headline pairs and at least 3 same-sector recommendations, confirming their reasoning differs in ways traceable to real, distinct facts.

### H2. Watchlist Folders remains broken for Guest/no-invite-code sessions
- **Evidence:** live-confirmed this phase — console error "A beta user identity is required for notifications"/"...for price alerts" repeats across Home, Flagship, and NotificationCenter for the default Guest session; consistent with the same long-documented gap found in every prior audit phase.
- **Impact:** a real, functional dead end for any user without a beta invite code, on multiple prominently-linked features (notifications, price alerts, watchlist folders).
- **Owner:** frontend/backend (beta-identity vs. Guest-session boundary owner).
- **Exact closure requirement:** as stated in the prior RC1 audit's risk register — either make these endpoints tolerate a Guest/anonymous session with a clearly-scoped experience, or replace the generic 400/console error with an explicit, honest "Sign up with an invite code" message. Not re-derived fresh this phase; carried forward as still-open, independently reconfirmed live.

---

## MEDIUM

### M1. Frontend's Fear & Greed / Flagship quote lookup fails with "Ticker not found" for a market-index symbol
- **Evidence, new finding this phase:** live console error `[frontend] flagship: quote/fearGreed load failed Ticker not found. Please enter a valid US stock ticker.` and a matching backend log line `GET /api/quote?symbol=SPY 404`, observed on the Flagship screen's live load this phase.
- **Impact:** the Fear & Greed widget on Flagship silently fails to show its intended composite value for a real, common market-index symbol (SPY) — degrades honestly (an error is logged, not fabricated data), but represents a real, previously-undocumented (in this session's reviewed history) minor functional gap on a prominent screen.
- **Owner:** market-data provider integration owner (whichever service backs `/api/quote`).
- **Exact closure requirement:** confirm whether `/api/quote` is expected to resolve index/ETF symbols like `SPY`, and either fix the lookup or change the Fear & Greed widget to request a symbol it can actually resolve. Low effort to diagnose given the error is specific and reproducible.

### M2. Backend/frontend suite pass counts differ by ±2 across recent independent runs (2511 vs. 2513)
- **Evidence:** `RC2-STABILIZATION-001`'s own commit claimed 2513/2513; `RC2_RELEASE_REPORT.md`'s independent re-run (same commit range) reports 2511/2511. Both report 0 failures.
- **Impact:** low — the material fact (zero failures) is consistent across every run; the discrepancy is most likely environment-dependent test skip/inclusion behavior (e.g. a Redis-dependent test conditionally skipping), not investigated further this phase since it doesn't affect the pass/fail verdict.
- **Owner:** backend test-suite owner.
- **Exact closure requirement:** not release-blocking; worth a brief investigation in a future test-hygiene phase to confirm the exact source of the count variance, so future "N/N passing" claims are exactly reproducible.

---

## LOW

### L1. Device-readiness verification this phase is viewport-emulation only, not physical-device evidence
- **Evidence:** phone-portrait (390×844), phone-landscape (844×390), tablet-portrait (768×1024), and tablet-landscape (1024×768) were all tested via Playwright viewport emulation against the local dev instance — zero horizontal overflow at any of the four widths, correct bottom-nav/sidebar switching at each breakpoint, 73×48px bottom-nav touch targets (compliant with the 44×44 minimum), and confirmed real (not just claimed) `env(safe-area-inset-*)` usage in `styles.css`. Flagship's 3D scene was confirmed to render a real `<canvas>` element.
- **Impact:** none of this is physical-device evidence (real notch occlusion, real touch-target ergonomics, real GPU/battery behavior for the 3D scene, real network-throttled loading) — per this mission's own explicit instruction, physical-device success must not be inferred from emulation alone.
- **Owner:** whoever performs the eventual real-device pilot (per the existing `FOUNDER_PILOT_PLAN.md`/`SEVEN_DAY_USAGE_SCRIPT.md`).
- **Exact closure requirement:** not a defect — simply disclosed as a real, standing limitation of this and every prior code-level device-readiness check in this engagement's history. Physical-device verification remains a distinct, not-yet-performed step, correctly deferred to the real founder pilot once C2 (real deployment) is closed.

### L2. Local dev backend logs show zero undisclosed critical (5xx) errors this session — a positive finding, not a risk
- **Evidence:** full backend request log for this phase's live walkthrough reviewed directly — every response status observed was 2xx/3xx, or an expected/documented 400 (Guest-identity gate) or the one new 404 already tracked as M1. Zero 5xx responses.
- **Impact:** none — recorded here as a credited positive, consistent with this register's convention of surfacing both risks and confirmed-clean areas.
- **Owner:** n/a.
- **Exact closure requirement:** n/a — no action required. Re-verify against real production logs once C2 is closed, since local-dev logs are not equivalent evidence to production logs.
