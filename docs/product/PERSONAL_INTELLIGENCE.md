# Personal Intelligence Workspace

**Phase:** PERSONAL-INTELLIGENCE-001
**Purpose:** Transform ImpactOne from a market platform into a personalized investment intelligence platform — the first Workspace that filters and narrates real intelligence through the lens of the user's own real Investor Profile, real preferred sectors, and real watchlist, rather than presenting the same market view to everyone.

## What was built

`frontend/src/screens/PersonalIntelligenceWorkspaceScreen.jsx` answers every capability named in the mission using only real, already-persisted data — no new backend model, no fabricated personalization:

| Capability | Real source | How it's shown |
|---|---|---|
| Investor Profile model | `useInvestorProfile()` (existing hook — reused, not rebuilt) | `profile.riskTolerance`, `profile.investmentHorizon` badges |
| Risk profile | `profile.riskTolerance` (`LOW`/`MEDIUM`/`HIGH`, from the real `InvestorProfile` Prisma model) | "Risk Profile & Investment Horizon" card; also narrated in the hero's "As an investor with ___" sentence |
| Investment horizon | `profile.investmentHorizon` (`SHORT_TERM`/`MEDIUM_TERM`/`LONG_TERM`) | same card and hero sentence |
| Preferred sectors | `personalizationApi.get().preferredSectors` — real, derived server-side from the user's actual held positions' `Position.sector` (`personalizationService.js`'s `computePortfolioPreferences`), never a guessed mapping | "Preferred Sectors" card; used as the real filter for personalized opportunities/risks below |
| Watchlist priorities | `intelligenceApi.watchlistPriority({ watchlist })`, the user's own real watchlist (`useWatchlist()`) | "Watchlist Priorities" list, ranked via the shared `rankByScore` |
| Personalized AI reasoning / "Why this matters to YOU" | The single highest-confidence real Claim among the user's personally-relevant ones | Hero card, narrated against the user's own real risk tolerance + investment horizon |
| Personalized opportunities | Real active Claims (`claimsApi.listActive`) filtered to `expectedDirection === "BULLISH"` and personally relevant, ranked via `prioritizeClaims` | "Personalized Opportunities" — each rendered as an `IntelligenceCard` with a prepended "Why this matters to you" section plus the shared `buildClaimReasoningSections` |
| Personalized risks | Same filter, `BEARISH` | "Personalized Risks" |

"Personally relevant" is a real, disclosed, presentation-only predicate: a Claim counts as relevant when its own real `sectors` field overlaps the user's real preferred sectors, or its own real `symbols` field overlaps the user's real watchlist — never a fabricated relevance score, never a claim of causation.

## One new, thin API client — not new backend logic

`personalizationService.js`'s `getPersonalizationProfile(betaUserId)` (routed at `GET /api/v2/personalization`) already existed on the backend, already real, already tested — but had **no frontend consumer at all** before this phase (confirmed by a repo-wide search). `frontend/src/services/api/personalizationApi.js` is a two-line client (`get()` → `apiClient.get("/v2/personalization")`), the same one-call-per-route shape every other API client module in this codebase already follows. This is wiring, not new intelligence — the backend already computed everything it returns.

## Reuse discipline — the mission's explicit list, and nothing else

- **`intelligenceEngine`**: `prioritizeClaims` (ranks personalized opportunities/risks and picks the hero), `rankByScore` (ranks watchlist priorities), `buildClaimReasoningSections` (the six-question reasoning breakdown for every personalized Claim card).
- **Design System**: `HeroCard`, `IntelligenceCard`, `MetricArc`, `DemoModeBanner`, `EmptyState`, `Card`, `Badge` — every one already existed; none modified.
- **`PlatformContext`**: `selectClaim` — the hero Claim is contributed to shared platform selection, exactly like every other Workspace's hero-contribution pattern (Mission Control, Portfolio Workspace, News Intelligence, Watchlist Workspace, AI Analysis Workspace).
- **`requestCache`**: wraps the personalization fetch (`personalization:profile`), the active-Claims fetch (`claims:active:200`), and the per-watchlist watchlist-priority fetch (`intelligence:watchlist-priority:${watchlist.join(",")}`) — de-duplicating and reusing recently-fetched data exactly as every other integrated Workspace already does.
- **`claimPresentation`**: not directly imported by this screen (its own needs — evidence/reasoning narration — are fully covered by `intelligenceEngine`'s `buildClaimReasoningSections`, which already wraps the relevant `claimPresentation` concepts); available and would be reached for if a status-transition narrative were added here later.

**Explicitly NOT reused/duplicated:** the backend's own personalization *scoring* logic (`feedPersonalizationService.computeProfileWeight`, `personalIntelligenceService.rankByUserRelevance`) was deliberately left server-side and untouched — this screen's client-side relevance filter (sector/symbol overlap) is a simple, disclosed predicate, not a reimplementation of the backend's more elaborate weighting (age, investment goal, view counts, etc.). Duplicating that logic client-side would have been exactly the kind of drift risk the platform's `claimPresentation.js`/`intelligenceEngine.js` consolidations already exist to prevent.

## Honesty discipline

- **No investor profile yet** → an honest "Complete your investor profile to unlock personal intelligence" empty state. This is a real gating condition, not Demo Mode — the screen never fetches personalization/claims/watchlist data until `useInvestorProfile()` confirms a real profile exists, and `personalizationApi.get()` is never called in this case (verified by a dedicated test asserting the mock was never invoked).
- **Empty watchlist** → the "Watchlist Priorities" section shows an honest "Add a ticker..." empty state; `intelligenceApi.watchlistPriority()` is never called with an empty watchlist (the same discipline established in Watchlist Workspace — that endpoint falls back to the backend's hardcoded default symbols when no watchlist is sent, which must never be presented as the user's own).
- **No Claim currently touches the user's preferences** → honest, separate empty states for the hero, "Personalized Opportunities," and "Personalized Risks" — never Demo Mode, since this is a genuine empty result, not a fetch failure.
- **A real fetch failure** (personalization, Claims, or watchlist priority) → falls back to that section's own fallback data, `DemoModeBanner` discloses exactly which section(s), consistent with every other Workspace's per-section Demo Mode pattern.

## Tests

`frontend/src/screens/PersonalIntelligenceWorkspaceScreen.test.jsx` — 11 tests: loading skeleton; the no-profile honest gate (and confirming `personalizationApi.get` is never called in that case); real-claim filtering to only personally-relevant items (a real, irrelevant-sector claim is confirmed absent); real risk profile/investment horizon/preferred sectors rendering; real watchlist priorities rendering; Demo Mode fully hidden when everything is live; service-status logging; partial-outage fallback; the empty-watchlist honest state; the honest empty states when nothing real touches the user's preferences; and the `dir` attribute. Full suite: **566/566 passing** across 71 files (12 net new tests this phase, including the shared-module reuse — no new `intelligenceEngine`/`claimPresentation` tests were needed since no new logic was added to either).

## Verified live

Confirmed via Playwright against the real backend and a real (unauthenticated dev) session: the screen renders end-to-end with no crash; a real watchlist-priority row for NVDA rendered with its real explanation text; personalization gracefully fell back to Demo Mode (the dev session's beta identity wasn't set, so `/v2/personalization` genuinely 400'd) while the rest of the screen — risk profile, preferred sectors, watchlist priorities — stayed live; empty personalized-opportunities/risks sections showed their honest empty states rather than anything fabricated. `npm run build` re-verified to still succeed (RELEASE-BLOCKER-001's fix untouched by this phase).

## Known limitations

- Watchlist-priority requests are cached per exact watchlist string (`intelligence:watchlist-priority:${watchlist.join(",")}`), so adding/removing a single ticker creates a new cache key rather than invalidating the old one — harmless (stale entries simply expire after the existing 15-second TTL) but not actively pruned.
- `personalization:profile`'s cache key is not scoped per user — in a multi-account browser session (unusual for this beta) a stale cross-account personalization snapshot could theoretically be served for up to the TTL window. No other Workspace's cache keys are user-scoped either (they all key by symbol/claimId, which are naturally user-agnostic); this is the first cache key in the app that is not naturally user-agnostic, and worth flagging for a future phase rather than silently accepting.
- This screen surfaces "why a Claim is personally relevant" via a single sentence, not a graded relevance score — a deliberate scope decision (grading relevance would require new logic this phase's reuse-only constraint doesn't license), not an oversight.
