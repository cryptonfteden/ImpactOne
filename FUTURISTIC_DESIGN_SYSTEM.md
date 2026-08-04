# Futuristic Design System — Phase H3

Implemented as a cascading token/component layer in `frontend/src/styles.css` (appended block, "Phase H3 — Futuristic Design System") — every existing screen inherits it automatically since `Card`/`Button`/`SectionCard` are thin, class-driven wrappers with no per-screen styling logic. Direction: premium dark AI command center — restrained glass, real hierarchy, professional rather than gaming/crypto-casino.

## Layout Grid & Spacing

- Existing `screen-grid`/`kpi-grid`/`portfolio-grid` CSS grid layouts unchanged (already sound) — this phase adds a new `folder-grid` (`repeat(auto-fill, minmax(260px, 1fr))`) for Watchlist Folders, matching the same responsive-card pattern.
- New spacing scale (`--h3-space-1` through `--h3-space-4`: 6/12/20/32px) used consistently across every new H3 component (folders, alerts, notifications, modals) instead of ad hoc pixel values.

## Typography

- Headings (`.screen-hero h1`, `.onboarding-title`, `.welcome-card h2`) gain real weight (700) and tight tracking (-0.01em) with `text-wrap: balance`, separating them clearly from body copy for the first time.
- `.eyebrow` labels gain heavier weight + wider tracking (0.22em) — the small-caps "section label" language now reads distinctly as a system-level label, not just smaller text.
- All numeric data (portfolio metrics, KPI values, header portfolio glance, recommendation score, table cells, feed stats, alert prices) now renders with `font-variant-numeric: tabular-nums` — every column of digits aligns, the single highest-leverage "data terminal" cue.
- New `--h3-font-mono` token (system monospace stack) applied specifically to live prices in the new alert rows — a deliberate, restrained nod to a trading-terminal aesthetic without going full monospace everywhere (which would hurt readability of prose).

## Color System

| Token | Value | Use |
|---|---|---|
| `--h3-void` | `#05070d` | Page background base |
| `--h3-surface` / `--h3-surface-raised` | `#0a0f1c` / `#0e1526` | Sidebar gradient |
| `--h3-glass-bg` | layered rgba gradient | Card surfaces |
| `--h3-border` / `--h3-border-strong` | rgba blue, 16%/32% | Default vs. hover/active card & input borders |
| `--h3-accent` / `--h3-accent-strong` | `#6fb6ff` / `#4f9dff` | Primary brand accent (kept compatible with the pre-existing `--accent`) |
| `--h3-cyan` | `#5eead4` | Reserved secondary confidence accent |
| `--h3-positive` / `--h3-negative` / `--h3-warning` | green/red/amber | Semantic status only — never used as the brand accent, so a REDUCE pill and a "you are here" nav glow never compete for the same visual meaning |

Body background gains two very low-opacity radial gradients (blue top-left, cyan top-right) — the only "glow" applied at the page level, restrained deliberately per the mission's "not gaming or crypto-casino" constraint (no saturated neon, no animated background).

## Cards

`.panel-card` (and by extension every `SectionCard`, plus the new folder/notification/modal cards) now shares one glass treatment: layered gradient background, 1px hairline border, `blur(18px)`, and a compound shadow (`--h3-glow`) combining a hairline ring, a soft drop shadow, and a barely-there accent bloom — restrained, not a heavy neon border. Hover strengthens the border only, no color/scale gimmick.

## Navigation

- **Sidebar**: gradient surface (raised → base), active link gets a real "you are here" treatment — a left-edge accent bar (`inset 3px 0 0 accent`) plus a soft accent-tinted background, not just a color swap.
- **Bottom nav**: glass surface (`blur(20px)`) with an accent-glow drop-shadow on the active icon specifically — mobile's primary nav now visually matches the desktop sidebar's "current location" language.
- **Header**: same glass treatment, given a subtle border-bottom to separate it from content.

## Buttons

- `.primary-action`: gradient fill + a real glow (ring + colored shadow), lifts 2px on hover with a strengthened glow — the single most "alive" interactive element, reserved for genuinely primary actions (Create folder, Create alert, Continue).
- `.ghost-button`: near-invisible at rest, gains a hairline border and faint accent tint on hover — used everywhere else (secondary actions, table row actions) so the primary action always visually wins.
- Disabled state (used by in-flight submit buttons) drops opacity and removes the hover lift entirely, so "this is currently doing something" is unambiguous.

## Inputs

Dark glass fields with a 3px accent-tinted focus ring (`box-shadow`, not an ugly default outline) — applied globally to `input`/`select`/`textarea`, so every form across the whole app (onboarding, folders, alerts, settings) gained this consistently for free.

## Tables

`.watchlist-table` headers: smaller, uppercase, wide-tracked, muted — a real visual demotion versus body data (headers should recede, data should read). Row hover gets a faint accent tint. Combined with tabular-nums, this is the biggest single density-without-clutter win — dense tables (positions, trades) now scan far more easily.

## Modals

New `.h3-modal-overlay`/`.h3-modal-card` — reuses Phase E2's `WelcomeOverlay` pattern (centered glass card over a dimmed, blurred backdrop) rather than inventing a new visual language. Used by Watchlist Folders' "Set a price alert" dialog.

## Loading States

`.skeleton` gains a real shimmer animation (`h3-shimmer`, 1.6s ease-in-out) instead of a static gray block — the product now visibly signals "working," a small but real "alive AI system" cue. Respects `prefers-reduced-motion` (shimmer and button-lift both disabled).

## Empty / Error States

Unchanged from Phase E2's `EmptyState` component treatment (dashed border, icon, title, action) — this phase's new empty states (no folders yet, no alerts yet, no notifications yet) all reuse that exact component rather than inventing new copy patterns.

## Mobile Behavior

- New breakpoints (`max-width: 900px`, `max-width: 600px`): sidebar hides entirely below 900px (BottomNav already covers primary nav on mobile — this closes a real pre-existing gap where the sidebar just awkwardly shrank instead of yielding).
- Notification panel becomes a fixed, full-width-minus-margin sheet below 900px instead of a small anchored dropdown that would overflow a phone screen.
- Folder grid and alert rows collapse to single-column below their respective breakpoints.

## Status, Confidence & Impact Indicators

Semantic pill colors (`opportunity`/`risk`/`monitor`) now use dedicated status tokens with a matching border tint, distinct from the brand accent — the mission's explicit "clear status, confidence and impact indicators" requirement. Alert rows additionally use a `--h3-positive`-tinted card treatment specifically when `TRIGGERED`, so a fired alert is visually distinct from an active one without relying on text alone.
