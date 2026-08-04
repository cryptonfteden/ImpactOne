# Product-001 Implementation Report

## Summary

ImpactOne now answers "what should I look at first?" automatically, on
every screen, using two new canonical services built purely as
prioritization/aggregation logic over existing intelligence — no new AI
engines, no visual redesign, no removed functionality.

## What was built

**Backend (new, additive):**
- `backend/services/attentionEngine/attentionEngine.js` — deterministic
  0-100 Attention Score + explanation, with adapters for real Claims
  (`scoreClaimAttention`) and real feed items (`scoreFeedItemAttention`).
  13 unit tests, all passing.
- `backend/services/morningBrief/morningBriefService.js` — generates the
  daily 5-8 item brief by ranking real Claims + real portfolio changes
  through the Attention Engine. 6 tests, all passing.
- `claimConsumerService.getClaimsChangedOvernight` (+ repository support)
  — Mission Control's "Claims That Changed Overnight," a real filter over
  existing active/invalidated claim feeds.
- New route/controller: `GET /v2/morning-brief/today`.
- New route: `GET /v2/claims/overnight-changes`.
- `claimsController.js` — `getActiveClaims`, `getClaimsBySymbol`,
  `getPortfolioRelevantClaims`, `getOvernightChanges` now attach a real
  `attentionScore`/`attentionExplanation` to every claim (controller
  orchestrates two existing canonical services; computes nothing itself).
- `autonomousMarketController.getLiveFeed` — attaches
  `attentionScore`/`attentionExplanation`/`isHeld` to every Daily Feed item
  the same way.

**Frontend (additive, all 6 screens now reordered/relabeled per the
mission's "one primary question per screen" requirement):**
- New `morningBriefApi.js`; `claimsApi.listOvernightChanges` added.
- **Mission Control** — new above-the-fold block, in required order:
  Today's Brief, Top Risks, Top Opportunities, Portfolio Changes, Claims
  That Changed Overnight. Nothing else appears above it. (Top
  Risks/Opportunities reuse the existing claims fetch — removed from the
  secondary grid so nothing renders twice.)
- **Daily Feed** — every `FeedItemCard` now shows a real Attention Score,
  real affected holdings, and real portfolio relevance; falls back to
  "No meaningful impact detected." when none of those are real for an item.
- **Portfolio Workspace** — two new lead sections, "What Changed Since
  Yesterday" then "Why This Affects You" (Why → Evidence → Counter
  Evidence → Potential Scenarios per Claim); the old "AI Portfolio
  Recommendations" section (which showed recommendations first) was folded
  into this reordered flow.
- **Watchlist** — ranked by each symbol's real max Attention Score
  (aggregated across its Claims), replacing implicit price-movement-first
  ordering.
- **Symbol Page (StockSidePanel)** — new first section, "Why This Symbol
  Matters Today" (the top Claim's belief + real Attention Score and
  explanation); every existing section becomes supporting context beneath it.
- **AI Analysis** — Claims-Based Analysis section reordered to: Executive
  Summary, Why this matters, Evidence, Counter evidence, Portfolio impact,
  Possible outcomes, Confidence, Unknowns (reuses real `assumptions`),
  Things to monitor next (reuses real `invalidationConditions`).

## Honesty guarantees verified

- Attention Engine never fabricates a missing factor as 0 (renormalizes
  remaining weights instead) — unit-tested directly.
- Morning Brief never pads to reach 5 items — a quiet day is honestly
  shorter, tested directly (`isBelowTargetMinimum`).
- News's "no meaningful impact" state only fires when an item has no
  affected assets, isn't held, and overlaps no Claim — tested directly,
  distinguished from the pre-existing "No active Claims affected." state
  (which still requires real affected assets to be shown).
- No duplicated prioritization logic: feed items reuse their own real
  `importanceScore` as the `marketImpact` factor rather than recomputing a
  second importance number; Watchlist's per-symbol rank is a `max()`
  aggregation over already-real, already-scored Claims, not a new formula.

## Test results

- **Frontend**: `npx vitest run` — 57 test files, 414 tests, all passing.
- **Backend**: `npm run test:backend` — 1050 tests, 1049 passing, 1
  failing:
  - `intelligenceBusService.test.js:162` ("events from a different
    engine/symbol series are never superseded by an unrelated publish") —
    a pre-existing failure, unrelated to this phase. The `intelligenceBus/`
    directory was not touched by any PRODUCT-001 change (confirmed via
    untracked-file check); this same failure was already flagged as
    out-of-scope in the prior phase's implementation report. Not fixed
    here, since doing so is outside this mission's stated scope
    (prioritization/UX, not Intelligence Bus lifecycle logic).
  - Every new test this phase introduced (attentionEngine: 13, morning
    brief: 6, claims-changed-overnight: 1, route smoke tests: 3, live-feed
    attention smoke test: 1) passed.

## Deliberate scope boundaries

- No new AI engines — Attention Engine and Morning Brief are
  prioritization/aggregation only, over existing Claims/portfolio/feed data.
- No visual redesign — every screen kept its existing design system (NOVA
  on Mission Control/Portfolio, legacy classes on Watchlist/Symbol
  Page/AI Analysis); only section order and labels changed.
- No functionality removed — Portfolio's old recommendations content is
  now reachable via the reordered "Why This Affects You" section rather
  than deleted; AI Analysis's pre-existing OpenAI-backed "AI Report" and
  "Impact Intelligence Engine" sections are untouched.
- No commits, no push — none made.
