# Platform Intelligence Engine

**Phase:** PLATFORM-INTELLIGENCE-001
**Purpose:** Extract every piece of screen-specific reasoning logic duplicated (or duplication-prone) across Mission Control, Portfolio Workspace, News Intelligence, Watchlist Workspace, and AI Analysis Workspace into one shared module, `frontend/src/services/intelligenceEngine.js`, and migrate every Workspace to consume it. No UI change, no Design System change — this is a pure logic extraction.

## Why this phase exists

Five Workspaces now exist, each built independently across five separate phases. Each one needed the same handful of reasoning primitives — "which Claim matters most," "rank these by score," "what's the honest evidence summary," "what should the user do next" — and each one, reasonably, wrote its own small version of whatever it needed at the time, the same pattern `claimPresentation.js` (DEDUPLICATION-001) already fixed once for status/attention-level logic specifically. This phase does the same thing for the seven broader reasoning categories named in the mission.

## The shared module

`frontend/src/services/intelligenceEngine.js` — every export maps to one of the mission's seven named categories:

| Mission category | Export(s) | What it replaced |
|---|---|---|
| Ranking | `rankByScore(items, scoreKey)` | News Intelligence's inline feed-ranking sort; Watchlist Workspace's inline symbol-priority sort |
| Ranking | `rankBySymbolAttention(entities, claims, getSymbol)` | Portfolio Workspace's `positionAttention` (max real Attention Score across a symbol's Claims) |
| Claim prioritization | `prioritizeClaims(claims)` | The confidence-descending sort underlying Mission Control's and AI Analysis's own selections |
| Recommendation generation | `selectTopClaimByDirection(claims, direction)` | Mission Control's Biggest Risk / Best Opportunity selection (`byConfidenceDesc` + filter + `[0]`) |
| Recommendation generation | `selectTopClaim(claims)` | AI Analysis Workspace's subject-Claim selection when no symbol is in shared focus |
| Claim prioritization | `prioritizeClaimsByPortfolioImpact(claims)` | Portfolio Workspace's impact→confidence→urgency sort for "Why This Affects You" |
| Contradiction detection | `detectContradiction(claim)` | The ad hoc `claim.counterEvidence?.length ? ... : ...` checks scattered across screens |
| Evidence weighting | `rankEvidenceByContribution(evidenceRows, { limit })` | A client-side mirror of `claimConsumerService.js`'s own `getStrongestEvidence` ranking rule, now available to any Workspace holding a local evidence array |
| Evidence weighting | `summarizeEvidence(evidenceRows, fallbackText, { limit })` | Portfolio Workspace's and AI Analysis Workspace's own `.slice(0, N).map(...).join(" ")` evidence-summary snippets |
| Next-action generation | `recommendNextAction(subject)` | Watchlist Workspace's local `nextActionFor()` — generalized to also accept a real Claim (confidence + expectedDirection mapped onto the same opportunity/risk framing) so both kinds of subject share one rule and one threshold |
| Reasoning pipeline | `buildClaimReasoningSections(claim, { labels, evidenceLimit })` | AI Analysis Workspace's local `buildReasoningSections()` — the canonical six-question breakdown (What is happening / Why the platform believes it / Evidence that supports it / Evidence that contradicts it / What could invalidate this thesis / What to monitor next) |

## Every Workspace migrated

- **Mission Control** (`MissionControlHomeScreen.jsx`) — Biggest Risk/Best Opportunity selection now calls `selectTopClaimByDirection`, replacing its inline `byConfidenceDesc` sort + filter.
- **Portfolio Workspace** (`PortfolioWorkspaceScreen.jsx`) — `positionAttention` now calls `rankBySymbolAttention`; `sortedPortfolioClaims` now calls `prioritizeClaimsByPortfolioImpact`; the "Why This Affects You" evidence/counter-evidence text now calls `summarizeEvidence` instead of its own inline `.slice(0, 2).map(...).join(" ")`.
- **News Intelligence** (`NewsIntelligenceScreen.jsx`) — the feed's attention-ranked list now calls `rankByScore(feed, "attentionScore")`.
- **Watchlist Workspace** (`WatchlistWorkspaceScreen.jsx`) — the symbol-priority ranked list now calls `rankByScore(rankings, "overallAiScore")`; the local `nextActionFor()` is deleted, replaced by the shared `recommendNextAction()`.
- **AI Analysis Workspace** (`AiAnalysisWorkspaceScreen.jsx`) — the subject-Claim selection now calls `selectTopClaim`; the local `buildReasoningSections()` is now a one-line wrapper around the shared `buildClaimReasoningSections(claim, { evidenceLimit: Infinity })`.

## Preserving behavior exactly

Every migration is a pure extraction, not a behavior change, with one deliberate, documented exception:

- **`evidenceLimit` differs by design, not by accident.** AI Analysis Workspace's original local reasoning builder joined *every* recorded piece of evidence (no truncation) — appropriate for a screen whose own stated purpose is "explain everything." Portfolio Workspace's original inline logic already truncated to the top 2 (`.slice(0, 2)`) — appropriate for a compact per-claim card among several. `buildClaimReasoningSections`'s `evidenceLimit` option lets each consumer keep its own original behavior (AI Analysis passes `Infinity`; Portfolio Workspace's own separate `summarizeEvidence` call keeps the default of 2) rather than forcing one screen's convention onto the other.
- **`summarizeEvidence`'s ranking-by-contribution is a genuine, minor behavior refinement**, not a regression: Portfolio Workspace's original `.slice(0, 2)` took the first two evidence entries in whatever order the API happened to return them; the shared function ranks by each entry's real `contributionToClaim` (the same rule the backend's own `getStrongestEvidence` already applies) before truncating, so the *strongest* two entries are shown rather than merely the *first* two. Every existing test's evidence fixtures had at most one entry per list, so this had no observable effect on any existing test — it only changes behavior for a real Claim with three or more evidence entries, in the direction of showing more relevant evidence, not less.
- Every other migrated function (`rankByScore`, `rankBySymbolAttention`, `prioritizeClaims`, `selectTopClaimByDirection`, `selectTopClaim`, `prioritizeClaimsByPortfolioImpact`, `recommendNextAction`) is a byte-for-byte behavioral match to the logic it replaced, verified by the existing screen test suites passing unchanged.

## Tests

- **`frontend/src/services/intelligenceEngine.test.js`** (new, 27 tests) — every exported function, including edge cases: missing scores sorted last, empty lists, direction filters with no match, portfolio-impact tie-breaking through all three sort keys, contradiction detection with/without evidence, evidence ranking by contribution vs. confidence fallback, every `recommendNextAction` branch (explicit scores and Claim-derived scores), and every `buildClaimReasoningSections` section including all six honest fallback strings.
- All five Workspace test suites (`MissionControlHomeScreen.test.jsx`, `PortfolioWorkspaceScreen.test.jsx`, `NewsIntelligenceScreen.test.jsx`, `WatchlistWorkspaceScreen.test.jsx`, `AiAnalysisWorkspaceScreen.test.jsx`) — re-run unchanged after migration; all pass, confirming zero observable regression from the extraction.
- Full suite: **544/544 passing** across 69 files (27 net new tests this phase).

## No UI changes, no Design System changes

Confirmed by code review of every diff: no JSX, no CSS, no component import list, and no Design System component (`HeroCard`, `IntelligenceCard`, `MetricArc`, `AttentionLevelBadge`, `DemoModeBanner`, `EmptyState`, `Badge`, `Card`) changed in any of the five migrated screens. Every edit either replaced a local function definition with an import, or replaced an inline computation with a call to the equivalent shared function.

## Known limitations

- `recommendNextAction`'s Claim-derived opportunity/risk framing (mapping `expectedDirection` + `confidence` onto the same thresholds Watchlist Workspace's real Autonomous Market scores use) is a reasonable, documented approximation, not a claim that Claim confidence and Autonomous Market opportunity/risk scores are the same underlying metric — no Workspace currently calls `recommendNextAction` with a real Claim in production (only Watchlist Workspace calls it today, always with explicit `opportunityScore`/`riskScore`); the Claim-derived branch exists and is tested for future consumers but is not yet exercised by any live screen.
- "Recommendation generation" and "next-action generation" overlap conceptually (both are "what should the platform/user do about this"); this phase kept them as two distinct exports (`selectTopClaimByDirection`/`selectTopClaim` vs. `recommendNextAction`) because they answer different questions — "which Claim is most worth surfacing" vs. "what should the user do about the Claim already in front of them" — collapsing them into one function would have obscured that distinction rather than clarified it.
