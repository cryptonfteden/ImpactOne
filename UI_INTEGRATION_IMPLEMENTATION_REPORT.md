# UI Integration Implementation Report — Phase UI-INTEGRATION-001

## Summary

Every existing screen listed in the mission now consumes real intelligence
from the Claim Intelligence Layer, Options Agent, and Market Sentiment
services instead of placeholders or generic recommendations. No screen was
redesigned, no new design system was introduced, and no screen was replaced —
all changes are additive within each screen's existing layout and styling
convention (NOVA components on Mission Control/Portfolio, legacy classes on
Watchlist/StockSidePanel/AI Analysis, per each screen's pre-existing
convention).

## What was built

**Backend (additive only):**
- 3 new route files + 3 new controller files exposing the previously
  route-less Claim Intelligence Layer, Options Agent, and Market Sentiment
  services over HTTP (`/v2/claims/*`, `/v2/options-agent/*`,
  `/v2/market-sentiment/*`).
- 1 new repository function (`claimRepository.listInvalidated`) and 1 new
  consumer-service function (`claimConsumerService.getRecentlyInvalidatedClaims`),
  added because no existing read path covered Mission Control's "Recently
  invalidated Claims" requirement.
- 7 new backend route-integration smoke tests
  (`backend/routes/uiIntegration.integration.test.js`).
- 1 new unit test for `getRecentlyInvalidatedClaims`.

**Frontend (additive only):**
- 3 new api service modules: `claimsApi.js`, `optionsAgentApi.js`,
  `marketSentimentApi.js`.
- Mission Control: 7 new claims-derived sections (Top Active, Highest
  Confidence, Gaining/Losing Confidence, Recently Invalidated, Top Market
  Risks, Top Opportunities), each card showing title/confidence/probability/
  why/affected assets/portfolio impact/last updated.
- Daily Feed: every `FeedItemCard` now shows a "Changed Claims" line, derived
  from real symbol overlap + a disclosed 48-hour recent-transition window —
  never a fabricated causal claim.
- Portfolio Workspace: the recommendations section was replaced with real
  portfolio-relevant Claims, sorted by portfolio impact / confidence /
  urgency, each showing supporting/counter evidence.
- Watchlist: each symbol now shows a real "why today" reason (new/
  strengthening/weakening claim, unusual options activity) or an honest
  "Nothing new today."
- StockSidePanel (Symbol Page): 10 new sections forming the canonical
  intelligence view — Current Platform View, Active Claims, Supporting/
  Counter Evidence, Market Sentiment, Options Signals, Portfolio Relevance,
  Historical Claim Timeline, Resolved Claims, Scenario Preview.
- AI Analysis: a new "Claims-Based Analysis" tab/section generating the
  required structure (Summary, Current belief, Why, Evidence, Counter
  evidence, Probability, Confidence, Portfolio impact, Possible scenarios,
  What would invalidate this view) entirely from the real Claim contract —
  kept separate from the pre-existing OpenAI-backed "AI Report" section,
  which is a different, already-existing feature this mission didn't ask to
  remove.

## Honesty guarantees verified

- Every new section has a real, tested empty state (e.g. "No active claim
  exists for this symbol right now.", "No active Claims affected.", "No real
  supporting evidence recorded yet.") and a real, tested error state that
  never blocks the rest of the screen.
- News's Changed Claims wording only uses a causal verb
  (created/strengthened/weakened/invalidated) when both a real symbol overlap
  and a real recent status transition are present; otherwise it discloses a
  same-symbol relation without claiming causation.
- The AI Analysis Claims-Based section never renders a field that isn't a
  real Claim contract field; Possible Scenarios is honestly disclosed as
  "not yet available" everywhere in this phase, consistent with earlier
  phases marking the Scenario Engine as architecture-only.
- No screen computes intelligence: every derived list/sort in every touched
  screen is commented at the call site as presentation-only filtering/sorting
  over one real fetch.

## Test results

- **Frontend**: `npx vitest run` — 57 test files, 400 tests, all passing
  (including 2 brand-new test files: `WatchlistScreen.test.jsx` did not exist
  before this phase and was created; `StockSidePanel.test.jsx` already existed
  and was extended with a new describe block).
- **Backend**: `npm run test:backend` (`node --test` across
  `backend/**/*.test.js`) — 1026 tests. First full run: 1024 passed, 2 failed:
  - `uiIntegration.integration.test.js` — the new
    "market-sentiment/overview returns the canonical shape" test hit its
    20s timeout only under full-suite serial contention (1000+ preceding
    tests on the same DB connection); it passes in 1.8s standalone. Fixed by
    raising the timeout to 60s — re-verified passing (7/7 in that file).
  - `intelligenceBusService.test.js` — a pre-existing test unrelated to this
    phase (`intelligenceBus/`, untracked in git prior to this phase, not
    touched by any UI-INTEGRATION-001 change) failed on an EXPIRED-vs-ACTIVE
    lifecycle assertion. Out of scope for this mission; flagged here rather
    than silently ignored.

## Deliberate scope boundaries (per mission's explicit constraints)

- No commits, no push — none made.
- No redesign, no new design language — NOVA stayed on NOVA screens, legacy
  classes stayed on legacy screens.
- No screen replaced — Mission Control, Portfolio, Watchlist, Symbol Page,
  News, and AI Analysis are the same screens, extended in place.
- The pre-existing OpenAI-backed "AI Report" and "Impact Intelligence Engine"
  sections on the AI Analysis screen were left untouched — the mission asked
  to generate a Claims-driven report, not to remove an already-existing,
  differently-sourced report.
