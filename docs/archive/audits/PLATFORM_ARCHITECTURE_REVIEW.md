# Platform Architecture Review

**Phase:** PLATFORM-ARCHITECTURE-REVIEW-001
**Scope:** The platform as it stands after five Workspace screens now share one architecture — Mission Control, Portfolio Workspace, News Intelligence, Watchlist Workspace, and AI Analysis Workspace — plus the three pieces of shared infrastructure that make that possible: `PlatformContext`, the Design System (`components/nova`), and what this review calls Shared Intelligence (`utils/claimPresentation.js` and the consistent Claim-contract consumption pattern behind it). No code was changed to produce this review.

**Headline context:** this is the first architecture review in this engagement's history where the answer to "is the platform architecturally consistent" is genuinely *yes*, for a meaningful and growing majority of the product. Confirmed directly: all five Workspace screens import from the same three shared modules, none reimplements a component or a piece of claim-presentation logic the others already have, and the newest two screens (Watchlist Workspace, AI Analysis Workspace) were built explicitly and correctly on the pattern established by the first three — verified via their own import statements, not just their code comments. This review's job is to look past that real success to the architectural risks that a five-screen, still-growing platform now carries.

---

## Mission Control, Portfolio, News Intelligence, Watchlist, AI Analysis

Reviewed together because they are, today, one architecture wearing five different domain skins. Each screen:
- Renders through the same three-tier layout convention (`mc-tier-1/2/3`), with exactly one `HeroCard` per screen.
- Sources its claim-derived confidence, probability, and attention displays through `MetricArc` and `AttentionLevelBadge` — never ad-hoc text.
- Discloses partial or full fallback-to-demo-data through the same `DemoModeBanner`, computed per-section, never as a single global flag.
- Reads and writes shared cross-screen focus (`selectedClaim`/`selectedSymbol`) through `PlatformContext`, rather than a screen-local mechanism.
- Shares real claim-status and attention-level logic through `claimPresentation.js`.

The two newest screens go further than simple pattern-following: **AI Analysis Workspace explicitly reads `PlatformContext`'s `selectedSymbol`** to decide which real Claim to analyze when the user arrives from another screen — the cross-screen continuity this architecture was built for is not just present, it is functioning as the reason a fifth screen was easy to build at all. This is a genuine architectural payoff, not just an aspiration stated in a comment.

One important scope note, carried forward from the Watchlist and AI Analysis reviews: this architecture governs five screens, not the whole platform. Roughly ten other screens (Recommendations, Daily Feed, Alerts, Themes, Global Intelligence, Intelligence Console/Workspace, Decision Timeline, Market Positioning, and the legacy Watchlist/AI Analysis screens each new Workspace replaced) remain on the older `components/ui`/`SectionCard` foundation, with no PlatformContext, requestCache, or Design System involvement. The platform is not yet architecturally unified — it is two coexisting architectures, one of which is now mature and one of which is untouched. See "Future maintenance risks" below.

## Shared PlatformContext

`PlatformContext` is a single React context providing: `selectedClaim`/`selectClaim`, `selectedSymbol`/`selectSymbol`, `portfolioContext`/`loadPortfolioContext` (a cached portfolio summary), and `navigateTo` (screen navigation that can carry a selection forward). Architecturally, this is a deliberately small "shared kernel" — the minimum state genuinely needed by more than one screen, not a general-purpose global store.

One cohesion note worth flagging, not as a defect but as a decision to watch: this one context currently holds two conceptually different kinds of state — *cross-screen selection/navigation* and *a cached domain-data fetch* (the portfolio summary). Today that's a reasonable, small combination. As more shared data needs accumulate (and they will, as more screens join this architecture), there's a real risk this context becomes the default place to put "anything shared," which would dilute its current, clear purpose. This is the single most important thing to watch as this architecture scales past five screens.

## Design System

`components/nova`'s export surface (`Button`, `Badge`/`confidenceBand`/`ConfidenceBadge`, `MetricArc`, `Card`, `HeroCard`, `DemoModeBanner`, `IntelligenceCard`/`directionTone`, `AttentionLevelBadge`/`attentionLevelTone`, plus the pre-existing `Ai*`, `DataViz`, `Navigation`, `Notifications`, and `Loading` primitives) is genuinely cohesive — every export does one clear visual job, and the newer additions (`HeroCard`, `DemoModeBanner`, `IntelligenceCard`, `AttentionLevelBadge`) were extracted from real, duplicated screen code rather than designed speculatively, which is why they fit their actual usage so cleanly. This is a real strength: a design system built by extraction from working code, verified against real call sites, rather than designed in the abstract and then forced onto screens afterward.

## Shared Intelligence (`claimPresentation.js` and the Claim-consumption pattern)

`claimPresentation.js`'s four exports (`statusTone`, `statusPlainLabel`, `attentionLevel`, `computeChangedClaimsText`) are the platform's one shared vocabulary for presenting a Claim's status and attention level, and — as verified in the prior duplication-verification phase — every consumer (Mission Control, News Intelligence, Watchlist Workspace, `FeedItemCard.jsx`) now imports from this single source. This is real, working shared intelligence at the presentation layer.

What is *not* yet centralized: each screen still independently decides how to turn a Claim's real, already-computed scores into a domain-specific recommendation of its own — Watchlist Workspace's `nextActionFor()` (risk/opportunity score thresholds → "Review risk exposure" / "Consider building or adding" / "No action needed") is a clean, honest, presentation-only rule, but it lives in that one screen file, not in a shared module. This is the same category of logic (`recommendedAttentionLevel`/`attentionLevelForScore`) that was independently reinvented twice before this platform's own deduplication phase caught it. It hasn't happened again yet — but the underlying pattern that caused it once (a new screen writing its own small threshold-based classifier rather than reaching for a shared one) is still how this kind of logic gets written today.

---

## Architectural consistency

High, and improving with each new screen, for the five-screen Workspace architecture. Zero for the remainder of the platform. The relevant risk is not "is the new architecture consistent" (it is) but "how long can two architectures coexist before the older one becomes actively harmful to maintain" — addressed under Future maintenance risks.

## Scalability

See [PLATFORM_SCALABILITY_REPORT.md](PLATFORM_SCALABILITY_REPORT.md) for the full treatment. In summary: the shared foundation (Design System, `requestCache`, `claimPresentation.js`) scales well to more screens joining the same pattern. The specific mechanics of `requestCache`'s string-keyed cache and the per-screen mock-data-shape duplication scale less gracefully, and are the two concrete technical risks most likely to cause a real bug as more screens and more query variations are added.

## Coupling

Deliberately centralized, not entangled: no Workspace screen imports another Workspace screen directly. All five instead couple to the same three shared modules (`components/nova`, `PlatformContext`, `claimPresentation.js`) plus the thin `services/api/*` client layer. This is the correct shape of coupling for this kind of platform — a shared kernel with independent leaves — and it's what makes five screens currently maintainable by a small, consistent set of rules. The cost of this shape is that `PlatformContext` and `claimPresentation.js` are now genuine single points of impact: a breaking change to either requires reviewing all five (soon more) consumers. That's an acceptable, standard cost of this architecture, not a flaw in it — but it means changes to those two files should get proportionally more scrutiny than a change to any one screen.

## Cohesion

High within each shared module individually (Design System, `claimPresentation.js`); moderate within `PlatformContext`, which already mixes two kinds of shared state as described above. Within each Workspace screen, cohesion is good — each screen's file is organized around one real domain question (Mission Control: "what needs me today," Watchlist: "which of my symbols needs attention," AI Analysis: "why does the platform believe this"), with local business logic (like `nextActionFor()`) scoped tightly to that one screen's own presentation need.

## Business-logic ownership

The clearest, most improved area of this platform relative to its own history. Claim-presentation logic has exactly one, correctly-identified owner (`claimPresentation.js`). Domain scoring itself (Attention Score, Confidence, Probability, opportunity/risk scores) correctly stays owned by the backend — every screen reviewed treats these as already-computed, real values, never recomputing or approximating them client-side. The remaining ownership question is the smaller-grained "how do we phrase a recommendation from an already-real score" logic (`nextActionFor()` and similar), which currently has no designated home beyond "whichever screen needed it first."

## Extension points

Concretely proven three times now (Portfolio Workspace, then Watchlist Workspace and AI Analysis Workspace built on the same foundation) — this is a real, working extension point, not just a stated intention. What's missing is a single, explicit "how to build the sixth Workspace screen" reference: the pattern currently has to be learned by reading four sibling screens' source rather than following one written checklist. `DESIGN_SYSTEM.md` is referenced by name in multiple screens' code comments as that reference but was not itself re-verified in this pass.

## Future maintenance risks

Ranked by likely long-term impact, elaborated in full in [PLATFORM_TECH_DEBT.md](../../architecture/PLATFORM_TECH_DEBT.md):
1. **Two coexisting architectures with no stated migration plan** for the ~10 screens still on the old foundation.
2. **`requestCache`'s string-keyed cache has no link between a cache key and the actual query parameters it represents** — a real risk of silently serving wrong data to a future caller whose parameters differ from what the key implies.
3. **`PlatformContext`'s scope could dilute** as more shared state needs arrive, if not deliberately kept to "selection and navigation" as its scope grows.
4. **Per-screen mock-data files independently mirror real backend response shapes** with no shared type/schema enforcing they stay in sync with the real contract.
5. **No automated conformance check** exists to guarantee a sixth Workspace screen actually follows this architecture — today's consistency is a product of careful, well-documented commits, not an enforced rule.
