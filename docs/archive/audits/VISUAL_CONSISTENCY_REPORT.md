# VISUAL_CONSISTENCY_REPORT.md — Migrated Screens vs. Flagship, Category by Category

**Phase:** CINEMATIC-POLISH-003. Companion to [CINEMATIC_POLISH_3.md](../../design/CINEMATIC_POLISH_3.md). Every mission-named focus area addressed directly, with real evidence and a clear verdict: **Fixed**, **Consistent (no action needed)**, or **Deliberately different (reasoned, not a defect)**.

## Glass materials — Deliberately different (reasoned, not a defect)

Flagship's floating panel (`.workspace3d-glass-panel`) uses real glass: `backdrop-filter: blur(var(--nova-blur-glass)) saturate(150%)` over a translucent `rgba(16, 22, 44, 0.55)` fill. Grepped every real (non-test, non-showcase) use of NOVA's shared `Panel elevation="glass"` — found exactly **one** production call site: `Navigation.jsx`'s mobile drawer. **None of the 7 Workspace screens' cards use glass** — they use `elevation="1"`/`"2"` (opaque `--nova-surface-1`/`-2` fills). This is correct, not a gap: `NOVA_DESIGN_BIBLE.md` scopes glass to Level-3 surfaces only (modals/drawers/command-palette), a rule already independently audited and confirmed sound in the prior `DESIGN-PERFECTION-001` phase. Applying glass to every Workspace card to "match Flagship" would itself be a redesign and would dilute glass's meaning as a deliberate, reserved accent. **No change made.**

## Depth & shadows — Deliberately different (reasoned), one real gap found and left undone

Flagship's glass panel layers 4 shadow declarations (the shared `--nova-shadow-glass` token, plus a tighter contact shadow, an inset highlight, and a top-edge "glass reflection" gradient line) — appropriate for a translucent object that needs to visually "ground" itself against a 3D scene behind it. NOVA's shared `.nova-panel[data-elevation="1"/"2"]` uses a single-layer shadow token (`--nova-elevation-1`/`-2`) — appropriate for an opaque card sitting on a normal flat background, which doesn't need the same grounding treatment. **This difference is structurally justified, not fixed.** One real, smaller gap was found: `.nova-card`'s hover state changes `box-shadow` in its `transition-property` list but the base rule provides no distinct hover shadow value to transition *to* (elevation is fixed by the `Panel` component's `data-elevation` attribute, not adjusted on hover) — meaning the hover-lift (`translateY(-2px)`) currently has no accompanying shadow deepening. This would be a real, small, in-scope depth refinement, but doing it correctly means adding a new shadow value per elevation tier (not just wiring an existing token), which edges toward a small design decision rather than a pure execution fix — **documented as a recommended follow-up in [PREMIUM_REFINEMENTS.md](../../product/PREMIUM_REFINEMENTS.md), not implemented this phase.**

## Lighting — Consistent (no action needed)

Flagship's Earth/orbital scene uses real Three.js lighting (clearcoat material, directional light). This has no direct analog on a 2D card-based screen, and none is expected — "lighting balance" on the Workspace screens is better read as "does contrast/surface-tone read as intentional," which is already governed by the same token system (`--nova-surface-*`, `--nova-color-text-*`) audited clean in the prior phase (zero hardcoded hex in `components.css`). No new finding.

## Typography — Consistent (no action needed)

Confirmed via `SIGNATURE_ELEMENTS.md` and direct read of `FlagshipPanelContent.jsx`: Flagship's own panel *content* (as opposed to the 3D scene's floating orbital labels, which are a deliberately separate "instrument display" register) uses the **same** `nova-heading-*`/`nova-text-*` classes as every Workspace screen — they are not two different type systems, they are the same one. No inconsistency found between Flagship's panel content and the Workspace screens' typography.

## Motion — Fixed (the phase's headline finding)

See [CINEMATIC_POLISH_3.md](../../design/CINEMATIC_POLISH_3.md): `.nova-button`, `.nova-card`, `.nova-toggle`, `.nova-toggle__thumb` had a declared `transition-property` with no duration/timing-function, so they snapped instead of easing — fixed by adding the exact duration+curve pair Flagship's own toolbar button already uses. **Entrance motion** (a real gap, left undone): Flagship's glass panel always plays a real mount animation (`workspace3d-panel-in`); Mission Control's own `HeroCard` plays a real one-time entrance pulse (`.mc-hero--enter`, confirmed used for both Mission Control's "Top Priority" and Portfolio Workspace's "How am I doing?"); but the smaller, secondary `Card`/`IntelligenceCard` instances used throughout every Workspace screen (used far more often than `HeroCard`) have **no** mount animation at all — they simply appear. Adding one to every card everywhere would be a visible behavior change to many screens at once, closer to a small redesign than a pure fix — **documented as a recommended follow-up, not implemented this phase** (see [PREMIUM_REFINEMENTS.md](../../product/PREMIUM_REFINEMENTS.md)).

## Hover — Fixed (same root cause as Motion)

`.nova-card:hover { transform: translateY(-2px); }` and `.nova-button[data-variant="primary"]:hover { transform: translateY(-1px); }` both existed and were correctly specified, but — per the Motion finding above — snapped instantly rather than easing. Fixed by the same `components.css` change. No other hover-state gap found; `.nova-button[data-variant="ghost"]:hover` (underline) and `.workspace3d-toolbar__button:hover` (lift + background lighten) are both real and were already correctly implemented before this phase.

## Focus — Consistent (already resolved by a prior phase, re-verified)

The prior `APPLE-QUALITY-001` phase (commit `3e8e498`) wired `data-nova-interactive` onto `Button.jsx` and added real `:focus-visible` rings to the 3D layer's toolbar buttons and orbital-node labels. Re-verified this phase via direct source read: `Button.jsx` still carries the attribute, and every Workspace screen's interactive elements (expand/collapse toggles, tabs, nav) route through `Button`/`Navigation.jsx`'s shared `nova-tabs`/`nova-breadcrumb` components, which inherit the same treatment. No new focus-state gap found.

## Empty states — Consistent (no action needed)

Grepped all 7 Workspace screens' imports: every one of them (`AiAnalysisWorkspaceScreen`, `IntelligenceWorkspaceScreen`, `MarketIntelligenceWorkspaceScreen`, `PersonalIntelligenceWorkspaceScreen`, `PortfolioWorkspaceScreen`, `WatchlistWorkspaceScreen`) imports and uses the shared `EmptyState` component from `components/nova` — the same `◇` icon + plain-language "why this is empty" treatment throughout, not a per-screen reimplementation. This is the correct way to achieve "indistinguishable" consistency (one shared component, not independently-matching bespoke ones), and it is already in place. The prior phase's `0bb4c3c` commit (unifying `AiAnalysisScreen.jsx`'s — the older, non-Workspace sibling — empty state onto this same standard) is a direct, real example of this convention being actively maintained.

## Loading states — Consistent (no action needed)

Same grep confirms every Workspace screen imports and uses the shared `Skeleton` component (`nova-skeleton`, real shimmer animation, already contrast-fixed and RTL-safe per prior phases) rather than a bespoke spinner or plain "Loading..." text. Flagship's own loading treatment (inside `FlagshipPanelContent.jsx`) is necessarily a separate implementation (it renders inside the 3D panel's own DOM structure, not a NOVA `Panel`), but uses the same visual language (a shimmer skeleton), confirmed via `PIXEL_POLISH.md`'s own prior finding ("Loading states... already correct — no change").

## Error states — Consistent (no action needed)

Confirmed via grep that `IntelligenceWorkspaceScreen.jsx` imports and uses a shared `Alert` component for its error path. Flagship's own `ErrorState` (inside `FlagshipPanelContent.jsx`) is visually distinct from its empty state (red accent vs. neutral), per the prior phase's own already-confirmed finding. No cross-screen inconsistency found this phase between the two treatments' visual language (both use the same negative/danger color token).

## Visual density — Consistent (no action needed)

Re-confirmed via live screenshot comparison in the prior phase (`DESIGN-PERFECTION-001`): Portfolio Workspace and Mission Control both use the same hero → tiered-sections → detail-panel density rhythm as Flagship's own hero-Earth → orbital-panel structure. No new finding this phase.
