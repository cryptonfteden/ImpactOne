# Platform Scalability Report

**Phase:** PLATFORM-ARCHITECTURE-REVIEW-001
**Purpose:** How the five-screen Workspace architecture behaves as more screens, more users, and more query variation are added — as distinct from [PLATFORM_ARCHITECTURE_REVIEW.md](PLATFORM_ARCHITECTURE_REVIEW.md)'s description of the architecture as it is today.

---

## What scales well

**Adding a sixth Workspace screen.** Proven three times over (Portfolio Workspace, then Watchlist Workspace and AI Analysis Workspace), each addition required zero changes to the shared foundation — every new screen simply imported the existing `components/nova`, `PlatformContext`, `requestCache`, and `claimPresentation.js`. This is close to the ideal shape for this kind of scaling: the cost of adding a new screen is roughly constant, not growing with the number of screens that already exist.

**Cross-screen continuity.** `PlatformContext`'s selection state is read and written the same way regardless of how many screens participate — AI Analysis Workspace reading `selectedSymbol` didn't require Mission Control, Portfolio Workspace, or anyone else to change anything. This is a genuinely scalable pattern for "let any screen hand off context to any other screen."

**The Design System's visual primitives.** `MetricArc`, `AttentionLevelBadge`, `IntelligenceCard`, `HeroCard`, and `DemoModeBanner` are all parameterized generically enough (a `metric` prop, a `sections` prop, a `liveSections`/`sectionLabels` pair) that each new screen's own domain content fits without needing a new variant of the component. Confirmed directly: no Workspace screen has needed to fork or extend any of these five components to fit its own data shape.

## What does not yet scale cleanly

### `requestCache`'s cache keys are hand-written strings, disconnected from the actual query they represent
`withRequestCache(key, fetcher)` de-duplicates and reuses a fetch purely by string key — e.g., `"claims:overnight-changes:10"`, used identically today by Mission Control, News Intelligence, and Watchlist Workspace, all calling `claimsApi.listOvernightChanges({ limit: 10 })` with the same arguments. This works today because every current caller happens to pass the same arguments. **Nothing enforces that the key and the arguments stay in sync.** As more screens are added with slightly different needs (a different `limit`, a different filter), one of two failure modes becomes likely:
- A new caller reuses an existing key with different arguments, silently receiving another screen's cached result for a different query.
- A new caller invents a new key for what's actually the same query, missing the de-duplication benefit the cache exists to provide.

This is not a bug today — it is a scaling risk that grows directly with the number of screens and the variety of their query parameters.

### Per-screen mock-data files duplicate the real backend response shape, with no shared contract
Five independent mock-data files (`missionControlMockData.js`, `portfolioWorkspaceMockData.js`, `newsIntelligenceMockData.js`, `watchlistWorkspaceMockData.js`, `aiAnalysisWorkspaceMockData.js`) each hand-author fixture data shaped like the real Claim/Portfolio/Attention API responses. This is the right call architecturally (each screen owns its own honest fallback), but it means the real backend contract is currently mirrored five separate times by hand, with nothing (no shared TypeScript type, no schema validation) to catch drift if the real API shape changes and only some of the five mock files are updated to match. This cost scales linearly with the number of screens — a tenth Workspace screen means a tenth independent copy of the same underlying shape.

### `PlatformContext`'s single-slot selection model doesn't yet express "compare two things"
`selectedClaim`/`selectedSymbol` are single values — there is one shared "current focus," not a set. This scales fine for the current pattern (each screen either contributes to or reads from the one shared focus), but any future feature that needs to compare two symbols or two claims side-by-side (a real, plausible future request given this platform's own emphasis on evidence and contradiction) would need either a new, second context slot or a redesign of the existing one — worth planning for deliberately rather than discovering the limitation mid-feature.

### No automated check enforces continued adoption of the shared architecture
Nothing today (no lint rule, no test) would catch a sixth Workspace screen that imports `components/ui`/`SectionCard` instead of `components/nova`, or that reimplements its own `statusTone`-equivalent instead of importing `claimPresentation.js`. The architecture's consistency so far is a product of careful, well-communicated individual commits — which has worked three times in a row, but is a process guarantee, not a structural one, and process guarantees don't scale as reliably as enforced ones once more contributors (human or otherwise) are involved.

## What happens if the two-architecture split is left unaddressed

The ~10 screens still on the old `components/ui` foundation (Recommendations, Daily Feed, Alerts, Themes, Global Intelligence, the Intelligence Console/Workspace screens, Decision Timeline, Market Positioning) do not benefit from any of the above scaling wins — they each still independently fetch, cache (or don't), and present claim-derived data their own way. As the new architecture's five screens continue to mature and gain features (richer cross-screen continuity, more shared logic in `claimPresentation.js`), the gap in capability and consistency between "the five Workspace screens" and "everything else" will only widen, making a future migration of the remaining screens more expensive the longer it's deferred — new logic added to the shared modules won't retroactively benefit the unmigrated screens, and the unmigrated screens' own local patterns will keep diverging further from the standard the Workspace screens have now firmly established.
