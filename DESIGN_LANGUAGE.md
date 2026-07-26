# Design Language — Phase X1 (Part 4)

Design-only. Formalizes and extends Phase H3's design system into a permanent, complete specification — token values here are recommendations for a designer to implement in Figma, not CSS (no code in this document).

---

## Typography

**Two-family system**, matching the Product Philosophy's "numbers are the hero" principle:
- **Display/UI face**: a clean, high-legibility grotesque (current product uses Inter — retained as the baseline; a designer may propose a closer "technical" alternative such as a geometric sans with a slightly narrower default width, but must preserve Inter's legibility at small sizes).
- **Numeric/data face**: a monospaced or tabular-figure-capable face for every price, percentage, score, and table column — ensures columns of digits always align. Reserved for numbers only, never full sentences (a full paragraph in monospace reads as a terminal, not a product).

**Scale** (rem, desktop baseline; mobile scales down one step at the two smallest sizes only):
| Role | Size | Weight | Tracking |
|---|---|---|---|
| Hero number (Today's headline, Portfolio's total value) | 2.5rem | 700 | -0.01em |
| Screen title (h1) | 1.75rem | 700 | -0.01em |
| Card title (h3) | 1.1rem | 600 | normal |
| Eyebrow/label | 0.75rem | 700 | 0.22em, uppercase |
| Body | 0.95rem | 400 | normal |
| Body subtle/secondary | 0.875rem | 400 | normal |
| Caption/meta | 0.75rem | 400 | normal |

Every numeric value at Body size or larger uses tabular figures without exception.

## Spacing

An 8-point base scale — every margin, padding, and gap is a multiple of 4px, with 8px as the practical minimum:
`4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64` (px). Card internal padding: 20–24px. Gap between stacked cards: 20px. Gap between grid cards: 20–24px. Screen-edge margin: 24px desktop, 16px mobile.

## Grid

- **Desktop**: 12-column grid, max content width 1440px, centered. Reading-focused screens (Markets, AI) cap their column at ~720px regardless of viewport, per the philosophy's restraint principle. Dashboard-shaped screens (Today, Portfolio, Workspaces) use the full 12-column width.
- **Mobile**: single-column, 16px edge margins, no grid subdivisions below 600px viewport width.
- **Breakpoints**: mobile <600px, tablet 600–900px (single-column content, but nav may show as a rail rather than bottom bar depending on orientation), desktop ≥900px.

## Color Palette

Extends Phase H3's tokens; formalized as the permanent system, not a one-off reskin.

| Role | Token name | Value | Notes |
|---|---|---|---|
| Page base | `void` | near-black, `#05070d` | Never pure `#000` — retains a hint of blue |
| Surface | `surface` / `surface-raised` | `#0a0f1c` / `#0e1526` | Card and nav backgrounds |
| Glass border | `border` / `border-strong` | translucent blue, 16%/32% opacity | Default vs. hover/active |
| Text primary | `text-primary` | near-white, `#e9edf7` | |
| Text secondary | `text-secondary` | muted blue-gray, `#93a1c2` | |
| Text tertiary | `text-tertiary` | dim blue-gray, `#56618a` | Labels, captions |
| Accent | `accent` / `accent-strong` | `#6fb6ff` / `#4f9dff` | Brand, active states, primary buttons — never used for semantic status |
| Positive | `positive` | `#34d399` | Gains, opportunity, triggered-good |
| Negative | `negative` | `#f87171` | Losses, risk |
| Warning | `warning` | `#fbbf24` | Monitor/neutral-caution |

**Rule, not a suggestion**: accent color and semantic status color are never the same hue family. A user must never wonder "is this blue because it's important, or because something went up?"

## Icons

A single, consistent icon language — geometric, single-weight line icons (or the existing restrained glyph/symbol set already in use — ◆ ▤ ◈ ◎ ◑ — extended consistently rather than mixed with a different icon library). No filled/outline inconsistency within one screen. Icon size scale: 16px (inline, inside text), 20px (nav items), 24px (card headers/standalone actions).

## Cards

The single most-used surface in the product. Glass treatment: layered gradient fill, 1px hairline border, soft layered shadow (never a hard drop shadow), backdrop blur. Corner radius 20–22px for primary cards, 10–14px for nested/smaller elements (pills, chips, table-row containers). Hover (desktop only): border brightens, no scale/lift beyond a 1–2px translate — never bouncy.

## Buttons

- **Primary**: filled gradient (accent), used once or twice per screen maximum — reserved for the screen's one real primary action (per each blueprint's "Primary CTA").
- **Ghost/secondary**: near-transparent, hairline border, used for everything else. The visual ratio of ghost-to-primary buttons on any screen should be at least 4:1 — if a screen has more than one or two filled buttons competing for attention, that's a hierarchy failure.
- **Destructive**: same ghost treatment but text/icon in the negative-status color, always confirm-gated (a second step, never a single accidental tap away).

## Forms

Dark glass input fields, accent-tinted focus ring (never a hard default browser outline). Labels above fields (never placeholder-as-label — placeholders disappear on input, losing context). Error text appears directly below its field, in the negative color, specific ("Enter a whole number of shares," never "Invalid input").

## Charts

Explicitly permitted and recommended where they don't exist today (a real, historically-flagged gap — see `UX_REDESIGN_AUDIT.md`): a portfolio-value-over-time line, per-position price sparklines, and a simple bar/column treatment for allocation breakdowns. Chart style: minimal gridlines (or none — rely on axis labels), the accent color for the primary series, semantic colors only where the data itself is semantically positive/negative (e.g., a return line that's currently negative may render in the negative color). No 3D, no unnecessary legends when a single series is obviously labeled by its card title.

## Tables (only where absolutely necessary)

Per the mission's explicit constraint, tables are the *fallback*, not the default — used only for genuinely tabular data with more than ~4 comparable rows and columns where a card-based layout would be strictly worse (e.g., a trade history log, a positions ledger). Header row: small, uppercase, muted, wide-tracked — visually recessive so data reads first. All numeric columns tabular and right-aligned. Row hover: faint accent tint, no border color change (avoid visual noise on dense tables).

## Animation Language

Formalizes the Motion Philosophy from Part 1:
- **Duration**: 150–250ms for micro-interactions (button press, hover), 300–400ms for screen/pillar transitions, up to 600ms for a genuinely significant reveal (the AI committee-streaming Wow Moment).
- **Easing**: ease-out for anything entering/appearing, ease-in-out for anything transitioning in place (a number counting up). Never a bounce/elastic easing — reads as playful/game-like, against the professional-not-casino constraint.
- **Numbers**: always tween from old to new value over ~400–600ms when they update live, never a hard cut.
- **Reduced motion**: every animation in this spec must have a static, instant equivalent for users with reduced-motion preferences — no exceptions, including the committee-streaming moment (which degrades to the full synthesized answer appearing at once).

## Glass Effects

Restrained, per the philosophy's "quiet by default" rule: background blur in the 14–20px range, translucency in the 60–75% range (never so transparent that text behind a card becomes distracting, never so opaque it stops reading as glass at all). Glass is reserved for elevated surfaces (cards, modals, the notification panel, nav) — never applied to body text containers or full-page backgrounds, which stay solid.

## Elevation

Three levels only, kept simple and predictable:
1. **Base** — page background, no shadow.
2. **Raised** — cards, nav (the default elevated surface) — soft, layered shadow + hairline border.
3. **Overlay** — modals, notification panel, dropdowns — raised shadow plus a dimmed/blurred backdrop behind it, always dismissible by tapping outside or a clear close action.

No fourth level — a product with five distinguishable shadow depths reads as visually noisy, not sophisticated.

## Accessibility

Non-negotiable baseline, addressing the real gap `UX_REDESIGN_AUDIT.md`'s predecessor (Phase E1) found:
- Minimum contrast ratio 4.5:1 for body text, 3:1 for large text/UI components, checked against the actual dark palette above (not assumed).
- Every interactive element has a visible focus state (accent-tinted ring, already established in H3) — never removed for aesthetic reasons.
- Every icon-only button has a real accessible label (not just a `title` attribute) — the existing product has partial coverage here; this must become universal.
- Color is never the sole signal — every status pill pairs color with a text label or icon (already true for status pills; must extend to any new chart/indicator work).
- All interactive targets minimum 44×44px on touch surfaces, regardless of how compact the visual treatment looks.
