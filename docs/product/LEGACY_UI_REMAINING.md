# Legacy UI Remaining — NOVA-MIGRATION-001

Every real, disclosed piece of the legacy visual system this phase did **not** migrate, and exactly why — so a future phase has a concrete, evidence-based starting point rather than needing to re-derive this analysis.

## Legacy Color Variables Checked and Confirmed NOT an Exact Match (Not Aliased)

| Legacy variable | Legacy value | Nearest Nova token | Nova value | Exact match? |
|---|---|---|---|---|
| `--text-0` | `#f3f7ff` | `--nova-color-text-primary` | `#f5f7fa` | No — close, not identical |
| `--text-1` | `#c4d2e9` | `--nova-primitive-paper-300` | `#c9d0dd` | No |
| `--text-2` | `#8ea3c3` | `--nova-color-text-secondary` | `#a8b0c3` | No |
| `--success` | `#37d68e` | `--nova-color-positive` | `#22c55e` | No — same hue family, different color |
| `--danger` | `#ff6b79` | `--nova-color-negative` | `#f43f5e` | No |
| `--h3-text-primary` | `#e9edf7` | `--nova-color-text-primary` | `#f5f7fa` | No |
| `--h3-text-secondary` | `#93a1c2` | `--nova-color-text-secondary` | `#a8b0c3` | No |
| `--h3-positive` | `#34d399` | `--nova-color-positive` | `#22c55e` | No |
| `--h3-negative` | `#f87171` | `--nova-color-negative` | `#f43f5e` | No |
| `--glass` | `rgba(19, 29, 44, 0.7)` | *(no direct Nova rgba-surface token)* | — | N/A — no equivalent exists |
| `--glass-border` | `rgba(160, 184, 219, 0.18)` | *(no direct Nova rgba-border token)* | — | N/A — no equivalent exists |

**Why these were left alone**: aliasing any of these to its "close" Nova equivalent would be a real, visible color change — a genuine (if subtle) design decision, not a migration of an already-identical value. This mission's own "do not redesign" and "preserve existing behavior" requirements, combined with the real absence of any visual-verification tool in this environment, make this the correct, disciplined stopping point — the same standard already applied in `WORLD-CLASS-UI-001`/`FINAL-SHIP-001` when the same situation arose for the 3D layer's own colors.

## The JS-Side Duplicate

`frontend/src/context/theme.js` defines `accent: "#6fb6ff"` as a plain JavaScript string — a fourth real occurrence of the same value this phase's CSS fix addressed the other three of. Not changed this phase because:

1. It's a different kind of value (a JS runtime constant, not a CSS custom property) — there is no direct "alias to a CSS variable" mechanism from JS without first understanding exactly how this value is consumed (inline styles? a theme context passed to components? written back into CSS variables at runtime?).
2. Changing it without verifying every consumer would risk the "preserve existing behavior" requirement in a way the CSS-to-CSS aliases in `TOKEN_MIGRATION_REPORT.md` did not (those changes are provably zero-risk; this one is not, without further investigation this phase's time budget did not include).

**Recommended next step**: read `theme.js`'s full consumption path, then either import the resolved CSS custom property's value at runtime (if the JS context is only ever used inside a browser context where `getComputedStyle` is available) or accept the duplication as a real, disclosed, permanent cross-language boundary (JS constants and CSS custom properties are different mechanisms, and perfect unification across that boundary is not always the right investment).

## Other Legacy Stylesheet Scope Not Audited This Phase

- The vast majority of `frontend/src/styles.css`'s ~3,800 lines — spacing values, border-radii, shadow definitions, typography sizes — were not individually compared against Nova's equivalent scales this phase. `WORLD-CLASS-UI-001` performed this exact comparison for this session's own 3D/Flagship CSS (a much smaller, self-contained file); the same exercise for the legacy stylesheet is a real, larger, separate undertaking not attempted here.
- Component-level CSS files outside `styles.css` (if any exist per-screen or per-feature outside the `nova/` and `workspace3d`/`flagshipScreen` directories already migrated in prior phases) were not inventoried or audited this phase.
- No screen's HTML/JSX structure was touched — this phase is purely a CSS custom-property-level change; no component was migrated to use different shared components, different class names, or different markup.

## What "Migrated" Actually Means After This Phase

The 6 priority screens (Home, Recommendations, Daily Feed, Portfolio, Alerts, AI Analysis) now share one real, unified accent-color definition with the Nova system (via the 3 aliases in `TOKEN_MIGRATION_REPORT.md`) — a real, if narrow, first step. They are **not** fully visually unified with Nova's broader token system (text colors, status colors, glass surfaces remain legacy-defined, real but different values) — this is disclosed honestly rather than claimed as complete.
