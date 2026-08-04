# CONSISTENCY_AUDIT.md — Does Every Screen Feel Designed By The Same Team?

**Phase:** DESIGN-PERFECTION-001. Companion to [DESIGN_PERFECTION.md](../../design/DESIGN_PERFECTION.md) and [VISUAL_DEFECTS.md](../../design/VISUAL_DEFECTS.md). This document answers the mission's own consistency question directly, screen by screen and system by system.

## The one-sentence answer

**No — the product currently has two visual eras, not one**, but within each era, consistency is genuinely strong and has measurably improved with each recent phase.

## Era A: Nova (the governed system)

**Screens confirmed on this system**: Mission Control, Portfolio Workspace, News Intelligence, Watchlist Workspace, AI Analysis Workspace, Market Intelligence Workspace, Personal Intelligence Workspace, the 3D Workspace, the Flagship Earth scene.

**What makes this era consistent, confirmed this phase**:
- One real token source (`frontend/src/styles/tokens.css` → `theme.css`), zero hardcoded hex/blur/easing values in `components.css` (confirmed via grep, exact zero).
- One real color-mix pattern for data-driven color (`heatCellColor()` in `DataViz.jsx`, using `color-mix(in srgb, var(--nova-color-positive) ...)`), reused rather than re-derived.
- The 3D layer (`workspace3d.css`, `flagshipScreen.css`) was migrated onto this same token scale by `804462e`, confirmed via direct read: real `var(--nova-radius-lg)`, `var(--nova-space-*)`, `var(--nova-motion-duration-standard)`, `var(--nova-blur-glass)` used throughout, with a small number of disclosed, reasoned exceptions (below-token-floor micro-copy sizes, a semantically distinct `50%` circle radius) rather than silent drift.
- One real accessibility contract (`data-nova-interactive`, `:focus-visible` rings) applied consistently after `3e8e498`'s pass — confirmed `Button.jsx` and both 3D-layer interactive elements (toolbar buttons, orbital node labels) now share it.
- Hero-card → tiered-sections → glass-panel visual rhythm repeats across Mission Control, Portfolio Workspace, and the Flagship screen (confirmed live via screenshot this phase) — generous whitespace, rounded corners, single-hero-number-first hierarchy.

**Internal Nova-era gaps found this phase**: none new. The one gap this phase fixed (header-controls stacking on landscape phones) affects the shared `Header.jsx`/`styles.css` chrome used by *every* screen, not a Nova-specific inconsistency.

## Era B: Legacy ("IMPACTONE TERMINAL")

**Screens confirmed on this system**: Recommendations, Daily Feed, Themes, Alerts, AI Analysis (the old, pre-Workspace screen kept for test compatibility), Global Intelligence, Market Dashboard, Market Positioning, Decision Timeline — roughly 11 of ~24 real sidebar destinations.

**What makes this era visually distinct, confirmed this phase**: dense, flat, sharp-cornered card grids; saturated flat pill/badge colors (`#4ade80` green, `#f87171` red, `#60a5fa` blue — all hardcoded, not tokens); tight, compact spacing; small type. Live-confirmed via a direct screenshot of the Recommendations screen this phase, immediately compared against Portfolio Workspace's spacious, glass-bordered, single-hero-number layout reached one sidebar click away.

**Root cause, confirmed via grep**: `frontend/src/styles.css` (the file every legacy screen still draws from) contains 250+ raw hex color values and predates the Nova token system entirely (its oldest surviving rules trace to the "Sprint 5" commit). It was explicitly, correctly scoped *out* of `804462e`'s token migration (that phase's own disclosure: "the legacy, pre-Nova styles.css ... was not re-audited this phase").

## Why this is a Critical, not a Medium, consistency finding

The mission's own standard is explicit: "every screen should feel designed by the same team." A user can navigate from Portfolio Workspace (Nova) to Recommendations (legacy) in one sidebar click and experience a visibly different product — different corner radii, different color logic, different density, different type rhythm. This is the largest, most consequential consistency gap in the product today, larger in scope than anything else found this phase.

## Why it isn't fixed in this phase

Migrating ~11 screens' CSS onto Nova tokens is a real, multi-file visual migration, not a "perfect the existing execution" fix — it would mean visually changing how those screens look (new corner radii, new spacing, new color treatment), which crosses this mission's own "no redesign" boundary. The correct, safe scope for a future phase: repeat exactly the technique `804462e` already proved out on the 3D layer (grep every hardcoded value against `tokens.css`, substitute exact/nearest matches, disclose exceptions) — screen by screen, starting with the highest-traffic legacy screen (Recommendations or Daily Feed) as a single proof-of-concept before doing all 11.

## Motion consistency, checked across both eras

Nova-era transitions consistently use `var(--nova-motion-duration-*)` + `var(--nova-motion-curve-*)`. Legacy-era transitions (spot-checked in `styles.css`) use ad hoc values (`0.2s ease`, `0.3s ease-in-out` — not exhaustively catalogued this phase). This is the same Era A/B split as color and spacing, not a separate finding — one root cause (one file never migrated) explains all of it.

## What is genuinely, verifiably consistent product-wide (credited, not just claimed)

- The empty-state pattern (a `◇` glyph + a plain-language "why this is empty" sentence) — confirmed present, worded consistently, on both Portfolio Workspace (Nova) and Recommendations-adjacent legacy screens during this phase's live walkthrough.
- The bottom-nav / sidebar navigation chrome is now one shared component (`BottomNav`) used everywhere after `e336923`'s landscape fix, rather than two divergent navigation concepts.
- The "advisory only, never trades for you" and "simulated paper trading" disclosures render identically worded across the welcome modal and every screen that touches portfolio data.
