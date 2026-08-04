# UI Standardization — WORLD-CLASS-UI-001

The resulting rules from this phase's token migration, and what a future pass should still cover. Complements `DESIGN_AUDIT.md` (findings) and `VISUAL_CONSISTENCY.md` (before/after diff).

## The Rule Going Forward

Any new CSS written for the 3D Workspace/Flagship screens (or any other future screen) should reach for a Nova token first, and only fall back to a literal value when:

1. **The value encodes real data meaning**, not UI chrome (e.g., bullish/bearish/neutral tone colors, computed by `worldState.js` and shared with `DataVisualizationLayer.jsx`). These are a different category from "what color is this button" — swapping them for a UI token would blur data semantics into presentation styling, the opposite of clarity.
2. **No token exists at the needed granularity and forcing one would visibly change intentional micro-copy sizing** (e.g., the `10px`/`11px` chip/chain labels — see `DESIGN_AUDIT.md`'s disclosed exceptions).
3. **The CSS concept itself doesn't map onto the token's own concept** (e.g., `border-radius: 50%` for a perfect circle is not the same thing as Nova's pill/card corner-radius scale).

Everything else — spacing, corner radius, glass blur, shadow base layer, motion duration/easing, and primary/secondary/tertiary text color — should reference the shared token, exactly as this phase's migration now does in both touched files.

## Why This Reduces Real Maintenance Risk, Not Just "Looks More Consistent"

Before this phase, a future design-system-wide change (e.g., "make the brand accent slightly warmer," a real, plausible future request) would have needed to be applied in at least two places: `tokens.css`'s `--nova-color-brand-signal`, and every literal `#4f8cff` scattered through `workspace3d.css`/`flagshipScreen.css` — with a real risk of missing one, or of the two drifting further apart over time (exactly what had already started happening: `#4f8cff` vs. `#6fb6ff` are close enough to look "roughly the same brand" at a glance but are two different literal colors). After this phase, that same future change only requires editing `tokens.css` once, and both the 3D screens and the rest of the app update together.

## Standardized Categories (Summary)

| Category | Standard |
|---|---|
| Corner radius | `--nova-radius-sm` (4px) / `-md` (8px) / `-lg` (12px) / `-full` (pill) — no other radius value in new code |
| Spacing | `--nova-space-1` through `-24` — no arbitrary px spacing in new code |
| Glass blur | `--nova-blur-glass` (24px) for any true glassmorphism surface |
| Shadow (glass surfaces) | `--nova-shadow-glass` as the base/outer layer; additional layered shadows for extra depth are fine, but the base layer must be the shared token |
| Motion duration | `--nova-motion-duration-micro/standard/screen/ai-thinking-loop` — no arbitrary `0.2s`/`0.45s`/etc. |
| Motion easing | `--nova-motion-curve-enter/exit/hover` — never re-derive a cubic-bezier that already exists as a token |
| Text color | `--nova-color-text-primary/secondary/tertiary` for any non-data-semantic text |
| Accent/interactive color | `--nova-color-brand-signal` / `--nova-glow-focus` — the one real brand blue, never a second bespoke one |

## What a Future, More Exhaustive Pass Should Still Cover

Per this phase's own Honest Scope Statement (`WORLD_CLASS_UI.md`):

1. **The legacy `frontend/src/styles.css` file** (thousands of lines, several visual eras, predates Nova) was not migrated to tokens this phase. It almost certainly contains its own additional bespoke spacing/radius/color values duplicating what Nova now provides — a real, larger, separate undertaking, given the file's size and the number of screens that depend on its exact current values.
2. **A systematic scan of every other feature directory's own CSS files** (outside `workspace3d`/`flagshipScreen`) for the same class of bespoke-value-vs-token duplication found here — this phase's scope was deliberately the newest, most recently confirmed-inconsistent code, not a repo-wide sweep.
3. **A real, visual (not just code-level) review** of the migrated screens in an actual browser, to confirm the token substitutions read exactly as intended — no headless-browser/WebGL tool was available in this environment to do this directly (same disclosed limitation as every prior 3D-phase report in this line).

None of the above are known defects — they are disclosed as unreviewed within this phase's time-boxed scope, exactly as `APPLE-QUALITY-001`'s own equivalent section disclosed its own remaining scope.
