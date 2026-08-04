# Sprint 26 — Beta Readiness — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 5 · **Date:** 2026-07-14

## Mission

Last sprint before the first closed beta. Kill every confirmed Trust Breaker from the independent review docs; make the product feel trustworthy enough that a real investor returns tomorrow.

## Method

Two research passes before any fix: one reading `EXECUTIVE_TRUST_REPORT.md`, `TRUST_AUDIT_LOG.md`, `PRODUCT_REVIEW_LOG.md` in full and cross-checking every claimed issue against the *current* codebase (not trusting the review docs blindly, since Sprint 24/25 had already fixed some things), and a second independent verification pass on the same claims. Both converged on the same short list of still-live issues — that convergence is itself the evidence base for this report's fixes.

## Trust Breakers killed this sprint

1. **False "Portfolio overlap detected" claim** (`EXECUTIVE_TRUST_REPORT.md`'s #1 finding, "above all other findings"). `autonomousMarketService.js`'s `relatedTickers` silently fell back to the generic asset-template stock list (the same ~4 symbols) whenever the user's real watchlist/portfolio had no match — and `hasPortfolioExposure` went `true` from that fallback alone, so a user with zero relevant holdings could still see "Portfolio overlap detected in AAPL, NVDA...". Fixed: exposure is now only ever computed from genuine watchlist/portfolio matches; an honest empty array otherwise. Proven by a new regression test using a watchlist symbol guaranteed never to appear in any generic template.

2. **Identical boilerplate "why" sentence.** `impactIntelligenceService.js`'s `analyzeIntelligence` used the exact same template ("The event 'X' affects cross-asset pricing through macro regime, positioning, and liquidity channels.") for every event, differing only in the substituted event name — this is the specific instance the reviewers quoted, in a code path Sprint 25's earlier fix (to a different file) hadn't reached. Now derived from the event's own real inputs: its affected sectors, its strongest historical analog, its propagation edge. Two different events now produce genuinely different sentences, proven by test.

3. **Generic sector/company lists for most events.** The same file's `adjustAffected` only differentiated 4 of the platform's real event categories (oil/crypto/fed/geopolitics-keyword matches); everything else fell through to the identical 4-stock/4-sector template. Now all 19 event categories have their own curated stocks/sectors, layered beneath the four sharper existing overrides. Duplicated the category keywords locally rather than importing them, since `autonomousMarketService.js` already requires this file — an import back would have created a circular require.

4. **Unexplained "G" account icon.** No tooltip, no title, generic aria-label; "Guest workspace" only appeared after clicking. Now stated up front.

5. **Two real React duplicate-key console warnings on Global Intelligence** (Capital Flows and Alpha Discovery lists), confirmed live via browser verification — a bug first flagged, but not fixed, in Sprint 20's closeout audit. Both lists can legitimately contain two entries whose key-forming fields collide; fixed with an index tiebreaker on both.

## Verified clean (checked, not assumed)

- **Main-content reachability** (reviewers' Critical/P0 "sidebar consumes the viewport" claim) — live browser verification across five distinct screens (Dashboard, Daily Feed, Themes, Recommendations, Global Intelligence) found every one reachable and rendering real content, zero layout collapse. This appears to have been a transient or environment-specific observation at review time, not a reproducible defect — recorded here as checked-and-clean rather than left as an open unknown.
- **Destructive-action confirmation, empty-state honesty, Why now/What changed, Uncertainty on Recommendations** — all already fixed in Sprint 25, re-verified still correct.
- **Reset confirmation flow, honest empty states across Portfolio screens** — re-confirmed working via the full test suite and live browser pass.

## What still remains (named, not hidden)

- **Confidence score's narrow real-world variance** (`alternativeFusionService.js`'s `confidenceBase = alt?.signals?.confidenceScore || 55` with only a ±2/±3 swing) — a structural scoring-model characteristic, not a copy/template bug like the others fixed this sprint. Changing it safely requires a real evidence-weighting redesign, which is architecture-level work this sprint's remaining budget did not responsibly support attempting under time pressure. Flagged as the single highest-priority item for the sprint immediately after beta.
- **Nav complexity** (12 sidebar items) — flagged again by the reviewers; still not consolidated, per Sprint 25's own reasoning: removing a real nav item without stronger product evidence would itself risk being a trust violation if wrong.
- **Onboarding flow existence** — reviewer claim not independently re-verified this sprint; recommend a dedicated check before beta invites go out.
- Uncertainty is still deliberately absent from Daily Feed/Home/Alerts cards — this is Sprint 24's own principled decision (no real per-item uncertainty is computed for generic feed items, so showing one would be fabrication), re-confirmed correct, not a gap.

## Verification

- **Backend:** 253/253 tests passing (full suite), run before every commit.
- **Frontend:** 96/96 tests passing (full suite), run before every commit.
- **Browser verification:** live pass confirming all fixes render correctly, five screens fully reachable, zero console errors after the duplicate-key fix (one benign 404, consistent with this environment's no-API-keys-configured fallback behavior throughout the whole project).
- **5 commits**, each preceded by its own test run, none pushed.

## Beta readiness score: 6.5 / 10

Up from the reviewers' own **2/10**. Every finding they marked Critical that was independently confirmed still-live in code is now fixed, with regression tests proving it. The score isn't higher because: the confidence-score variance issue is real and unresolved (it affects every recommendation's core credibility number, not a cosmetic surface); nav complexity is unresolved; onboarding wasn't re-verified. The score isn't lower because every fix this sprint is proven — by a real test, by live browser verification, or both — not merely asserted.

## Recommendation

**Conditional GO for a small, closed beta (tens of users, not hundreds) with the confidence-variance issue disclosed internally as a known limitation**, not a silent gap. Do not open to 100 users until the confidence-score redesign is scoped and either fixed or the number's real meaning is honestly relabeled (e.g., a qualitative band rather than a false-precision integer) — presenting a narrow-banded number as if it carries the precision its digits imply is exactly the kind of "fake certainty" `TRUTH.md` forbids, and it is the one remaining issue in this report that touches the platform's central credibility claim rather than a specific screen's polish.
