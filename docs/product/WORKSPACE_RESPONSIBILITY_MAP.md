# Workspace Responsibility Map — Phase PLATFORM-ARCH-001

**Status:** Architecture only. This document defines the intended, non-overlapping responsibility of four real (three built, one future) surfaces, to prevent the duplication pattern already flagged in `PRODUCT_ARCHITECTURE_AUDIT.md` §4 from getting worse as more capabilities (Options Agent, Attention Arbitration, the Capability Registry) come online.

## The problem being solved

Three NOVA-built "workspace" screens exist today with no stated relationship to each other:

- **Mission Control** (`MissionControlHomeScreen.jsx`) — "Everything that needs you, in one view."
- **Intelligence Workspace** (`IntelligenceWorkspaceScreen.jsx`) — "An AI intelligence desk for global markets."
- **Portfolio Workspace** (`PortfolioWorkspaceScreen.jsx`) — "The AI operating center for your holdings."

Each independently pulls from overlapping data (home summary / intelligence overview / portfolio summary), each has its own KPI-strip-plus-sections composition, and nothing prevents a fourth similarly-shaped screen from being added the same way next. A "Future Stock Workspace" (today's `StockSidePanel.jsx`, a per-symbol drill-down) is the natural fourth member of this family and must be scoped deliberately from day one, not retrofitted later.

## The organizing principle

**One axis of specificity, four stops on it, never two surfaces answering the same question at the same altitude.**

```
Mission Control          — "What, across everything, needs me right now?"
Intelligence Workspace   — "What is the market/world doing, independent of what I hold?"
Portfolio Workspace      — "How is what I actually hold doing, and what should I do about it?"
Future Stock Workspace   — "Everything about this one specific symbol."
```

Each stop is strictly narrower in scope than the one before it. No two stops should ever independently compute the same fact — a fact belongs to exactly one workspace's ownership, and every other workspace either omits it or links to where it lives.

## Mission Control — the daily entry point

**Owns:** a cross-cutting summary assembled from the Attention Arbitration service (`PLATFORM_CAPABILITY_ARCHITECTURE.md` §4) — the single highest-priority item across *all* categories (holding, news, options, earnings, macro), a compact KPI strip, and links out to whichever workspace owns the detail.

**Does not own:** any category-specific deep content. If the day's #1 attention item is a macro event, Mission Control shows the headline and links to Intelligence Workspace for the full picture — it never duplicates Intelligence Workspace's own detailed macro section.

**Consumes:** the Attention Arbitration ranking (top N items only, across all categories), `heldPositionResolver` (for its own "action needed" tile), the Capability Registry (to know which categories are even live enough to summarize).

**Never duplicates:** Intelligence Workspace's per-theme detail, Portfolio Workspace's concentration/HHI math, or a Stock Workspace's full per-symbol view. Mission Control's Recommendation/Portfolio-Risk sections should become thin links into Portfolio Workspace's owned sections, not parallel re-implementations of them.

## Intelligence Workspace — the market desk

**Owns:** everything about the state of the market/world that is *not* conditioned on what the user holds — global themes, macro regime, news severity/evidence/counterarguments, sentiment (once real), and options-market-wide anomalies (not specifically on held symbols).

**Does not own:** anything phrased as "your portfolio." Intelligence Workspace answers questions about the world; it is legitimate for it to *note* that a theme affects a held sector (a link, not a computation), but the actual portfolio-relevance math (weight%, net P&L) belongs to Portfolio Workspace alone.

**Consumes:** `intelligenceApi.overview()` (existing, unchanged), the Capability Registry (Macro/Sentiment/Options-market-wide entries), Attention Arbitration filtered to `news`/`macro`/`sentiment`/`options` categories.

**Never duplicates:** Portfolio Workspace's Concentration/Diversification/Cash Allocation sections, or Mission Control's cross-category daily summary.

## Portfolio Workspace — the holdings operating center

**Owns:** everything conditioned on the user's actual real positions — health, risk map, concentration/diversification (with disclosed methodology), sector allocation, winners/losers, held-position AI recommendations, cash allocation, and (once real) rebalance suggestions.

**Does not own:** general market narrative unrelated to a held position, or per-symbol deep-dive detail beyond what's needed to explain a position's status (that belongs to the Stock Workspace).

**Consumes:** `portfolioEngineApi` (unchanged), `heldPositionResolver` (§1 of `PLATFORM_CAPABILITY_ARCHITECTURE.md` — replacing the screen's own broken `heldPosition` filter), Attention Arbitration filtered to `holding`/`risk` categories.

**Never duplicates:** Intelligence Workspace's macro/theme detail, or Mission Control's cross-category ranking (Portfolio Workspace's own "AI Portfolio Recommendations" section is a *filtered view* of the same canonical recommendation data Mission Control and Intelligence Workspace also touch — the filter, not the underlying data or scoring, is what makes it this workspace's own).

## Future Stock Workspace — the per-symbol page

**Owns:** everything about one specific symbol, composed once via `symbolIntelligenceService.js`'s existing composition point (already the correct architecture — this is what `StockSidePanel.jsx` should graduate into as a full page, not a redesign): quote, chart, AI summary/recommendation, portfolio impact (via `heldPositionResolver`), opportunity score, market positioning, options-agent signals for this specific symbol (once reachable), and news specific to this symbol.

**Does not own:** cross-symbol ranking, portfolio-wide aggregation, or market-wide narrative — every one of those belongs to one of the three workspaces above, and the Stock Workspace links up to them rather than re-summarizing them.

**Consumes:** `symbolIntelligenceService.getSymbolIntelligence(symbol)` (already the correct, existing composition layer — extend it, don't replace it), `heldPositionResolver` for the single symbol in view, the Capability Registry (to know which per-symbol sections — Options, Sentiment, Ownership — are honestly available today).

**Never duplicates:** any of the three broader workspaces' own aggregate views — it is strictly the "zoom all the way in" stop on the specificity axis.

## Cross-workspace rules (apply to all four)

1. **A fact is owned by exactly one workspace.** If two workspaces currently compute the same number (e.g., "held-position weight%"), one of them must be refactored to consume the other's (or a shared service's) computation, not independently recompute it — the direct fix for the Portfolio Workspace bug that motivated this document.
2. **Narrower workspaces link up, wider workspaces link down** — Mission Control links into Intelligence/Portfolio/Stock workspaces for detail; a Stock Workspace links up to Portfolio Workspace for portfolio-level context; no workspace embeds another workspace's full section inline.
3. **Every workspace's data comes from the Attention Arbitration service or a named canonical service (`heldPositionResolver`, `symbolIntelligenceService`, the Capability Registry)** — never a bespoke, screen-local re-derivation of a concept already owned elsewhere.
4. **No fifth workspace is added to this map without an explicit decision about which existing stop it narrows or replaces** — this document exists specifically so the next screen doesn't get built the same undirected way the first three were.
