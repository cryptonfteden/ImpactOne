# Platform Integration

**Phase:** PLATFORM-INTEGRATION-001
**Purpose:** Document how Mission Control, Portfolio Workspace, and News Intelligence were joined into one continuous experience — shared selection state, a shared cached portfolio summary, and a shared navigation entry point — without redesigning any of the three screens or introducing new Design System components.

## What "integrated" means here

Before this phase, the three screens were independently correct but mutually unaware: each fetched its own data, tracked its own Demo Mode state, and reset to a blank slate on every mount. Navigating from Mission Control's hero claim to Portfolio Workspace or News Intelligence lost all context — you'd land on an unrelated top story or an unranked position list.

This phase adds a thin, additive integration layer. No screen's rendered markup, CSS, or Design System component usage changed — every visual element you could screenshot before this phase looks identical after it. What changed is what the three screens read from and write to in common.

## 1. Shared state: `PlatformContext`

`frontend/src/context/PlatformContext.jsx` is a new React context, provided once at `MainLayout.jsx` (wrapping the whole app shell, so any current or future screen can reach it) and consumed via the `usePlatformContext()` hook. It holds:

| Field | Type | Written by | Read by |
|---|---|---|---|
| `selectedClaim` | Claim-shaped object or `null` | Each screen's own hero/top item, once real data has loaded | Available to any screen; News Intelligence also derives `selectedSymbol` preference from it |
| `selectedSymbol` | string or `null` | `selectClaim` (derives it from the claim's first symbol) or `selectSymbol` directly | News Intelligence's hero-selection logic (see below) |
| `portfolioContext` | the real `GET /v2/portfolio` summary or `null` | `loadPortfolioContext()` | Portfolio Workspace (replaces its own direct fetch) |
| `portfolioContextStatus` | `"idle" \| "loading" \| "loaded" \| "error"` | `loadPortfolioContext()` | any consumer that wants to distinguish "not yet asked" from "asked and failed" |
| `navigateTo(screenKey, { claim, symbol })` | function | — | any screen that wants to navigate to another integrated screen while carrying a claim/symbol forward |

Each of the three screens contributes its own most-relevant real item to `selectedClaim`/`selectedSymbol` once its own real (or Demo Mode fallback) data has resolved — never from the screen's transient initial-render placeholder state, since that would overwrite a value another screen just set before this screen's own fetch even completes (a real ordering bug found and fixed during this phase — see below).

### The one real cross-screen behavior wired in this phase

News Intelligence's hero selection now prefers the highest-attention real feed item that touches `selectedSymbol`, if one exists in today's feed, before falling back to pure attention-score ranking. Concretely: if Mission Control or Portfolio Workspace most recently surfaced NVDA as its top claim, and a real News Intelligence feed item also names NVDA, that item becomes News Intelligence's Top Story — even if a different item currently ranks higher purely on Attention Score. If nothing in today's feed touches that symbol, ranking falls back to the pure attention order exactly as before this phase.

This is the only behavioral (not just plumbing) integration added — kept singular and bounded so the change stays auditable, rather than threading speculative cross-screen behavior through every section of all three screens.

## 2. Shared cache: `requestCache.js`

`frontend/src/services/requestCache.js` is a small, explicit, keyed request cache — deliberately **not** a blanket change to `apiClient.js`. A blanket cache over every `GET` call in the app would risk staling data for screens elsewhere in the codebase that poll or expect always-fresh reads; this cache only wraps the specific calls the three integrated screens are already known to duplicate:

- `claims:overnight-changes:10` — `claimsApi.listOvernightChanges({ limit: 10 })`, called identically by Mission Control's "Claims Changing" section and News Intelligence's "What Changed Since Yesterday" section.
- `platform:portfolio-summary` — `portfolioEngineApi.getSummary()`, now fetched exactly once through `PlatformContext.loadPortfolioContext()`, which Portfolio Workspace calls instead of fetching the summary itself.

Behavior:
- **De-duplication** — a second caller for the same key while the first fetch is still in flight receives the exact same promise; only one real HTTP request goes out.
- **Reuse** — a caller within 15 seconds (`DEFAULT_TTL_MS`) of the last resolved fetch gets the cached, already-resolved data with no network call at all. Navigating Mission Control → News Intelligence within that window reuses the one real overnight-changes fetch instead of issuing a second.
- **No poisoned cache** — a rejected fetch is never cached; the next call (or a retry) always gets a genuine new attempt.

Every other `GET` call in the app (Daily Feed, Alerts, Recommendations, etc.) is completely unaffected — this cache is opt-in per call site, not a global interceptor.

## 3. Shared navigation entry point

`MainLayout.jsx` now wraps its screen-rendering area in `<PlatformProvider navigate={setActiveView}>`. `setActiveView` is the same function MainLayout already passed to every screen as the `onNavigate` prop — `PlatformProvider` doesn't replace that existing mechanism, it exposes the same underlying navigation through `navigateTo(screenKey, { claim, symbol })` on the shared context, so a screen that wants to navigate to another integrated screen *and* carry a specific claim/symbol forward can do both in one call instead of navigating and then separately hoping the receiving screen picks up the right context.

## 4. Demo Mode and Design System — unchanged

- Every screen's per-section Demo Mode computation, `DemoModeBanner` usage, and fallback-on-failure logic is untouched. `loadPortfolioContext()` itself never throws — a failed portfolio fetch resolves to `portfolioContextStatus: "error"` and `portfolioContext: null`, and Portfolio Workspace's existing "did the real overview section actually load" check now treats a `null` context value as a normal fetch failure, falling back to `fallbackSummary`/`fallbackDelta` exactly as before.
- No new Design System component was created. No existing component's visual markup changed. `PlatformContext` is pure state and functions — nothing in it renders.

## 5. A real ordering bug found and fixed during this phase

News Intelligence computes its ranked list and hero directly from render-time state (`feed`), which starts as the fallback data before the real fetch resolves. The hero-contribution effect (`selectClaim(newsItemToClaim(hero))`) originally fired on every hero change — including the very first render, using the transient fallback hero — which meant it would overwrite a `selectedSymbol` another screen had already set (e.g. via `navigateTo`) before News Intelligence's own real data had even loaded. Fixed by gating that effect on `!isLoading`, so it only ever contributes a hero once real (or genuinely-fallen-back) data has actually resolved.

## Testing

- `frontend/src/services/requestCache.test.js` — de-duplication, TTL reuse, TTL expiry, never-caches-a-rejection, per-key and whole-cache clearing.
- `frontend/src/context/PlatformContext.test.jsx` — throws outside a provider; `selectClaim` derives `selectedSymbol`; `selectSymbol` works standalone; `navigateTo` sets the claim and calls the shared navigate function; `loadPortfolioContext` fetches once and shares the cached result; a failed load sets an honest `"error"` status rather than throwing.
- `MissionControlHomeScreen.test.jsx` / `PortfolioWorkspaceScreen.test.jsx` / `NewsIntelligenceScreen.test.jsx` — updated to render inside a real `PlatformProvider` (previously each screen's tests rendered it standalone); `requestCache` is cleared in every `beforeEach` so cached entries from one test never leak into the next.
- `NewsIntelligenceScreen.test.jsx` gained two new tests: preferring a real item that matches a pre-set `selectedSymbol` as the hero, and falling back to pure attention ranking when the shared symbol isn't in today's feed.
- Full suite: 470/470 passing across 65 test files (16 net new tests this phase).

## Known limitations

- The cross-screen behavioral integration is intentionally limited to the one News Intelligence hero-preference rule described above. Portfolio Workspace and Mission Control currently only *contribute* to shared state; they don't yet *consume* `selectedClaim`/`selectedSymbol` from another screen to alter their own hero selection. Extending that symmetrically is real future scope, not done here, to keep this phase's behavior change auditable and singular.
- `requestCache`'s 15-second TTL is a fixed default; there is no cache-invalidation hook tied to real user actions (e.g., placing a trade) that would want to force a fresh portfolio summary sooner. `loadPortfolioContext({ force: true })` exists for exactly that case but nothing calls it yet.
- `npm run build` still fails on the pre-existing, unrelated unpinned Vite/Rolldown/lightningcss issue (reconfirmed this phase, unrelated to any change here).
