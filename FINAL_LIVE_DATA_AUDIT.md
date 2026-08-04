# Final Live-Data & Trust Audit — LIVE-DATA-FINAL-001

**Scope:** Every visible number, score, confidence value, explanation, portfolio value, market value, agent output, loading/empty/error state, fallback, demo-data path, cached value, `localStorage` value, and hardcoded user-facing value — across Home, Mission Control, Flagship, 3D Workspace, Daily Feed, News Intelligence, Market Intelligence, Portfolio, Watchlist, AI Analysis, Recommendations, Alerts, Themes, Profile, and Settings.
**Method:** Live re-verification this session (not a re-read of old reports) plus direct source inspection of the two backend services that generate the explanation text these screens render. One deterministic, isolated defect was found, fixed, tested, and committed locally — see the commit message on `sprint-16-live-data` for the full technical account.
**Baseline:** `sprint-16-live-data`, HEAD before this session's commit was `1fd39fc`.

---

## Rule-by-Rule Findings

### "Missing data must never appear as zero."
**Status: Satisfied on every live-reachable screen.** Market Positioning explicitly renders "Market cap unavailable — real quote data could not be retrieved" rather than $0 or a blank cell when quote data can't be fetched. Portfolio Workspace's Rebalance Suggestions honestly states "aren't available yet... Nothing is shown here rather than a guess." Mission Control's "Biggest Risk"/"Best Opportunity" say "No bearish/bullish claims right now" rather than a $0/0% placeholder.
**One exception found, confined to dead code:** `DashboardHome.jsx` (`overallAiScore: ranking?.overallAiScore ?? row.aiScore ?? 0`) and `WatchlistScreen.jsx` (`claim.attentionScore ?? 0`) both fall back to a literal `0` for a missing score. Both files are the pre-Sprint-40/pre-X-series legacy screens, confirmed unreachable from the current `Sidebar.jsx` nav (kept only so their own tests keep passing, per the sidebar's own code comment). Not fixed this session — touching confirmed-dead screens for a rule that only matters if a real user can reach them was judged out of scope for an "isolated, deterministic, safe" fix; recorded in `UNSUPPORTED_VALUE_REGISTER.md` for visibility.

### "Unavailable confidence must never appear as 0%."
**Status: Satisfied.** A targeted search across every `.jsx` file for a confidence-related field defaulting to `0` via `??`/`||` found zero matches. Every confidence display observed live (Mission Control's Market Pulse ring, Flagship's Confidence Halo, Portfolio Workspace, Market Intelligence Workspace) either shows a real computed value or is absent entirely when the underlying claim/committee data doesn't exist — never a fabricated 0%.

### "Fallback data must be clearly disclosed."
**Status: Satisfied where fallback exists.** Personal Intelligence Workspace's "Demo data" banner is explicit and scoped correctly ("Your Preferences could not be loaded live right now... Everything else on this screen reflects real, live data" — not a blanket claim). Market Positioning's per-symbol "Unavailable this session: shortInterest, longInterest, float" disclosure is a real, itemized statement, not a generic error.

### "Demo data must never appear as real data."
**Status: Satisfied.** No screen was found presenting the demo/simulated Preferences data without its banner, and no other screen showed a "demo" value unlabeled.

### "Different events must not receive identical explanations unless the real evidence genuinely supports that result."
**Status: One real defect found and fixed this session.** See `TRUST_INTEGRITY_REPORT.md` for the full account: `historicalSimilarityService.js` and `propagationEngineService.js` used plain substring matching, letting "Shipping rates surge" (freight pricing) and "Semiconductor capacity constraint" falsely match the "rate"/"ai" keywords via substrings inside "rates" and "constraint" — producing identical, unsupported explanation text and identical 88%/propagation-chain claims for genuinely unrelated events. Fixed with word-boundary matching; genuinely-related events (two real Fed-policy headlines) correctly continue to share one real analog, which is not a defect.

### "Frontend calculations must not duplicate canonical backend calculations."
**Status: No new violation found.** No frontend component was found independently recomputing a confidence, score, or claim-status value that the backend already provides; every score/status display read a field directly from its API payload in every screen inspected this session.

### "Every visible claim must be traceable to a real endpoint or an explicitly disclosed fallback."
**Status: Satisfied, with the identity-gate caveat below.** Every number/explanation traced back to a real endpoint response or an explicit fallback/empty-state message. The one recurring exception: Decision Center, Watchlist Folders, and Decision Timeline show a raw "Couldn't load..." error banner directly above an unrelated "nothing to show" empty state for a Guest (no beta identity) session — the error is real and honestly surfaced, but its co-presentation with a contradictory empty-state message is a UX defect, not a fabrication (tracked in prior review reports, not re-fixed here since it is a presentation/layout issue, not a live-data-integrity one).

---

## Per-Screen Summary

| Screen | Numbers/scores traced to real source? | Fallback/empty states honest? | New finding this session |
|---|---|---|---|
| Home | Yes | Yes | Confirmed the now-fixed templated-text defect was present live before the fix (Fed rate hike / FOMC Rate Decision / Shipping rates surge all shared text) |
| Mission Control | Yes | Yes | None |
| Flagship | Yes | Yes | None (Confidence Halo reads real `cio.confidence`) |
| 3D Workspace | Yes | Yes | None |
| Daily Feed | Yes | Yes | Same templated-text defect, now fixed |
| News Intelligence | Yes | Yes | None |
| Market Intelligence | Yes | Yes | Same templated-text defect (appears in "Where Attention Is Flowing"), now fixed |
| Portfolio | Yes | Yes | None |
| Watchlist | Yes (Watchlist Workspace) / legacy `?? 0` fallback confined to unreachable `WatchlistScreen.jsx` | Yes | Dead-code `?? 0` fallback recorded, not fixed |
| AI Analysis | Yes | Yes | None |
| Recommendations | Yes | Yes | None |
| Alerts | Yes | Yes | Same templated-text defect, now fixed |
| Themes | Yes | N/A (static thesis catalog, disclosed as "Advisory only") | None |
| Profile | Yes | Yes | None |
| Settings | Yes | Yes (explicitly labels un-configurable settings as "current defaults for this beta") | None |

---

## What Was Fixed vs. What Was Only Documented

**Fixed this session (isolated, deterministic, tested, committed locally):** the word-boundary keyword-matching defect in `historicalSimilarityService.js`/`propagationEngineService.js`.

**Documented, not fixed (out of this session's "isolated + deterministic + safe" bar):** the legacy `?? 0` fallback in two confirmed-unreachable screens; the error-banner-above-empty-state co-presentation on 3 Guest-session screens (a layout/sequencing issue, not a data-integrity one); the pre-existing, disclosed limitation that Market Regime is a proxy rather than a dedicated indicator (already honestly disclosed in `worldState.js`/`WORLD_STATE_ENGINE.md` from `LIVING-WORLD-001`, re-confirmed still accurate and still disclosed, not a new finding).
