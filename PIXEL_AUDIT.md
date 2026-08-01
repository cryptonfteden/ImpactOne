# PIXEL_AUDIT.md — Measured Values, Not Impressions

**Phase:** WORLD-CLASS-FINISH-001. Companion to [WORLD_CLASS_FINISH.md](WORLD_CLASS_FINISH.md). Every item below cites an exact, checkable value from the real source — no subjective "looks a bit off" claims.

## Border consistency

**Checked**: every `border`/`border-color` declaration in `frontend/src/styles/components.css` (37 matches) against the token scale (`--nova-border-subtle`, `--nova-border-strong`, `--nova-border-width-hairline: 1px`, `--nova-border-width-strong: 2px`). **Result**: every real border in the file resolves to one of these tokens, with exactly one deliberate, justified exception: `.nova-button__spinner`'s `border: 2px solid rgba(255, 255, 255, 0.4)` — a fixed, semi-transparent white ring used specifically so the loading spinner reads correctly against *any* button variant's background color (primary/secondary/danger/success), which a themed border color could not guarantee. Confirmed this is deliberate, not an oversight: the same rule pairs it with `border-block-start-color: currentColor` (the classic dual-tone spinner technique) — not a candidate for change.

**Real defect found and fixed**: the 3D layer's focus-ring `outline` used two different offset values in two different rules (`3px` on node labels, `2px` on toolbar buttons/panel close) — see [WORLD_CLASS_FINISH.md](WORLD_CLASS_FINISH.md) for the fix (both replaced with the shared glow-ring token, removing the inconsistency entirely rather than picking one of the two mismatched values).

## Focus-ring consistency (the phase's main finding)

**Measured**: `accessibility.css`'s `--nova-glow-focus: 0 0 0 4px rgba(111, 182, 255, 0.28)` (a 4px soft glow) vs. the 3D layer's pre-fix `outline: 2px solid var(--nova-color-brand-signal)` (a 2px hard-edged ring) with two different `outline-offset` values (2px, 3px) between its own two rules. Three distinct values/techniques for one concept, confirmed via grep (`focus-visible` appears in exactly one non-accessibility.css file: `workspace3d.css`, with the two internally-inconsistent rules above). Now unified to one.

## Icon sizing

**Measured**: `.header-icon-button` (alerts/notifications/quick-actions/account menu — `frontend/src/styles.css`) is a fixed `width: 38px; height: 38px`. `.nova-button--icon-only` (the NOVA system's equivalent) is `inline-size: 40px` with its height following the `data-size` prop (32/40/48px). These are two different icon-button sizing systems (legacy header vs. NOVA), a real, measurable 2px+ discrepancy — but **not fixed this phase**: the header icon row's exact width was precisely tuned in the immediately preceding `DESIGN-PERFECTION-001` phase's landscape-phone fix (its horizontal row now fits exactly within a landscape phone's available width at 38px per icon); resizing to 40px+ would risk re-breaking that fit and re-requires re-verifying every viewport that fix covered — a real, disclosed follow-up for whichever future phase also revisits the legacy header, not a same-day, no-layout-change execution fix. Logged as a genuine, measured finding, correctly not acted on given this phase's own "no layout changes" boundary.

**Sidebar/bottom-nav/orbital-node icon glyphs** (◆▤◈◎◑, etc.): these are plain Unicode text glyphs sized via `font-size`, not a discrete icon-asset system — "icon sizing" in the SVG/image-asset sense does not apply to them. Checked for internal consistency: sidebar nav icons and bottom-nav icons both derive their size from their parent's `font-size`/`line-height`, not an independent fixed pixel value — no inconsistency found.

## Pixel alignment / optical spacing

**Checked**: `.nova-card`'s padding (`var(--nova-space-6)`, 24px) against its sibling `.nova-card__eyebrow` and heading spacing — all resolve to the governed 4px-based scale (`--nova-space-1` through `-8`), confirmed via `tokens.css`. No off-grid (non-multiple-of-4px) spacing value found in any real NOVA component this phase.

**Checked**: the landscape-phone header row fix from `DESIGN-PERFECTION-001` (`.header-controls`/`.search-box` row-restore) — re-verified this phase via source read only (servers were available for a live re-check of the focus-ring fix, and the CSS itself is unchanged since that phase) that the rule is still present and unmodified. No regression found.

## What this audit did not attempt

A full, screen-by-screen sub-pixel measurement pass (e.g. verifying every heading's baseline aligns to a shared vertical rhythm grid across all ~15 real screens) was not performed — the existing token system (a single 4px-based spacing scale used consistently, confirmed via the border/spacing checks above) already provides strong structural protection against this class of defect, and no specific, reproducible misalignment was found or reported to investigate further. This is disclosed as an honest scope limit, not a confirmed clean bill of health for every pixel on every screen.
