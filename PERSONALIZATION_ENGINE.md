# Personalization Engine (Phase X10 — Part 2)

## What it is

Per-user preference models derived entirely from already-real data: the real `InvestorProfile`, real held `Position.sector`/`assetType`, real opened-recommendation action distribution, and Part 1's real explanation expand/collapse counts.

## Files

- `backend/services/personalizationService.js` — `getPersonalizationProfile(betaUserId)`.
- `backend/controllers/personalizationController.js`, `backend/routes/personalizationRoutes.js` — mounted at `GET /api/v2/personalization`.

## What's derived, and from what

| Preference | Source |
|---|---|
| Risk level, holding period | `InvestorProfile.riskTolerance` / `investmentHorizon` (reused, not re-derived) |
| Preferred sectors / market-cap exposure | Real held `Position.sector` / `assetType` |
| Preferred recommendation style | Real action distribution (BUY/REDUCE/EXIT) of recommendations the user actually opened |
| Preferred explanation depth | Real expand-vs-collapse ratio (Part 1) — DETAILED / STANDARD / BRIEF |
| Preferred chart usage | Real charts-opened count + average watch time (Part 1) |
| Preferred news sources | Honestly empty — no real per-source reading-preference signal exists yet (distinct from Part 4's source *quality* score) |

## Why no Home-summary rewrite

`homeSummaryService.buildHomeSummary` is not beta-user-scoped today (its existing "adaptive" card ordering runs off a global reading-depth signal, not a per-user one). Threading `betaUserId` through it to consume this engine would be a structural change to an existing, heavily-tested surface — out of scope under this phase's explicit "no redesign" constraint. The personalization profile is exposed as its own additive endpoint instead, ready for the frontend to consume without touching Home's existing behavior.

## Tests

`backend/services/personalizationService.test.js` — 5 tests: beta-user requirement, honest empty state, real investor-profile reuse, real sector/asset-type derivation from held positions, real explanation-depth derivation.
