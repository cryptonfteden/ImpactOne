# Layout Foundation (Phase X12B — Part 4)

## What it is

Seven reusable layout primitives — `Page`, `Section`, `Container`, `Grid`, `Stack`, `Spacer`, `Panel` — every one consuming `DESIGN_TOKENS.md`'s tokens exclusively, and every one using **logical CSS properties** (`margin-inline`, `padding-inline`, `inset-inline-*`) so the entire layout system mirrors correctly under `dir="rtl"` with zero component-level RTL patches (Part 8).

## Files

- `frontend/src/styles/layout.css` — the CSS implementation.
- `frontend/src/components/layout/{Page,Section,Container,Grid,Stack,Spacer,Panel}.jsx` + `index.js` — the React components.
- `frontend/src/components/layout/layoutPrimitives.test.jsx` — 12 tests.

## The seven primitives

| Primitive | Purpose |
|---|---|
| `Page` | Outermost layout primitive — sets the base surface/text-color pair (`--nova-surface-base`, `--nova-color-text-primary`) for a full screen |
| `Section` | A major page section — the 48px between-sections rhythm from `NOVA_DESIGN_BIBLE.md` §6, applied once, never a one-off margin per screen. Accepts an `as` prop (defaults to `<section>`) |
| `Container` | Centers content, caps width at 1440px, real responsive inline padding (32px desktop / 24px tablet / 16px mobile) |
| `Grid` | The 12/8/4-column responsive grid (desktop/tablet/mobile) — implemented once so no screen redefines its own column count |
| `Stack` | The one reusable flex-with-gap primitive. `direction`/`align`/`justify`/`wrap` are data-attributes; `gap` is always a real spacing token (never a raw px number) |
| `Spacer` | An explicit, token-driven gap for the rare case a `Stack`'s uniform gap isn't the right shape. Renders no content — `aria-hidden`, so it can never be mistaken for real content in the accessibility tree |
| `Panel` | The base surface every future card/modal/drawer body composes from. `elevation` prop: `"0"` (transparent), `"1"` (default — a normal card), `"2"` (elevated/modal), or `"glass"` (Part 6 — opt-in only, never the default) |

## Responsive breakpoints

Desktop ≥1280px (12 columns, 24px gutter), Tablet 768–1279px (8 columns, 20px gutter), Mobile <768px (4 columns, 16px gutter) — matching `NOVA_DESIGN_BIBLE.md` §6 exactly. `tokens.css`'s `--nova-breakpoint-*` custom properties are the documented source of truth; `layout.css`'s `@media` conditions necessarily duplicate the literal pixel values (a CSS media-query condition cannot consume a custom property) and must be kept in sync manually — noted directly in `layout.css`'s header comment as a known, disclosed duplication.

## No redesign

None of the seven primitives are used by any existing screen yet — importing them changes zero rendered pixels for the current product. They exist so the future screen-redesign roadmap (`NOVA_DESIGN_BIBLE.md` §18) has real, tested building blocks instead of starting from scratch.

## Tests

`layoutPrimitives.test.jsx` — 12 tests: every primitive renders its expected class/element, `Section`'s `as` override, `Stack`'s full data-attribute contract (direction/align/justify/wrap/gap) and its defaults, `Spacer`'s vertical/horizontal axis and `aria-hidden`, and `Panel`'s default-to-elevation-1 / explicit-glass-opt-in / invalid-value-fallback behavior.
