# Typography System (Phase X12B — Part 3)

## What it is

The real implementation of the three-family type system the mission names, unified with `DESIGN_TOKENS.md`'s type scale — every size/weight/family value is a token, nothing hardcoded.

## Files

- `frontend/index.html` — real font loading via a Google Fonts `<link>` (Space Grotesk 500–800, Inter 400–700, JetBrains Mono 400–500), additive: `styles.css`'s existing `font-family: Inter, Arial, sans-serif` `:root` fallback is untouched, so no existing screen changes appearance from font loading alone.
- `frontend/src/styles/typography.css` — utility classes and the eyebrow/H1/subtext hierarchy roles, consuming `tokens.css` only.

## The three families

| Family | Token | Use |
|---|---|---|
| **Space Grotesk** | `--nova-font-family-display` | Screen H1s, the numeric-hero figure, the splash wordmark |
| **Inter** | `--nova-font-family-ui` / `--nova-font-family-numeric` | UI chrome, body copy, and (with `font-variant-numeric: tabular-nums`) all numeric display — a disciplined *numeric mode* of the same face, not a second physical typeface, per `NOVA_DESIGN_BIBLE.md` §5's explicit rule |
| **JetBrains Mono** | `--nova-font-family-mono` | Tickers, methodology-version strings, raw IDs — structural/data, never prose |

## Unified scale

Nine steps (`xs` through `numeric-hero`), each a paired `font-size`/`line-height` token — see `DESIGN_TOKENS.md`'s Typography table for the literal values. Five weights (400/500/600/700/800), with 800 reserved exclusively for the splash wordmark per the Bible's own rule.

## Hierarchy roles

`typography.css` composes the scale into three ready-to-use role classes, so a screen applies one class per role instead of re-deriving the eyebrow → H1 → subtext stack every time:

- `.nova-heading-eyebrow` — `text-xs`, uppercase, `+6%` tracking, `text-tertiary` color
- `.nova-heading-h1` — `text-2xl`, Space Grotesk, bold, `text-primary`
- `.nova-heading-subtext` — `text-base`, Inter, regular, `text-secondary`

## Tests

Not independently unit-tested (a CSS/font-loading concern, not a computable one) — verified by the full frontend suite passing with the new stylesheet imports in place (zero regressions, since nothing yet references these classes).
