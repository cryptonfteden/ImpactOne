# Legacy Style Inventory — FINAL-UI-UNIFICATION-001

Every legacy value checked this phase, whether migrated or not — continuing `LEGACY_UI_REMAINING.md`'s inventory from `NOVA-MIGRATION-001` with the spacing/shadow property types that phase didn't cover.

## Spacing

| Legacy variable | Value | Nearest Nova token | Nova value | Exact match? | Action |
|---|---|---|---|---|---|
| `--h3-space-1` | `6px` | `--nova-space-1` | `4px` | No | Left as literal |
| `--h3-space-2` | `12px` | `--nova-space-3` | `12px` | **Yes** | **Aliased** |
| `--h3-space-3` | `20px` | `--nova-space-4` | `16px` | No | Left as literal |
| `--h3-space-4` | `32px` | `--nova-space-8` | `32px` | **Yes** | **Aliased** |

## Radius

| Legacy variable | Value | Nearest Nova token | Nova value | Exact match? | Action |
|---|---|---|---|---|---|
| `--h3-radius-sm` | `10px` | `--nova-radius-sm` | `4px` | No | Left as literal |
| `--h3-radius-md` | `16px` | `--nova-radius-md` | `8px` | No | Left as literal |
| `--h3-radius-lg` | `22px` | `--nova-radius-lg` | `12px` | No | Left as literal |
| `.hero-panel`/`.hero-panel--featured` inline `border-radius: 20px` | `20px` | `--nova-radius-lg` | `12px` | No | Left as literal |

## Shadow

| Legacy rule | Value | Nearest Nova token | Nova value | Exact match? | Action |
|---|---|---|---|---|---|
| `.glass-card, .panel-card, .kpi-card, .screen-card` box-shadow | `0 16px 42px rgba(0, 0, 0, 0.3)` | `--nova-shadow-glass` | `0 16px 42px rgba(0, 0, 0, 0.3)` | **Yes** | **Aliased** |
| (dead) earlier `.glass-card` box-shadow | `0 20px 45px rgba(2, 6, 23, 0.28)` | — | — | N/A (dead code) | **Removed** |
| `--h3-glow` / `--h3-glow-strong` (multi-layer) | `0 0 0 1px rgba(111, 182, 255, 0.14), 0 8px 32px rgba(6, 10, 20, 0.55), 0 0 28px rgba(95, 160, 255, 0.06)` | `--nova-glow-focus` | `0 0 0 4px rgba(111, 182, 255, 0.28)` | No — different structure/spread entirely, not just a different number | Left as literal |

## Blur

| Legacy usage | Value | Nearest Nova token | Nova value | Exact match? | Action |
|---|---|---|---|---|---|
| Shared card `backdrop-filter` | `blur(14px)` | `--nova-blur-glass` | `24px` | No | Left as literal |
| `.header-bar` sticky header | `blur(14px)` | `--nova-blur-glass` | `24px` | No (also a different component, not the card pattern) | Left as literal |
| `.onboarding-card` | `blur(14px)` | `--nova-blur-glass` | `24px` | No (also a different, self-contained component) | Left as literal |

## Dead Code Found

`.glass-card` was declared twice in `frontend/src/styles.css` with two genuinely different sets of literal values. Confirmed via CSS cascade analysis (identical specificity, later source order wins) that the first declaration was **100% unreachable** — every property it set was also set by the second, later declaration, so it had contributed nothing to any real rendered page since the second rule was added. Removed as a real, verified-safe simplification (`FINAL_UI_UNIFICATION.md` has the full detail).

## Running Totals (Cumulative Across `NOVA-MIGRATION-001` + This Phase)

| Category | Exact-match aliases made | Non-matches left as literal (disclosed) | Dead code removed |
|---|---|---|---|
| Color | 3 (`--accent`, `--h3-accent`, `--h3-accent-strong`) | 11 | 0 |
| Spacing | 2 (`--h3-space-2`, `--h3-space-4`) | 2 | 0 |
| Radius | 0 | 4 | 0 |
| Shadow | 1 (shared card box-shadow) | 2 | 1 rule (2 properties' worth) |
| Blur | 0 | 3 | 0 |
