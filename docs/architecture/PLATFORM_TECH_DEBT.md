# Platform Technical Debt

**Phase:** PLATFORM-ARCHITECTURE-REVIEW-001
**Purpose:** A ranked, standing register of the specific technical debts identified in [PLATFORM_ARCHITECTURE_REVIEW.md](../archive/audits/PLATFORM_ARCHITECTURE_REVIEW.md) and [PLATFORM_SCALABILITY_REPORT.md](../archive/audits/PLATFORM_SCALABILITY_REPORT.md), so future work can track and pay these down deliberately rather than rediscovering them. Ranked CRITICAL / HIGH / MEDIUM / LOW by likely future impact, not by effort to fix.

---

## HIGH

### TD1. Two coexisting frontend architectures, no migration plan for the older one
Five screens (Mission Control, Portfolio Workspace, News Intelligence, Watchlist Workspace, AI Analysis Workspace) share a mature, consistent architecture (Design System, `PlatformContext`, `requestCache`, `claimPresentation.js`). Roughly ten other screens (Recommendations, Daily Feed, Alerts, Themes, Global Intelligence, Intelligence Console/Workspace, Decision Timeline, Market Positioning, plus the legacy screens each new Workspace replaced) remain on the older `components/ui`/`SectionCard` foundation with none of these benefits. No document or commit establishes a plan or a priority order for migrating the rest. This gap will only become more expensive to close the longer it's deferred, since new shared capability keeps landing only on one side of the split.

### TD2. `requestCache` keys are hand-written strings with no link to the actual query parameters they represent
Confirmed: `"claims:overnight-changes:10"` is duplicated as a literal string constant in at least two screen files, correct only because every current caller happens to pass identical arguments. Nothing ties the key to the arguments — a future change to one call site's parameters without a matching key change would silently serve stale or wrong-shaped cached data to another screen.

### TD3. No automated check enforces continued architectural adoption
Nothing (lint rule, test, CI check) would catch a new screen reintroducing the old `components/ui` pattern, bypassing `PlatformContext`, or reimplementing logic `claimPresentation.js` already owns. The consistency achieved across five screens is currently a discipline outcome, not a structural guarantee.

---

## MEDIUM

### TD4. `PlatformContext` mixes two distinct responsibilities (selection/navigation and a cached domain-data fetch)
Currently small and manageable, but a real risk of scope dilution as more shared state needs arrive across a growing number of screens — worth a deliberate policy (e.g., "PlatformContext holds cross-screen focus and navigation only; new shared domain-data caching gets its own dedicated hook/module") before it accumulates further.

### TD5. Per-screen mock-data files duplicate the real backend response shape with no shared contract
Five independent files each hand-author fixtures shaped like the real API responses, with nothing (shared type, schema validation) to catch drift between them and the real contract, or between each other, as the backend evolves.

### TD6. Small, screen-local recommendation-threshold logic has no designated shared home
`WatchlistWorkspaceScreen.jsx`'s `nextActionFor()` (risk/opportunity score thresholds → a plain-language next action) is a clean, honest, presentation-only rule — but it lives in one screen file, in the same category of logic (`recommendedAttentionLevel`/`attentionLevelForScore`) that was already independently duplicated once before this platform's own `claimPresentation.js` consolidation. The underlying habit that caused that duplication (write a small local classifier rather than reach for a shared one) hasn't recurred yet, but nothing prevents it from recurring the next time a screen needs similar logic.

### TD7. `PlatformContext`'s single-slot selection model has no expression for "compare two things"
`selectedClaim`/`selectedSymbol` hold exactly one value each. A future feature requiring side-by-side comparison of two symbols or two claims (plausible given this platform's own emphasis on evidence and contradiction) would require a redesign rather than a natural extension.

### TD8. No single, written "how to build the sixth Workspace screen" reference
The pattern is currently learned by reading four sibling screens' source. `DESIGN_SYSTEM.md` is referenced by name in code comments as this reference but was not independently re-verified for completeness in this review.

---

## LOW

### TD9. Legacy watchlist/AI-Analysis screens retained solely for test compatibility
`WatchlistScreen.jsx` (superseded by `WatchlistWorkspaceScreen.jsx`) and the pre-Workspace `AiAnalysisScreen.jsx` (superseded by `AiAnalysisWorkspaceScreen.jsx`) remain in the codebase, unreachable from navigation, kept only so their existing tests continue to pass. Low priority (they cause no live user-facing harm) but worth an eventual, deliberate removal decision rather than indefinite retention as dead weight.

---

## What's explicitly not tech debt (verified, not assumed)

- The shared foundation itself (Design System, `PlatformContext`, `requestCache`, `claimPresentation.js`) is well-built, genuinely reused (not just present), and extracted from real working code rather than designed speculatively — this is the platform's strongest architectural asset, not a liability.
- Business-logic ownership for the concepts that matter most (Confidence, Probability, Attention Score, claim status) is now correctly and singularly centralized — this specific class of debt, which recurred multiple times in this platform's history, has been the most decisively addressed of anything in this register.
