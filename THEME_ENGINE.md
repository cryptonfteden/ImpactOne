# Theme Engine (Phase X12B — Part 2)

## What it is

A global theme architecture supporting NOVA Dark (default), Light, High Contrast, and an independent Reduced Motion axis — switchable with **zero component rewrites**, because every component that will ever consume it reads only the semantic token layer (`DESIGN_TOKENS.md`), never a literal color.

## The resolution mechanism (named explicitly, per `TOKEN_REVIEW.md` finding #5)

CSS custom properties, re-pointed per a `data-theme` attribute on `<html>`:

- **CSS half:** `frontend/src/styles/theme.css` — one block per theme (`:root`/`[data-theme="dark"]`, `[data-theme="light"]`, `[data-theme="high-contrast"]`), each redefining `tokens.css`'s semantic layer only.
- **JS half:** `frontend/src/context/ThemeProvider.jsx` — a React context (`useTheme()`) that manages *which* theme/motion-preference is active, persists the choice, and sets `data-theme`/`data-motion` on `<html>`. It never renders a styled pixel itself.

## Four supported states

| State | Attribute | Default trigger |
|---|---|---|
| NOVA Dark | `data-theme="dark"` | Default; also the OS `prefers-color-scheme: dark` outcome |
| Light | `data-theme="light"` | OS `prefers-color-scheme: light`, or explicit user choice |
| High Contrast | `data-theme="high-contrast"` | OS `forced-colors: active` (Windows High Contrast Mode), or explicit user choice — checked with higher priority than light/dark, since a user who has turned on OS-level forced colors is making the strongest possible signal |
| Reduced Motion | `data-motion="reduced"` (separate axis) | OS `prefers-reduced-motion: reduce`, or explicit in-app override |

Reduced Motion is **not** folded into the theme enum — a user can want Light + Reduced Motion, or Dark + Reduced Motion, so it is a fully independent `data-motion` attribute, consumed by `motion.css`/`motion.js` (see `MOTION_FOUNDATION.md`).

## Light mode is now real (`TOKEN_REVIEW.md` finding #5)

Every semantic token has a real, contrast-verified light-mode value in `theme.css`'s `[data-theme="light"]` block — including a **theme-appropriate brand-signal**: the shipped `#6fb6ff` accent computes only 2.14:1 against white (fails AA badly as text/icon color), so light mode re-points `--nova-color-brand-signal` to `#1660c7` — the same brand hue family, a darker lightness value, chosen because it clears 5.95:1 on white. This is the theme engine doing its actual job: one brand hue, theme-appropriate lightness, zero component changes.

## High Contrast

A dark-based variant that widens every contrast margin well past AA (near-black surfaces, pure-white strong borders, lightened brand-signal `#8fc7ff`). Also **unconditionally disables glass translucency** (`--nova-opacity-glass-surface: 1`, `--nova-blur-glass: 0px`) — translucency actively fights this theme's purpose.

## `prefers-reduced-transparency` (`TOKEN_REVIEW.md` finding #7)

A dedicated `@media (prefers-reduced-transparency: reduce)` block forces every theme's glass tokens to opaque — the standard accessibility hook `TOKEN_REVIEW.md` flagged as missing from an otherwise glass-leaning system.

## No flash of the wrong theme

Before `ThemeProvider` hydrates on first paint, a `@media (prefers-color-scheme: light) { :root:not([data-theme]) { ... } }` block in `theme.css` provides the same light values directly — so a light-OS user never sees a flash of dark before React mounts.

## Wiring

`frontend/src/context/AppProviders.jsx` now wraps children in `ThemeProvider` (inside `I18nProvider`) — additive; `ThemeProvider` only sets attributes on `<html>` that no existing screen reads yet, so this changes zero rendered pixels for any current screen.

## Tests

`frontend/src/context/ThemeProvider.test.jsx` — 8 tests: throws outside a provider, real OS-default detection (including `forced-colors` priority), all three themes exposed, real theme switching reflected onto `<html>`, invalid theme names rejected, persistence across remounts, and the independent motion-preference axis.
