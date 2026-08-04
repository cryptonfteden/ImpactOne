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

---

## Addendum (Phase IMPACTONE-VISUAL-DIRECTION-001) — proposed `--orbit-*` layer, not yet implemented

**Nothing above this line was changed by this addendum.** Every real NOVA token described above remains exactly as `X12B` left it, still the only design tokens actually wired into `frontend/src/main.jsx` today. What follows is a **new, clearly-separated, proposed token namespace** for the "Orbit" cinematic direction detailed in [IMPACTONE_DESIGN_SYSTEM.md](IMPACTONE_DESIGN_SYSTEM.md), [VISUAL_LANGUAGE.md](VISUAL_LANGUAGE.md), [3D_EXPERIENCE_GUIDELINES.md](3D_EXPERIENCE_GUIDELINES.md), [UI_COMPONENT_LIBRARY.md](UI_COMPONENT_LIBRARY.md), and [MOTION_SYSTEM.md](MOTION_SYSTEM.md). These values exist only in this document — no `--orbit-*` custom property exists in `tokens.css` today, and none should be added without an explicit decision to actually build toward this direction.

### Why a separate namespace, not an extension of `--nova-*`

The Orbit direction's own color/material/motion values are frequently incompatible with NOVA's existing semantic roles (e.g., NOVA's restrained glass-Level-3-only rule vs. Orbit's more liberal translucency). Reusing `--nova-*` names for values that mean something different would silently corrupt the existing, real, contrast-verified system. A new `--orbit-*` namespace keeps both directions independently valid and comparable side by side.

### Color

| Token | Value | Rule |
|---|---|---|
| `--orbit-color-void` | `#05060B` | Base environment background. Never used for text. |
| `--orbit-color-energy-purple` | `#8B5CF6` | Ambient/chrome accent only. Never a financial-meaning color. |
| `--orbit-color-energy-blue` | `#6fb6ff` | Same value as NOVA's real `--nova-primitive-blue-300` — deliberately reconciled, not reinvented, per `DESIGN_TOKENS.md`'s own existing reconciliation precedent above. |
| `--orbit-color-positive` | `#34D399` | Reserved exclusively for real, positive market/portfolio facts. Never decorative. |
| `--orbit-color-risk` | `#F87171` | Reserved exclusively for real risk/negative facts. Never decorative. |

### Depth planes (`3D_EXPERIENCE_GUIDELINES.md` §2)

| Token | Meaning |
|---|---|
| `--orbit-depth-focus-scale` | `1.0` (baseline size multiplier) |
| `--orbit-depth-active-scale` | `0.72` |
| `--orbit-depth-ambient-scale` | `0.5` |
| `--orbit-depth-ambient-opacity` | `0.55` |
| `--orbit-depth-horizon-opacity` | `0.3` |

### Motion (`MOTION_SYSTEM.md` timing table, as tokens)

| Token | Value |
|---|---|
| `--orbit-motion-interaction-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--orbit-motion-camera-ease` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--orbit-motion-proximity-duration` | `180ms` |
| `--orbit-motion-focus-duration` | `260ms` |
| `--orbit-motion-camera-adjacent-duration` | `900ms` |
| `--orbit-motion-camera-cross-duration` | `1400ms` |
| `--orbit-motion-alert-onset-duration` | `120ms` |
| `--orbit-motion-alert-fade-duration` | `600ms` |

### Governance for this addendum specifically

Per this file's own existing governance rule above: if any `--orbit-*` token is ever promoted into real `tokens.css`, that change must bump the file's version, add a dated changelog entry, and update this table — the same discipline already applied to every real NOVA token. Until that happens, this whole addendum remains a proposal, not an implementation.
