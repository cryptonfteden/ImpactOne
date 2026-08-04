# UI Integration Architecture — Phase UI-INTEGRATION-001

## Goal

Connect existing platform intelligence (Claim Intelligence Layer, Options Agent,
Market Sentiment, Recommendation Engine, Portfolio Context, AI Analysis) into the
existing UI. No redesign, no new design system, no replaced screens — every
existing screen now consumes real intelligence instead of placeholders.

## Why a new HTTP surface was required

Every intelligence service touched in this phase (`claimIntelligence/*`,
`optionsAgentService`, `marketSentimentService`) was built in earlier phases as a
route-less, in-process service by explicit design. The frontend has no way to
reach a route-less backend service — so before any screen could be wired, a
small, additive HTTP surface had to exist. This phase added exactly that and
nothing else: no new business logic, no new computed fields, just an HTTP
door onto services that already existed.

New routes (all thin — controller calls the existing consumer service, no
computation in the route/controller layer):

- `backend/routes/claimsRoutes.js` → `backend/controllers/claimsController.js`
  → `claimIntelligence/claimConsumerService.js`
- `backend/routes/optionsAgentRoutes.js` → `backend/controllers/optionsAgentController.js`
  → `optionsAgentService.js`
- `backend/routes/marketSentimentRoutes.js` → `backend/controllers/marketSentimentController.js`
  → `marketSentimentService.js`

One small additive gap was found and closed the same way every other gap in
this phase was closed — by extending the real service, never faking data in
the UI: `claimConsumerService.getRecentlyInvalidatedClaims` (backed by a new
`claimRepository.listInvalidated`) was added because Mission Control's
"Recently invalidated Claims" requirement had no existing read path.

## Layering (unchanged, now fully connected)

```
Screen (React)
   │  presentation-only filter/sort, never computes intelligence
   ▼
services/api/*Api.js  (thin fetch wrappers, one per backend domain)
   │
   ▼
apiClient.js  (adds X-Beta-User-Id, base URL from VITE_API_BASE_URL)
   │
   ▼  HTTP
backend/routes/*Routes.js  (verb → controller mapping only)
   │
   ▼
backend/controllers/*Controller.js  (req/res only, shared handleKnownError)
   │
   ▼
backend/services/**/*ConsumerService.js  (the ONE place intelligence is composed)
   │
   ▼
backend/services/**/*Repository.js → Postgres (Prisma)
```

No screen in this phase computes intelligence. Every derived list in a
screen (e.g. Mission Control's "Top Active Claims", Watchlist's
"strengthening/weakening" grouping) is a plain client-side filter/sort over
one real fetch — commented at each call site as presentation-only.

## Screens touched

| Screen | New real data sources |
|---|---|
| Mission Control | `claimsApi` (active/invalidated), existing risk/opportunity feeds |
| Daily Feed (News) | `claimsApi` (active + invalidated), joined against each item's own `affectedAssets` |
| Portfolio Workspace | `claimsApi.listPortfolioRelevant` (replaces generic recommendations) |
| Watchlist | `claimsApi.listBySymbol`, `optionsAgentApi.getSymbolView` (per-symbol "why today") |
| StockSidePanel (Symbol Page) | `claimsApi.listBySymbol`, `optionsAgentApi.getSymbolView`, `marketSentimentApi.getOverview` |
| AI Analysis | `claimsApi.listBySymbol` → new "Claims-Based Analysis" section |

## Honesty guarantees carried through every screen

- No fabricated relationships: News's "Changed Claims" only ever states a
  causal verb (created/strengthened/weakened/invalidated) when a real Claim's
  symbols overlap the item's AND its `lastUpdatedAt` falls within a disclosed
  48-hour window of the item's `publishedAt`. Otherwise it discloses a
  same-symbol relation without claiming causation, or says
  "No active Claims affected."
- No unsupported AI conclusions: the AI Analysis Claims-Based section only
  ever reads real Claim contract fields (`statement`, `plainLanguageStatement`,
  `evidence`, `counterEvidence`, `probability`, `confidence`,
  `portfolioImpact`, `invalidationConditions`). Scenario preview is honestly
  disclosed as "not yet available" everywhere, since the Scenario Engine is
  architecture-only today.
- Every section has a real error/empty state — nothing renders a silent blank.
