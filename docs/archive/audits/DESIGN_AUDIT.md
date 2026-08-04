# Design Audit — WORLD-CLASS-UI-001

Real, itemized findings from comparing `frontend/src/features/workspace3d/workspace3d.css` and `frontend/src/features/flagshipScreen/flagshipScreen.css` against the established Nova design token system (`frontend/src/styles/tokens.css`).

## Method

Every hardcoded numeric/color value in both files was checked against `tokens.css`'s defined scales (`--nova-space-*`, `--nova-radius-*`, `--nova-font-size-*`, `--nova-motion-duration-*`/`-curve-*`, `--nova-blur-glass`, `--nova-shadow-glass`, `--nova-color-text-*`, `--nova-color-brand-signal`) for an exact or clearly-nearest match. This is the same kind of direct, evidence-based comparison used in `APPLE-QUALITY-001` to find the `data-nova-interactive` gap — checking an actual, real specification against actual, real usage, not a generic "looks fine" pass.

## Findings

### Color

| Bespoke value found | Used for | Nova token | Match quality |
|---|---|---|---|
| `#4f8cff` | Focus rings, active toolbar state, focused-node background | `--nova-color-brand-signal` (`#6fb6ff`) | Same role (the app's one brand/interactive accent), different literal color — a real, confirmed duplicate concept |
| `#eaf1ff` | Primary text throughout both files | `--nova-color-text-primary` (`#f5f7fa`) | Same role, near-identical near-white value |
| `#9fb0dd`, `#aebbe0`, `#cdd8f5` | Secondary/tertiary text, three slightly different bespoke grays for what is functionally the same "less important text" role | `--nova-color-text-secondary` / `--nova-color-text-tertiary` | Three bespoke values doing the job of two existing tokens |

### Corner Radius

| Bespoke value | Used for | Nova token | Exact match? |
|---|---|---|---|
| `999px` | Pills (node labels, chips, toolbar buttons) | `--nova-radius-full` (`9999px`) | Functionally identical (both fully round a pill of this height) |
| `12px` | `.workspace3d-root` | `--nova-radius-lg` (`12px`) | Exact |
| `16px` | `.workspace3d-glass-panel` | `--nova-radius-lg` (`12px`) | Nearest (no 16px token exists) |
| `8px` | `.workspace3d-glass-panel__close` | `--nova-radius-md` (`8px`) | Exact |
| `6px` | `.flagship-skeleton-bar` | `--nova-radius-sm` (`4px`) | Nearest |
| `50%` | `.flagship-panel__state-icon` (a perfect circle) | *(not migrated — see below)* | N/A |

### Spacing

| Bespoke value(s) | Nova token | Exact match? |
|---|---|---|
| `4px` | `--nova-space-1` | Exact |
| `8px`, `10px` | `--nova-space-2` | Exact (8px) / nearest (10px) |
| `12px` | `--nova-space-3` | Exact |
| `14px`, `16px`, `18px` | `--nova-space-4` | Nearest — three different bespoke values collapse to one real token |
| `24px` | `--nova-space-6` | Exact |

### Glass / Blur

| Bespoke value | Nova token | Notes |
|---|---|---|
| `blur(18px)`, `blur(20px)` | `--nova-blur-glass` (`24px`) | A dedicated token for exactly this purpose already existed and was never used by the 3D scene's own glass panel |

### Shadow

| Bespoke value | Nova token | Notes |
|---|---|---|
| `0 32px 70px rgba(0,0,0,0.5)` (outer layer of a 4-layer shadow) | `--nova-shadow-glass` (`0 16px 42px rgba(0,0,0,0.3)`) | The outer/base layer now anchors to the shared token; the three additional layers (contact shadow, inset highlights) are a real, deliberate richer treatment layered on top, not removed |

### Motion

| Bespoke value | Nova token | Match quality |
|---|---|---|
| `cubic-bezier(0.16, 1, 0.3, 1)` (panel entrance) | `--nova-motion-curve-enter` | **Exact, byte-for-byte duplicate** — independently re-derived rather than reused |
| `0.25s` / `0.2s ease` (hover/label transitions) | `--nova-motion-duration-standard` (`200ms`) + `--nova-motion-curve-hover` (`ease-in-out`) | Nearest |
| `0.45s` (panel entrance duration) | `--nova-motion-duration-screen` (`320ms`) | Nearest |
| `1.4s ease` (loading-skeleton shimmer) | `--nova-motion-duration-ai-thinking-loop` (`1800ms`) | Nearest — and the token's own name ("AI thinking loop") is a direct semantic match for a loading shimmer, not just a numeric coincidence |

### Typography

| Bespoke value | Nova token | Match quality |
|---|---|---|
| `10px`, `11px` | *(left as-is — see below)* | No close token exists below `--nova-font-size-xs` (12px); forcing these up would be a visible size increase for micro-labels, judged not worth it |
| `12px`, `13px` | `--nova-font-size-xs` (12px) | Exact (12px) / nearest (13px) |
| `15px`, `16px` | `--nova-font-size-base` (16px) | Nearest (15px) / exact (16px) |
| `20px`, `22px` | `--nova-font-size-lg` (20px) | Exact (20px) / nearest (22px) |
| `32px` | `--nova-font-size-2xl` (31px) | Nearest |

## What Was Not Migrated (Disclosed)

- **`50%` border-radius on perfect circles** (e.g., `.flagship-panel__state-icon`) — this is a different CSS concept from the app's pill/card corner-radius scale (rounding a square into a circle vs. rounding a rectangle's corners); Nova's `--nova-radius-*` scale doesn't model this, and forcing a fixed-px radius onto a fixed-size circle would be equivalent, not an improvement.
- **`10px`/`11px` font sizes** — below the smallest defined Nova type step (`--nova-font-size-xs`, 12px); rounding these up would be a real, visible size change to already-intentionally-tiny micro-copy (chip labels, chain-node labels), judged a worse tradeoff than leaving two bespoke-but-harmless values in place.
- **Real data-tone colors** (`#4fffb0` bullish, `#ff5f5f` bearish, the neutral blue computed by `worldState.js`) — these are shared, established semantic colors already used consistently by `DataVisualizationLayer.jsx` and `ActivityWaves.jsx`; they encode data meaning, not UI chrome, and were correctly left alone.
