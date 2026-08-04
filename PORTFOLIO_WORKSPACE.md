# Portfolio Intelligence Workspace

Phase X12C.3. `frontend/src/screens/PortfolioWorkspaceScreen.jsx`, reachable from Sidebar → More tools → "Portfolio Workspace" (`screenMap["Portfolio Workspace"]`).

## What it is

An AI operating center for holdings — not a portfolio table. Every section answers a question ("how healthy is this portfolio," "where is it concentrated," "what does the AI think about what I hold") rather than just listing rows. It reads the same portfolio-engine data `PortfolioEngineScreen.jsx` already reads (`portfolioEngineApi`), left completely untouched, plus portfolio-scoped recommendations (`recommendationsApi`).

## Data sources (all pre-existing, no new backend endpoint)

| Source | Used for |
|---|---|
| `portfolioEngineApi.getSummary()` | Health, Risk Map, Concentration, Diversification, Sector Allocation, Winners, Losers, Cash Allocation |
| `portfolioEngineApi.getPerformanceDelta()` | Portfolio Health's honest day-over-day comparison |
| `recommendationsApi.list()` | AI Portfolio Recommendations, filtered to items carrying a real `portfolioContext` |

`getSummary()`'s real shape (`backend/services/portfolioEngineService.js`): `cashBalance, startingCapital, positionsValue, totalValue, realizedPnl, unrealizedPnl, dailyPnl, dailyPnlPct, totalReturn, totalReturnPct, positions[], allocation: { bySector[{name,value,pct}], byAssetType[...] }`. Each position: `id, symbol, sector, assetType, quantity, avgEntryPrice, currentPrice, marketValue, unrealizedPnl, unrealizedPnlPct, dailyPnl, dayChangePercent, openedAt`.

## Required sections → real field mapping

1. **Portfolio Health** — `totalValue`, `totalReturnPct`, `dailyPnl`, `cashBalance` as KPI tiles; `getPerformanceDelta().summary` for a real day-over-day comparison sentence, or an honest "no prior snapshot yet" message on day one (`hasComparison: false`) — never a fabricated comparison.
2. **Portfolio Risk Map** — per real sector (`allocation.bySector`), shows that sector's real weight (`pct`) plus the real net unrealized P&L summed from that sector's actual positions (client-side sum of real `unrealizedPnl` values, not a modeled risk score — there is no risk score anywhere in `portfolioEngineService`).
3. **Concentration Analysis** — computed with standard, transparent arithmetic directly over real data: per-position weight = real `marketValue` ÷ real `totalValue`; Top-1/Top-3/Top-5 = sum of the largest weights; HHI = sum of squared weights × 10,000 (the standard Herfindahl-Hirschman formula). No backend concentration field exists tied to the real DB-backed portfolio (`portfolioIntelligenceService.js`'s `sectorConcentration`/`riskConcentration` operate on a synthetic/what-if `holdings` argument supplied by callers like `dailyBriefService.js`, not the real positions table — reusing it would present synthetic data as the user's real portfolio). The methodology is stated in-screen (`portfolioWorkspace.concentration.methodology`) so it's never mistaken for a modeled score.
4. **Diversification Score** — no single "diversification score" field exists anywhere in the backend, so none is invented. Instead this section shows real, honest facts: holding count, distinct sector count, and largest position weight (reusing Concentration's real Top-1 figure) — explicitly labeled as real counts, not a synthesized 0-100 score (`portfolioWorkspace.diversification.methodology`).
5. **Sector Allocation** — `allocation.bySector` rendered directly in a NOVA `Table` (name/value/weight) — a real, already-computed field, no transformation needed.
6. **Biggest Winners** — real positions with `unrealizedPnl > 0`, sorted by real `unrealizedPnlPct` descending, top 5.
7. **Biggest Losers** — real positions with `unrealizedPnl < 0`, sorted by real `unrealizedPnlPct` ascending (most negative first), top 5.
8. **AI Portfolio Recommendations** — `recommendationsApi.list()` filtered to `rec.portfolioContext` (the actual persisted `Recommendation.portfolioContext` field, non-null only for held positions — `heldPosition` is an internal `autonomousRecommendationEngine.js` variable name that is never serialized onto the API response; fixed in Phase X12C.3.1 after this was originally, incorrectly documented and coded against `rec.heldPosition`), showing real `action`, `qualityScore` (via `ConfidenceBadge`), and `thesis`/`reasoning`.
9. **Rebalance Suggestions** — **no rebalance concept exists anywhere in the backend** (grep-confirmed: zero matches for "rebalance" across `backend/`). This section always shows an honest "not available" `EmptyState` rather than a fabricated suggestion — the single clearest application of "never fabricate metrics" in this phase.
10. **Cash Allocation** — real `cashBalance`, plus `cashBalance ÷ totalValue × 100` (real arithmetic on two real fields) as the cash weight percentage.

## No fabricated metrics — summary of judgment calls

| Concept requested | Real backend field? | What the screen does |
|---|---|---|
| Total value, P&L, cash | Yes (`portfolioEngineService.js`) | Displayed directly |
| Sector allocation | Yes (`allocation.bySector`) | Displayed directly |
| Winners/losers | No pre-sorted field, but every input (`unrealizedPnl`, `unrealizedPnlPct`) is real | Sorted client-side — not fabrication, just ordering real numbers |
| Concentration (top-N weight, HHI) | No dedicated field on the real portfolio | Computed with a named, standard formula over real `marketValue`/`totalValue`, methodology disclosed in-screen |
| Diversification score | No field anywhere | Real counts shown instead of a synthesized single score; explicitly not framed as a score |
| Portfolio risk score | No field anywhere | Not shown as a single score; Risk Map shows real per-sector weight + real net unrealized P&L instead |
| Rebalance suggestions | No concept anywhere in backend | Honest "not available" state, always |
| Day-over-day comparison | Yes (`getPerformanceDelta()`, `hasComparison` flag) | Shown only when `hasComparison: true`; honest message otherwise |

## Responsive / RTL / Accessibility / Tokens

- Layout: NOVA `Grid`/`Stack`/`Container`/`Page` primitives only (12/8/4-column breakpoints, unchanged from X12B/X12C.1/X12C.2).
- RTL: root `Page` receives `dir` live from `useI18n()`; all spacing via logical-property NOVA primitives; no physical left/right property introduced.
- Accessibility: every section is `<section aria-label="...">` (ARIA region); Sector Allocation is a real `<table>`; loading state sets `aria-busy="true"`.
- Tokens: exclusively NOVA typography classes (`nova-heading-eyebrow`, `nova-heading-h1`, `nova-heading-subtext`, `nova-text-sm`, `nova-text-xs`, `nova-text-lg`) and NOVA components (`Card`, `Badge`, `ConfidenceBadge`, `Table`, `EmptyState`, `Skeleton`, `Alert`). Zero legacy classes (`.company-description`, `.eyebrow`, `.ghost-button`, `.pill`) — enforced by an automated test.

## What was intentionally left out

- No rebalance-suggestion logic was invented to fill section 9 — the mission's own "never fabricate metrics" rule is unambiguous here, and no such concept exists in this codebase yet.
- Did not reuse `portfolioIntelligenceService`'s `sectorConcentration`/`riskConcentration` for Concentration Analysis, since that service computes over an arbitrary/synthetic `holdings` argument supplied by unrelated callers (daily brief, what-if scenarios) — not the real DB-backed portfolio this screen is about. Using it would have silently mixed synthetic data into a screen about the user's real holdings.
- Did not build a single "diversification score" or "risk score" — no such number exists in the backend, and inventing one would violate the mission's explicit rule.
