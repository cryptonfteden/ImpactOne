# Market Dashboard — Phase X7, Part 4

## What it is

`executiveDashboardService.getExecutiveDashboard(betaUserId)` — exactly six real, curated lists, per the mission's explicit "no information overload." Each list is a sort/filter over an already-real, already-tested source; nothing here recomputes a value that lives elsewhere.

| List | Real source | Sort |
|---|---|---|
| Highest-Conviction Opportunities | Active `Recommendation` rows with `action: "BUY"` | `qualityScore` desc |
| Highest Market Risks | Active `Recommendation` rows | `riskScore` desc |
| Largest Portfolio Impacts | Real open positions, `portfolioEngineService.getPortfolioSummary` | `abs(unrealizedPnl)` desc |
| Major Market Events | Real `CanonicalEvent` rows with a credibility score | `credibilityScore` desc |
| Largest Positioning Changes | **Honestly unavailable** | — |
| Highest AI Confidence | Active `Recommendation` rows | `confidenceScore` desc |

Each list is capped at 5 entries — the mission's "no information overload" enforced structurally, not just by convention.

## Two honest scoping decisions

**Largest Positioning Changes is unavailable, not estimated.** Market Positioning is computed fresh on every request (`marketPositioningService.js`) — no historical snapshot is persisted anywhere in this codebase, so there is no real "change" to rank. This is the same disclosed gap `decisionCenterService.js` (Phase X3) and `decisionTimelineService.js` (this phase) already report for the identical reason — one consistent gap, not three different excuses.

**"Major Market Events" is not filtered to macro topics specifically.** The mission asks for "Major macro events"; real `CanonicalEvent.category`/`eventType` data in this codebase today is too sparse and inconsistent across providers to reliably classify "macro" as a distinct category (confirmed by grep — most ingested events don't populate a consistent category taxonomy). Rather than build a fragile keyword-based macro classifier that would sometimes misclassify or silently drop real events, this list surfaces the highest-credibility recent events overall. Documented here as a real, named scope reduction — not silently narrowed without comment.

## Frontend

`ExecutiveDashboardScreen.jsx` (new, "Market Dashboard" — added to Sidebar's **Primary** tier, alongside Today/Decision Center/Portfolio/Workspaces, since this is a genuinely high-value executive view, not a rarely-used tool). Every symbol-linked entry opens the shared chart panel. The "Largest Positioning Changes" card always renders its honest unavailability message — never an empty list that looks like "zero changes happened," which would be a different (false) claim.

## Testing

- `executiveDashboardService.test.js` (2 tests): honest empty state with the one disclosed gap; real BUY-only filtering and real quality/risk/confidence sort ordering, confirmed against three seeded recommendations (a low-quality BUY, a high-quality BUY, and an EXIT correctly excluded from "opportunities" but correctly included in "risks"/"confidence").
- `executiveDashboard.integration.test.js` (1 test, real HTTP via supertest): the route returns all six real fields.
- `ExecutiveDashboardScreen.test.jsx` (4 tests): all six lists render real data, the positioning-changes disclosure always shows, honest empty states, and a friendly error state with a real working retry.
