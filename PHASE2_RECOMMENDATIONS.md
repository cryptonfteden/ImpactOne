# Phase 2 Recommendations

**Phase:** PHASE-1-CERTIFICATION
**Purpose:** What should happen next, in order, building directly on the still-open items already tracked in [PLATFORM_TECH_DEBT.md](PLATFORM_TECH_DEBT.md), [ENGINEERING_FOUNDATION_ROADMAP.md](ENGINEERING_FOUNDATION_ROADMAP.md), and [PLATFORM_STANDARDIZATION_PLAN.md](PLATFORM_STANDARDIZATION_PLAN.md) — not a new invention of priorities, but the single, reconciled order those three documents' recommendations should actually be executed in, now that Phase 1's real status is certified.

---

## Priority 0 — Fix the production build (before anything else in Phase 2)

This is not part of Phase 2's feature work; it is the precondition for any of Phase 2's work ever reaching a user. Per [PRODUCTION_BUILD_FIX_PLAN.md](PRODUCTION_BUILD_FIX_PLAN.md): pin the build-critical dependencies (`vite`, `@vitejs/plugin-react`, `react`, `react-dom`) off `"latest"`, resolve the `lightningcss` minification failure (most likely by explicitly setting `build.cssMinify` in a new `vite.config.js`), and verify against a genuinely clean install. This should be the literal first thing Phase 2 does — not scheduled alongside other work, but gating it.

## Priority 1 — Stand up CI so this can never silently happen again

Immediately after Priority 0, per [ENGINEERING_FOUNDATION_ROADMAP.md](ENGINEERING_FOUNDATION_ROADMAP.md): a CI pipeline running `npm ci`, the full test suite, and `npm run build` on every push, required before merge. The build has now been independently reconfirmed broken across multiple separate certification passes in this engagement — the absence of an automated gate is the direct reason that was possible at all.

## Priority 2 — Close the remaining platform tech debt, in the order it was originally sequenced

The nine items in [PLATFORM_TECH_DEBT.md](PLATFORM_TECH_DEBT.md) — one (TD6, screen-local recommendation logic) is now resolved by `intelligenceEngine.js`. The remaining eight should be worked in this order, unchanged from that document's own reasoning:

1. **TD3 — add an automated architectural conformance check.** With the pattern now proven across five screens and a shared Intelligence Engine in place, this is the highest-leverage remaining item: a lint rule or test asserting new `screens/*Workspace*.jsx` files import from `components/nova`/`PlatformContext`/`requestCache`/`claimPresentation.js`/`intelligenceEngine.js`, not the older foundation. This converts five successful manual migrations into a durable guarantee.
2. **TD2 — tie `requestCache` keys to their actual query parameters**, so a future screen with different arguments can't silently share another screen's cached result under the same string key.
3. **TD5 — introduce a shared type/shape reference for the real Claim/Portfolio/Attention response contracts**, so the five (soon more) independent mock-data files can be checked against one source of truth instead of drifting independently.
4. **TD4 — decide and document `PlatformContext`'s scope boundary** (selection/navigation only; new shared domain-data caching gets its own module) before more shared-state needs accumulate.
5. **TD7 — plan for a "compare two things" extension to the selection model** before a feature actually needs it, given how central evidence/contradiction comparison already is to this platform's stated identity.
6. **TD8 — write the single "how to build the next Workspace screen" reference** `DESIGN_SYSTEM.md` is already informally serving as, formalized into an explicit, checkable guide.
7. **TD1 — decide and begin a migration plan for the ~10 remaining legacy screens.** This is the largest item by far and should be scoped as its own multi-step initiative, not a quick fix — but it should be *scoped* in Phase 2, even if execution spans further phases, since the gap between the two architectures only widens the longer it's deferred.
8. **TD9 — remove the now-fully-superseded legacy screens** (`WatchlistScreen.jsx`, the pre-Workspace `AiAnalysisScreen.jsx`) once their tests are ported or retired, closing out the dead weight these Workspace migrations left behind.

## Priority 3 — Close the platform consistency gap already identified and disclosed

Per [PRODUCT_STYLE_GAPS.md](PRODUCT_STYLE_GAPS.md) H2/[PLATFORM_DUPLICATION_AUDIT.md](PLATFORM_DUPLICATION_AUDIT.md): adopt `AttentionLevelBadge` in Portfolio Workspace's position-attention list, the one remaining place a categorical attention label is missing where its four sibling Workspaces already have it.

## Priority 4 — Decide the Market Intelligence integration question deliberately

Confirmed this session: `marketSentimentApi` is used by exactly one of five Workspaces. Before adding more screens or more Market Intelligence features, decide explicitly whether market-wide sentiment should become a platform-wide signal (surfaced consistently, the way Claims and Attention Score already are) or remain a Mission-Control-specific feature — and document that decision so the next screen's author doesn't have to guess.

## Priority 5 — Re-verify the AI Analysis Workspace's own "many scores" question on its own terms

[AI_ANALYSIS_REVIEW.md](AI_ANALYSIS_REVIEW.md)'s finding about seven unranked confidence-like sections was made against the pre-Workspace `AiAnalysisScreen.jsx`. The new `AiAnalysisWorkspaceScreen.jsx`'s tighter, single-Claim-focused structure likely improves this materially, but that has not yet been independently confirmed as its own dedicated review — worth a focused, fast re-check rather than assuming the architecture migration automatically fixed a UX-level finding it wasn't specifically aimed at.

---

## What Phase 2 should explicitly not do

- Add a sixth Workspace screen before Priority 0/1 are done — a sixth screen built on a foundation that can't currently produce a working build only adds to what's blocked, not what's shippable.
- Treat the remaining tech-debt items as equally urgent — they are explicitly sequenced above by how much they compound if left unaddressed while more screens are added, not by how quickly each could be fixed.
- Assume any finding in this document or its predecessors is resolved without independently re-verifying it first, consistent with the discipline that has governed every phase of this engagement so far.
