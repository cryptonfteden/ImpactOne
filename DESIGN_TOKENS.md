# Design Tokens (Phase X12B — Part 1)

## What it is

The literal implementation of `NOVA_DESIGN_BIBLE.md` §16, as real CSS custom properties. Every color, surface, elevation, blur, radius, border, glow, shadow, opacity, typography, motion, spacing, z-index, and breakpoint value in the NOVA system is a token here — nothing hardcoded.

## File

`frontend/src/styles/tokens.css` — imported (additively) in `frontend/src/main.jsx`. No existing screen references any `--nova-*` token yet (no redesign this phase); this file exists so future component work has one real source of truth instead of a new hardcoded hex value.

## Token schema version: 1.1.0

Version 1.0.0 was the Bible's original, unreviewed §16 table. **`X12B_VERDICT.md`'s parallel design review (`TOKEN_REVIEW.md`) found real, computed defects in it before any component consumed it** — this implementation is v1.1.0, the corrected version, per that review's required fixes:

### 1. Primitive + semantic two-layer architecture

`TOKEN_REVIEW.md` finding #2: the original table conflated primitives (raw values) and semantics (theme-dependent roles) in one flat layer, named after literal palette position (`surface.800`) rather than role — which structurally blocks "themes evolve without rewriting components." Fixed:

- **Primitive layer** (`--nova-primitive-*`) — raw, theme-independent values. Never referenced by components directly.
- **Semantic layer** (`--nova-color-*`, `--nova-surface-*`) — theme-dependent roles that point to a primitive, re-pointed per `data-theme` in `theme.css`. **This is the only layer components should ever reference.**

### 2. Fixed a real WCAG AA contrast failure

`TOKEN_REVIEW.md` finding #3 computed real WCAG contrast ratios (not eyeballed) and found the original `color.text.tertiary` (`#6B7488`) failed 4.5:1 against every real dark surface (4.12:1 / 3.89:1 / 3.46:1 against `space-900`/`surface-800`/`surface-700`).

| Token | Old value | Old contrast (worst case, `surface-700`) | New value | New contrast (worst case) |
|---|---|---|---|---|
| `--nova-color-text-tertiary` | `#6B7488` | 3.46:1 ❌ | `#8894AA` | 5.31:1 ✅ |

Verified by a real, reusable, tested contrast-checker (`frontend/src/utils/contrast.js` + `contrast.test.js`) — addressing `TOKEN_REVIEW.md`'s further note that "no tooling exists anywhere in this codebase to enforce contrast." Any future token addition can now be checked by a test, not by eye.

### 3. Reconciled the brand accent against the real, shipped codebase

`TOKEN_REVIEW.md` finding #1: the Bible's originally-proposed Signal Blue (`#3B82F6`) was a fourth, unreconciled accent-blue value — three real, already-shipped values (`frontend/src/styles.css`'s `--accent`/`--h3-accent`, `frontend/src/context/theme.js`'s `accent`) already agree on `#6fb6ff`. **Decision, recorded here explicitly per the review's requirement:** NOVA's `--nova-primitive-blue-300` is set to the real, shipped `#6fb6ff` — not a silent rebrand, a deliberate reconciliation.

### 4. Real light-mode values

`TOKEN_REVIEW.md` finding #5: §4 claimed light mode was "a real, fully-designed second citizen" while §16 had zero light-mode values — a direct contradiction. Fixed: `theme.css`'s `[data-theme="light"]` block has real, contrast-verified values for every semantic token (see `THEME_ENGINE.md`).

### 5. Added `--nova-color-brand-amber`

`TOKEN_REVIEW.md` finding #4: `accent-amber` and `semantic.warning` were the same hex with no reachable non-semantic alias. Fixed: `--nova-color-brand-amber` now exists as its own semantic token, separate from `--nova-color-warning` (same value today, independently overridable per theme later).

### 6. `prefers-reduced-transparency`

`TOKEN_REVIEW.md` finding #7: added alongside the existing `prefers-reduced-motion` coverage — both force glass surfaces to opaque (`theme.css`).

## Governance

This file's header comment carries the changelog (the "no versioning plan" gap `TOKEN_REVIEW.md` finding #6 named). Any future token value change must: (1) bump the version number in the header comment, (2) add a dated changelog entry explaining what changed and why, (3) update this document's corresponding table. No token is ever silently redefined.

## Categories implemented

Color (primitive + semantic), Surface, Elevation, Blur, Radius, Borders, Glow, Shadows, Opacity, Typography (family/weight/size/line-height/tracking), Motion (duration/curve), Spacing (strict 8px scale), Z-index, Breakpoints — all 14 categories the mission requires, in one file.
