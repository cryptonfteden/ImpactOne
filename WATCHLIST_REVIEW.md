# Watchlist Review

**Phase:** WATCHLIST-REVIEW-001
**Scope:** As requested — the Watchlist Workspace only. No code was changed to produce this review.

## The headline finding, before anything else

**There is no "Watchlist Workspace" built on the platform architecture established by Mission Control, Portfolio Workspace, and News Intelligence.** Confirmed by direct source review: only two screens exist for watchlist functionality, and neither imports from the Design System (`components/nova`), `PlatformContext`, or `requestCache`.

- **`WatchlistScreen.jsx`** — a flat, single-list watchlist view. Confirmed via `Sidebar.jsx`'s own code comment: this is *"the legacy flat, localStorage-driven list... dropped as a nav destination"* — it is no longer reachable from the sidebar at all, kept only so its existing tests keep passing.
- **`WatchlistFoldersScreen.jsx`** — the screen actually reachable today, via the sidebar entry labeled **"Workspaces"** (confirmed in `Sidebar.jsx`'s `{ key: "Watchlist Folders", label: "Workspaces" }`). This is the real, backend-persisted (per-beta-user, database-isolated) folders-and-price-alerts screen, and is the closest thing to a "Watchlist Workspace" that exists — so this review treats it as the primary subject, while noting the legacy screen's continued (if unreachable) existence throughout.

This finding governs every section below: this screen predates the new architecture entirely, and every "reuse" question this review was asked to answer has the same answer — none.

---

## UX

`WatchlistFoldersScreen.jsx`'s UX is functional but shows its age relative to the rest of the app. Two concrete issues stood out:

- **It uses native browser dialogs (`window.prompt()` for renaming a folder, `window.confirm()` for deleting one)** — while the very same file defines and uses its own custom `Modal` component for the price-alert flow just below. This is an internal inconsistency within one file: one destructive/editing action gets a real, styled in-app dialog; two others get an unstyled OS-native prompt that breaks the visual experience entirely and can't be localized, styled, or made accessible the way the rest of the app is.
- **No intelligence signal is shown for a symbol once it's inside a folder** — a folder lists a symbol with only its ticker and action buttons (Set alert / Move to.../ Remove). There is no Confidence, Attention Score, or claim status shown anywhere in the folder view. This is a real step backward relative to the *legacy, unreachable* `WatchlistScreen.jsx`, which — despite being deprecated — actually ranks symbols by real Attention Score and shows a real "why today" reason per symbol (new/strengthening/weakening claim, unusual options activity). The screen users can actually reach today has less intelligence in it than the one that was intentionally retired.

## Information hierarchy

There is no tiered hierarchy here at all — no hero item, no "most important thing first" structure of the kind Mission Control/Portfolio Workspace/News Intelligence all now share. The screen is a flat sequence of three same-weight sections (Create a folder → folder grid → Price Alerts), and within the folder grid, every folder and every symbol inside it is visually equal — there is no signal anywhere on this screen for "which of my watched symbols deserves my attention right now," which is precisely the question a watchlist exists to answer, and precisely the question the rest of this platform has built real machinery (the Attention Engine, Claims, MetricArc) to answer everywhere else.

## Reuse of Design System

**None.** `WatchlistFoldersScreen.jsx` imports `SectionCard` and `Button`/`EmptyState`/`ErrorState`/`Input`/`LoadingSpinner` from `../components/ui` — a separate, older component library, not `../components/nova`. It does not import `HeroCard`, `IntelligenceCard`, `MetricArc`, `AttentionLevelBadge`, or `DemoModeBanner`. Its empty state uses a different icon (`◎`) than the `◇` glyph consistently used by every NOVA `EmptyState` instance elsewhere in the app — a small but real, visible inconsistency a user would notice moving between screens.

## Reuse of PlatformContext

**None.** No import of `usePlatformContext` anywhere in either watchlist screen. Concretely, this means: a claim or symbol selected on Mission Control, Portfolio Workspace, or News Intelligence does not carry into the Watchlist screen, and nothing a user does on the Watchlist screen (e.g., opening a symbol) feeds back into that shared context either — the Watchlist experience is an island relative to the cross-screen continuity `PlatformContext` was built to provide.

## Reuse of requestCache

**None.** `watchlistFoldersApi.list()` and `priceAlertsApi.list()` are called directly, unwrapped, on every `refresh()` call, with no `withRequestCache` de-duplication. This is a smaller gap than the others (there's no evidence of redundant concurrent calls specifically caused by this), but it means this screen doesn't benefit from the same request-sharing behavior the rest of the app now has.

## Business logic duplication

One real instance, related in spirit to the platform-wide `claimPresentation.js` consolidation but not literally the same code: `WatchlistScreen.jsx` (the legacy screen) independently computes a per-symbol attention ranking via `claims.reduce((max, claim) => Math.max(max, claim.attentionScore ?? 0), 0)` — the identical presentation-only "take the max real Attention Score across a symbol's claims" pattern already established in `PortfolioWorkspaceScreen.jsx`'s `positionAttention` computation. It also independently maps claim status to a short reason string ("New claim" / "Strengthening claim" / "Weakening claim" for DRAFT/STRENGTHENING/WEAKENING) — conceptually adjacent to, but not sharing, `claimPresentation.js`'s `statusPlainLabel()`. Since this screen is already marked legacy/unreachable, this is a lower-priority duplication than the ones already resolved elsewhere in the platform, but it exists in the current source and is worth naming.

## Navigation consistency

This is the most concrete, immediately actionable finding in this review. The sidebar's "More tools" list already contains **"Mission Control," "Intelligence Workspace," "Portfolio Workspace,"** and others — a clear naming pattern of `[Concept] Workspace`. The watchlist-folders destination breaks that pattern on both ends: its internal `key` is `"Watchlist Folders"` but its displayed `label` is the bare, generic **"Workspaces"** — plural, with no reference to watchlists at all, and colliding conceptually with "Portfolio Workspace" and "Intelligence Workspace" sitting right next to it in the same menu. A user scanning the sidebar has no way to infer that "Workspaces" is where their watchlist folders and price alerts live; the label describes a category the rest of the menu already uses to mean something else. Reinforcing this internally: the code's own analytics events are literally named `trackEvent("workspace_created")` / `trackEvent("workspace_deleted")` for what the UI itself titles "Watchlist Folders" — the naming is inconsistent even within this one file.

---

See [WATCHLIST_GAPS.md](WATCHLIST_GAPS.md) for every finding above, ranked.
