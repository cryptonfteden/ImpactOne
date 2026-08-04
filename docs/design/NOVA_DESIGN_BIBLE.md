# NOVA Design Bible
### The single source of truth for every visual and motion decision in ImpactOne.

**Status:** Foundational document — no code implements this yet. This is the target state every future screen redesign is measured against.
**Owner:** Chief Design Architect (this document)
**Scope:** Phase X12A is documentation only. No components, no screens, no tokens were implemented in code as part of this phase.

---

## 1. Product Vision

### What should users feel?

Four words, in order of priority:

1. **In control.** Not overwhelmed by data — oriented by it. Every screen answers "what matters right now, and why" before it answers "what else exists."
2. **Understood.** The product reasons in the user's own portfolio terms, not generic market terms. A recommendation about NVDA is never shown without first showing what it means for *this* user's *actual* position.
3. **Quietly confident.** Never hyped, never alarmist. Confidence is earned through calibration and shown as a number, not asserted through color or size.
4. **Accompanied, not managed.** ImpactOne is a co-pilot, not an autopilot. The user always makes the final call; the product's job is to make that call an informed one in seconds, not minutes.

### How ImpactOne differs

| | Bloomberg | TradingView | Robinhood | Yahoo Finance | Crypto dashboards | **ImpactOne** |
|---|---|---|---|---|---|---|
| Density | Maximal, terminal-grade | Chart-first, dense overlays | Minimal, almost too sparse | Ad-dense, cluttered | Neon-maximal, alert-fatigue | **Deliberate** — dense where it earns its place (Decision Center), spacious where it doesn't (Home) |
| Tone | Institutional, cold | Technical, tool-like | Consumer-cute, gamified | Generic portal | Speculative, urgent | **Calm authority** — a senior analyst's voice, not a trading-floor shout |
| Color use | Functional only | Functional + brand teal | Brand-green-everywhere | Ad-banner chaos | Neon greens/reds, glow-everything | **Restrained** — color is reserved for real state (gain/loss/risk), never decoration |
| AI presence | None / bolted-on | None | None | None | Bot gimmicks | **Structural** — AI reasoning is a first-class visual language (Section 11), not a chat bubble bolted onto a terminal |
| Who it's for | Professionals who already know what they want | Chartists | First-time investors who want simplicity | Casual browsers | Speculators | **Serious individual investors who want an institutional-grade co-pilot without an institutional-grade interface** |

ImpactOne's differentiator is not "more data" or "prettier charts" — it's **legible reasoning**. Every other product in this table shows the user *what* is happening. ImpactOne is the only one built to also show *why*, *how confident*, and *what changed since yesterday* — as a visual language, not a paragraph of text the user has to hunt for.

---

## 2. Design Philosophy

Five references, each contributing a distinct, named principle — never blended into mush.

### Apple
**Principle: Restraint as luxury.** Whitespace is not empty — it's the product telling the user "this matters, that doesn't." Apple's contribution to NOVA is the discipline to remove, not the aesthetic to imitate. Rounded corners, SF-style type rhythm, and generous touch targets are borrowed; skeuomorphic gloss and stock iconography are not.

### Tesla
**Principle: Function visualized as instrument, not document.** Tesla's dashboard doesn't look like a car manual — it looks like a cockpit. NOVA borrows this for the Decision Center and Market Dashboard: numbers that update live read as *telemetry*, not as a refreshed spreadsheet cell. Dark-first surfaces, high-contrast data-on-black, minimal chrome around the data itself.

### OpenAI
**Principle: Intelligence should look like it's thinking, not like it's finished.** OpenAI's product surfaces (ChatGPT, Playground) popularized a visual grammar for "the model is working" — soft pulsing gradients, token-by-token reveal, a sense of *process* rather than instant oracle. NOVA's entire AI Visual Language (Section 11) descends from this: nothing AI-generated ever simply *appears*, it *arrives*.

### NASA Mission Control
**Principle: Status is never ambiguous.** Every subsystem in mission control has one of a small, fixed set of states, each with one unambiguous color and position — never a paragraph the operator has to parse under pressure. NOVA borrows this for system/data-health states (live, stale, degraded, offline) and for AI confidence bands: a fixed, small vocabulary, always in the same place, always the same meaning.

### Nothing (Nothing Tech / Nothing OS)
**Principle: Structure made visible, not hidden.** Nothing's dot-matrix typography and exposed-grid aesthetic treats the underlying system as something worth seeing, not something to disguise. NOVA borrows the *attitude* (transparency of structure — grid lines, tabular alignment, monospace for anything that is literally a measurement) without borrowing the literal dot-matrix face, which reads as a consumer-gadget signature, not a financial one.

### Glass OS (visionOS-style spatial glass)
**Principle: Depth communicates hierarchy, not decoration.** Frosted, translucent surfaces at different blur/opacity levels tell the user what's foreground (actionable, opaque, elevated) vs. background (contextual, translucent, receded) without a single extra label. NOVA uses this specifically for overlays, drawers, and the AI panel — never for base screen backgrounds, which stay solid for legibility and performance.

**How they combine:** Apple's restraint sets the baseline; Tesla's instrument-panel density governs data-heavy screens; OpenAI's "process, not instant" governs anything AI; NASA's fixed status vocabulary governs anything indicating health/confidence; Nothing's exposed structure governs typography and grid; Glass OS governs elevation and overlays. No screen should ever reference more than 2–3 of these at once — that's how "inspired by five things" avoids becoming "looks like nothing."

---

## 3. Brand Identity

### Personality
Analyst, not salesman. NOVA speaks like a trusted senior colleague: direct, specific, never hedging with vague positivity, never manufacturing urgency. If nothing changed, it says "no major market-moving events detected today" — not silence, and not a fabricated headline.

### Emotion
**Calm competence.** The emotional target is the feeling of stepping into a well-run control room, not a trading pit. Reassurance comes from *clarity*, never from cheerfulness.

### Premium level
**Quiet premium**, not loud luxury. No gold, no skeuomorphic gloss, no "exclusive club" visual signaling. Premium is expressed through precision — perfect alignment, real numbers instead of placeholders, motion that never stutters — the same way a well-made instrument feels premium through tolerance, not ornament.

### Visual DNA
- **Dark-first.** Space-black surfaces are the default context; light mode is a real, fully-designed second citizen (Section 4), never an afterthought.
- **One accent, disciplined.** A single signal-blue accent (Section 4) carries brand recognition; it is never diluted by a second "brand" color competing for attention.
- **Numbers are typographic citizens.** Tabular figures, tuned kerning, a dedicated numeric type treatment (Section 5) — NOVA treats a price or a confidence score with the same typographic care most products reserve for a headline.
- **Motion implies intelligence.** Nothing appears instantly if it was computed — see Section 8's "AI Thinking" language.

### Recognition principles
A NOVA screen should be identifiable from a single cropped screenshot, with no logo visible, by five signals alone:
1. The exact signal-blue accent hue (never substituted, never gradient-shifted for a different feature).
2. Tabular numerals in the numeric type family, right-aligned, always.
3. A confidence/status pill in the fixed 4-state vocabulary (Section 11).
4. Card surfaces at the exact elevation/blur levels defined in Section 4 — never a flat drop-shadow-only card.
5. The 8px spacing rhythm (Section 6) — nothing sits on an off-grid value.

---

## 4. Color System

All values are targets for the eventual token implementation (Section 16); this section defines the *system*, Section 16 defines the *literal tokens*.

### Space palette (dark, default)
The base of the entire product — not "dark mode" as a toggle, but the primary designed state.

| Layer | Name | Hex | Use |
|---|---|---|---|
| Base | `space-950` | `#05070C` | App shell background |
| Base | `space-900` | `#0A0E16` | Screen background |
| Surface 1 | `surface-800` | `#11151F` | Card / panel background |
| Surface 2 | `surface-700` | `#1A2030` | Elevated card, modal body |
| Surface 3 | `surface-600` | `#242C40` | Hover state, input fields |
| Border | `border-subtle` | `#2A324A` @ 100% | Default hairline border |
| Border | `border-strong` | `#3D4A6B` | Focused / active border |

### Backgrounds & surface levels
Four elevation levels, strictly ordered — a card never borrows a lower level's background to "look recessed," and never jumps two levels in one hop:

- **Level 0 (Base):** `space-900`. The screen itself.
- **Level 1 (Surface):** `surface-800`. Cards, list rows, table backgrounds.
- **Level 2 (Elevated):** `surface-700`. Modals, popovers, the AI panel, active/selected cards.
- **Level 3 (Overlay/Glass):** `surface-700` at 72% opacity + 24px backdrop blur. Drawers, dialogs over content, the command palette.

### Primary colors
- **Signal Blue** `#3B82F6` — the one brand accent. Primary buttons, active nav state, links, focus rings, the accent stroke on the "AI recommendation" badge.
- **Signal Blue Bright** `#5B9CFF` — hover/active state of Signal Blue only; never used standalone.

### Accent colors
Used sparingly for category differentiation (e.g. distinguishing chart series, sector tags) — never for state (state uses the semantic colors below):

- `accent-violet` `#8B7CF6` — AI/intelligence-specific accents (see Section 11).
- `accent-cyan` `#22D3EE` — secondary chart series, informational highlights.
- `accent-amber` `#F5A524` — reserved exclusively for "attention, not danger" (see Warning below) — never decorative.

### Semantic colors

| State | Color | Hex | Rule |
|---|---|---|---|
| Positive | Emerald | `#22C55E` | Gains, BUY actions, CORRECT outcomes, upside |
| Negative | Rose | `#F43F5E` | Losses, EXIT/SELL actions, INCORRECT outcomes, downside |
| Warning | Amber | `#F5A524` | Elevated risk, stale data, pending confirmation — never used for outright failure |
| Info | Signal Blue | `#3B82F6` | Neutral system messages, informational badges — reuses the brand accent deliberately, since "info" and "brand" are the same trust signal |

Positive/Negative are **never** used for anything except real, signed financial magnitude (P&L, returns, direction-correct) — they are not reused as generic "success/error" UI colors. UI success/error (e.g. "settings saved," "request failed") uses Emerald/Rose too, but only because those *are* semantically success/failure — never borrowed for arbitrary emphasis.

### Gradients
Exactly three sanctioned gradients, each with one job:

1. **AI Thinking gradient** — `linear-gradient(135deg, #3B82F6 0%, #8B7CF6 100%)`, animated (Section 8). The only gradient that moves.
2. **Elevation glow** — a radial `rgba(59, 130, 246, 0.12)` bloom behind an actively-selected card's top edge. Static, subtle, never covers more than the top 30% of the card.
3. **Chart area fill** — a vertical fade from the series color at 24% opacity to 0%, under a line/area chart. Never under a candle chart (candles use flat volume bars instead, Section 10).

No other gradients are permitted. A sixth "just this once" gradient is a violation of this document.

### Glow rules
Glow (a soft outer `box-shadow` in the accent or semantic color) is reserved for exactly three situations:
1. A focused input or actionable element (Signal Blue, 8px blur, 20% opacity).
2. An AI element actively "thinking" (Section 8/11).
3. A live/real-time data indicator (a 4px Emerald glow dot next to "Live" text) — the *only* persistent, non-interactive glow in the system, because it encodes real information (data freshness) rather than decoration.

Glow is never applied to static text, static icons, or entire cards at rest.

### Transparency rules
- Surfaces use opacity only at Level 3 (Overlay/Glass, defined above) and for disabled states (40% opacity on the whole control, never on text alone).
- Borders never exceed 100% opacity at rest; a 60%-opacity border is only used to de-emphasize a secondary grouping (e.g. a sub-section inside a card).
- Text never uses opacity for hierarchy — use the defined text-color tokens (Section 16) instead, so contrast ratios stay auditable (Section 12) instead of accidentally failing at some opacity value nobody checked.

---

## 5. Typography

### Fonts
- **Display / UI face:** *Inter* — variable weight, exceptional at small sizes, the closest widely-available match to Apple/Tesla's UI type philosophy without being SF Pro (licensing). Used for all UI chrome, labels, body copy, headings.
- **Numeric face:** *Inter* with `font-variant-numeric: tabular-nums` and a slightly increased tracking (+0.5%) for anything over 4 digits — prices, portfolio values, confidence scores. NOVA does not introduce a second physical typeface for numbers (a common financial-product mistake that fractures the type system); it introduces a disciplined *numeric mode* of the same face.
- **Monospace (structural/Nothing-influence):** *JetBrains Mono* — used exclusively for: symbols/tickers (`NVDA`, `AAPL`), methodology version strings (`x11-v2`), and raw IDs shown in dev-only screens. Never for prose.

### Weights
Five weights, no more:
- 400 (Regular) — body copy, table cells.
- 500 (Medium) — UI labels, button text, nav items.
- 600 (Semibold) — card titles, section headers, emphasized numbers.
- 700 (Bold) — screen titles (H1 only), the single hero number on a card (e.g. total portfolio value).
- 800 (Extrabold) — reserved exclusively for the splash/startup wordmark (Section 14). Never in-product.

### Sizes (type scale, 1.25 ratio, 16px base)

| Token | Size | Line height | Use |
|---|---|---|---|
| `text-xs` | 12px | 16px | Captions, timestamps, badge labels |
| `text-sm` | 14px | 20px | Secondary body, table cells |
| `text-base` | 16px | 24px | Primary body |
| `text-lg` | 20px | 28px | Card titles |
| `text-xl` | 25px | 32px | Section headers |
| `text-2xl` | 31px | 38px | Screen H1 |
| `text-3xl` | 39px | 46px | Hero numbers (portfolio value, single KPI) |
| `text-numeric-hero` | 48px | 52px | The one largest number on a screen (Home's total value) — used at most once per screen |

### Spacing (tracking)
- Body/UI text: 0 tracking (Inter's default is already correct).
- All-caps labels/eyebrows (`text-xs`, uppercase): +6% tracking, always — uppercase without added tracking reads as a mistake, not a style.
- Numeric-hero: -1% tracking at the largest size only (large numerals need slight negative tracking to avoid looking loose).

### Hierarchy
Every screen follows the same stack, top to bottom: **Eyebrow** (`text-xs`, uppercase, `text-tertiary` color) → **H1** (`text-2xl`, `text-primary`) → **Subtext** (`text-base`, `text-secondary`) → content. No screen skips the eyebrow; it's the anchor that tells the user which product-area they're in before they read the headline.

### Number system
- **Prices/currency:** always tabular, always 2 decimal places for USD, right-aligned in any table column.
- **Percentages:** signed explicitly (`+2.4%` / `−1.1%`, real minus sign U+2212, not hyphen) and colored per the semantic Positive/Negative rule — the sign and the color are redundant on purpose, for accessibility (Section 12).
- **Large values:** abbreviated at `text-numeric-hero` only (`$1.2M`), full precision available on hover/tap; every other numeric context shows full precision, never abbreviated silently.
- **Confidence/quality scores:** always shown as `NN/100` or `NN%` with the unit visible — a bare "82" is never trusted to be self-explanatory.

---

## 6. Grid System

### Desktop (≥1280px)
12-column grid, 24px gutter, max container width **1440px**, centered. Sidebar (fixed 260px) + content area (fluid, using the 12-column grid within its remaining width).

### Tablet (768–1279px)
8-column grid, 20px gutter. Sidebar collapses to icon-rail (72px) or is replaced by the bottom nav pattern depending on screen density — Decision Center/Portfolio keep the rail (data-dense); Home/Recommendations use bottom nav (browse-dense).

### Mobile (<768px)
4-column grid, 16px gutter, full-bleed cards (no horizontal card margin beyond the container gutter). Bottom nav only; sidebar never renders.

### Spacing scale
Strict 8px base unit — every margin, padding, and gap value in the entire product is a multiple of 8, except the two documented micro-exceptions below.

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96px`

Micro-exceptions (the only non-8-multiples permitted, both structural, not decorative): `2px` for hairline border-adjacent nudges, `6px` for icon-to-label gaps inside a dense badge.

### Margins
- Desktop container: 32px outer margin minimum beyond the 1440px max-width content.
- Card internal padding: 24px (default), 16px (dense/compact card variant used in tables-as-cards on mobile).
- Section-to-section vertical rhythm: 48px between major page sections, 24px between cards within the same section.

### Container widths
- Full content: 1440px max.
- Reading-width content (explanations, AI reasoning text): 720px max, even inside a wider card — long-form reasoning text is never allowed to stretch to a 1440px line length.
- Modal: 560px (standard), 800px (wide, e.g. Decision Trace detail).
- Drawer: 420px (standard), 640px (wide, e.g. full recommendation detail).

---

## 7. Component Language

Every component below follows the elevation (Section 4), spacing (Section 6), and type (Section 5) systems already defined — this section adds component-specific rules only.

### Buttons
- **Primary:** Signal Blue fill, white text, 8px corner radius, 500 weight. Hover: Signal Blue Bright + 2px lift (transform, not shadow-only). One primary button per view/card, never two competing.
- **Secondary:** `surface-600` fill, `border-subtle` border, `text-primary` text. For the second-priority action.
- **Ghost/Tertiary:** No fill, `text-secondary` text, underline on hover. For "Cancel," "Learn more," low-commitment actions.
- **Destructive:** Rose fill only for genuinely destructive actions (delete watchlist folder), never for merely "negative" actions like SELL (SELL is a normal, expected action — not a mistake the UI should visually discourage).
- Heights: 32px (compact, in-table), 40px (default), 48px (mobile touch target / primary CTA).

### Cards
- Level 1 surface by default, Level 2 when selected/expanded.
- 12px corner radius (the one radius used for every content container — see Section 9 for the shared radius token with icons).
- 1px `border-subtle`, no drop shadow at rest; a soft `0 8px 24px rgba(0,0,0,0.24)` shadow only on hover/drag (desktop) — shadows imply elevation change, so a static card never has one.
- A card's top-left always carries its eyebrow label; its top-right always carries its status/timestamp/action menu — this position is fixed across every card type in the product, so users pattern-match instantly.

### Charts
See Section 10 for full detail. Component-level rule: a chart never renders inside a card without its own eyebrow (symbol + timeframe) and a visible last-updated timestamp — a chart with ambiguous freshness is treated as a defect, not a style question.

### Tables
- Row height: 48px (default), 40px (compact/dense mode, dev screens only).
- Header row: `text-xs` uppercase, `text-tertiary`, `surface-800` background, sticky on scroll.
- Zebra striping is **not** used — row separation comes from a 1px `border-subtle` bottom border only (zebra striping reads as spreadsheet, not instrument panel).
- Numeric columns right-aligned, text columns left-aligned, status/badge columns centered — no exceptions.

### Inputs
- 40px height default, `surface-700` fill, `border-subtle` border, 8px radius.
- Focus state: `border-strong` + Signal Blue glow ring (per Section 4's glow rules) — never a color-only focus indicator (accessibility, Section 12).
- Placeholder text at `text-tertiary`, never mistakeable for real content.

### Dropdowns
- Trigger matches Input styling. Panel is a Level 2 surface, 8px radius, appears with the "Reveal" motion (Section 8), max-height with internal scroll past 8 items.
- Selected item shows a Signal Blue left-edge indicator bar (3px), not a full-row fill — full-row fill is reserved for hover only.

### AI widgets
The single most differentiating component family — full detail in Section 11. Structurally: every AI widget lives in a card with a 1px `accent-violet`-tinted border (not Signal Blue — violet is reserved for "this content was AI-authored") and a small persistent corner mark (a 12px sparkle glyph, Section 9) so AI-generated content is *always* visually distinguishable from raw market data, even at a glance.

### Badges
- Pill shape, `text-xs`, 500 weight, 4px vertical / 10px horizontal padding.
- Semantic badges (CORRECT/INCORRECT/PENDING, BUY/SELL/HOLD) use a 12%-opacity fill of the semantic color + full-opacity text in that same color — never a solid fill with white text (reserves solid-fill visual weight for buttons only).

### Notifications
- Toast: Level 2 surface, slides in from top-right (desktop) / top (mobile), 4px left-edge semantic-color bar, auto-dismiss 5s (info/success) or persistent until dismissed (warning/error).
- In-app notification center: list rows matching Table row rules, unread state = Signal Blue 4px left bar + `surface-700` background tint.

### Dialogs
- Level 2 surface, centered, `Reveal` motion + backdrop at Level-3 glass rule (Section 4).
- Always exactly one primary + one tertiary action, right-aligned, primary rightmost (confirms) — matches platform convention, never inverted.

### Drawers
- Level 3 (glass) surface, slides from the right (desktop) / bottom (mobile), per Section 6's drawer widths.
- Used for "more detail without leaving context" (e.g. a recommendation's full Decision Trace) — a drawer never navigates away from the underlying screen, which stays visible and dimmed behind it.

### Navigation
- Sidebar: fixed, Level 0 background (not Level 1 — nav is structural, not a "card floating over the app"), active item gets a Signal Blue left-edge bar + `text-primary` (inactive items are `text-secondary`).
- Bottom nav (mobile): Level 2 surface, top hairline border, active icon uses the Filled icon variant (Section 9), inactive uses Outline.

---

## 8. Motion Language

### Animation duration
- **Micro** (hover, focus ring, badge state change): 120ms.
- **Standard** (card expand, dropdown reveal, toast in): 200ms.
- **Screen-level** (drawer slide, modal open, route transition): 320ms.
- **AI Thinking** (Section 11): continuous/looping until resolved, not a fixed duration.

Nothing in the product animates longer than 320ms except explicitly-looping states (AI Thinking, live-data pulse). A one-shot animation that takes longer than 320ms reads as slow, not premium.

### Curve
- Entrances: `cubic-bezier(0.16, 1, 0.3, 1)` ("ease-out-expo-ish") — fast start, gentle settle. This is the one signature curve; used everywhere something *appears*.
- Exits: `cubic-bezier(0.4, 0, 1, 1)` — fast, gets out of the way, no lingering.
- Hover/micro-interactions: standard `ease-in-out`, 120ms — deliberately less "designed," because a hover state should feel instant, not choreographed.

### Loading
- Skeleton screens (Section 15), never spinners, for anything that takes >400ms and has a known layout shape.
- A spinner is only used for indeterminate, layout-unknown waits (e.g. "connecting…") — and is the AI Thinking dot-pulse (Section 11), never a generic circular spinner, to keep the motion vocabulary unified.

### Hover
- Cards: 2px lift (`transform: translateY(-2px)`) + shadow appears, 120ms.
- Buttons/links: color shift only, no transform (transform-on-hover is reserved for cards/draggable-feeling elements, so its meaning stays specific).
- Table rows: background tint to `surface-700`, no transform.

### Selection
- Selected card/row: Signal Blue 2px border replaces `border-subtle`, plus the Elevation Glow gradient (Section 4). Applied instantly (no transition) on click, so selection always feels responsive, never laggy — but the glow itself fades in over 200ms.

### Charts
- Data updates: new candles/points animate in via the entrance curve, 200ms, from their real previous value — never a hard cut, since a hard cut on live financial data reads as a glitch, not an update.
- Zoom/pan: 1:1 with pointer, no easing (financial charts must feel physically direct, not "smoothed" — smoothing here would misrepresent precision).

### Transitions
- Route/screen changes: content cross-fades (160ms out, 200ms in, slight overlap) — never a slide (slides imply spatial navigation hierarchy the app's nav model doesn't have).
- Tab changes within a screen: the active-tab indicator slides to its new position (200ms, standard curve); tab content cross-fades independently.

### AI Thinking
The signature motion of the entire product (full visual spec in Section 11): a slow (1.8s loop), low-amplitude gradient sweep across the AI Thinking gradient (Section 4), paired with a soft opacity pulse (0.6 → 1.0 → 0.6) on an accompanying sparkle glyph. Never a generic spinner, never a progress bar with a fake percentage (NOVA never fabricates a completion percentage for an LLM call it can't actually measure).

---

## 9. Iconography

- **Family:** A single consistent icon set (Phosphor Icons or an equivalent dual-style set) — never mixed icon sources within one product.
- **Outline:** Default state for all inactive/secondary icons. 1.5px stroke weight.
- **Filled:** Reserved for *active/selected* state only (active nav item, a toggled-on filter, a filled "watchlisted" star) — filled vs. outline is a state signal, not a style choice, so it must never be used decoratively.
- **Stroke:** 1.5px at 24px size, scaling proportionally (never below 1px at any size, for legibility).
- **Corner radius:** Icons follow the product's 12px card radius conceptually — i.e., icon glyphs with rounded terminals (not sharp-cornered) to match the rest of the geometry. This is a sourcing constraint on the chosen icon family, not a runtime transform.
- **Sizes:** `16px` (inline with `text-sm`/`text-xs`, e.g. table row icons), `20px` (default UI icon, buttons/inputs), `24px` (nav items, card headers), `32px` (empty-state illustrations' icon-only variant, Section 15).

---

## 10. Charts

### Future style
Dark-first, minimal chrome, data-ink-maximized (per Tufte's principle, filtered through the Tesla-instrument lens): no unnecessary axis lines, no 3D, no drop shadows on chart elements. The chart *is* the card content — it does not compete with card chrome for attention.

### Candles
- Body width: 60% of available slot width (40% gap), so density scales cleanly across zoom levels.
- Up candle: Emerald body, Emerald wick, hollow/outline body optional at high density (many candles) to keep the chart from becoming a solid green/red wall.
- Down candle: Rose body, Rose wick, solid fill always (asymmetry with up-candles is intentional — losses should never be visually softened relative to gains).

### Volume
- Bars beneath the price pane, 20% of total chart height, same Emerald/Rose coloring as their corresponding candle, at 60% opacity (never full-opacity — volume is supporting context, not the headline series).

### Heatmaps
- Sector/position heatmaps use a diverging scale anchored at the semantic Positive/Negative colors (Rose → neutral `surface-600` → Emerald), never a rainbow/spectrum scale — a financial heatmap's "good/bad" axis must map to the same colors as everywhere else in the product.
- Cell corner radius: 4px (smaller than the 12px card radius — heatmap cells are data-ink, not containers).

### Crosshair
- 1px `border-strong` dashed line, both axes, following pointer/touch.
- A small floating label at each axis showing the exact value under the crosshair, `text-xs`, tabular numerals, Level 2 surface background.

### Tooltip
- Level 2 surface, 8px radius, appears within 80ms of crosshair settling (not on every pixel of movement — debounced so it doesn't strobe).
- Structure: date/time (top, `text-tertiary`), OHLC or point value (middle, tabular numerals), volume (bottom, `text-secondary`) — same field order on every chart in the product.

### Grid
- Horizontal gridlines only (no vertical) at `border-subtle`, 20% opacity — vertical rhythm from time labels is sufficient, and removing vertical lines reduces visual noise substantially at high candle density.

### Zoom
- Scroll-wheel / pinch zoom, centered on pointer/touch position (not chart center) — matches the "physically direct" rule from Section 8.
- A visible "Reset zoom" ghost-button appears (bottom-right of chart) only once the user has zoomed away from the default range — never present at rest, so it doesn't add chrome to the default view.

---

## 11. AI Visual Language

The product's single most important design surface. Every AI-originated element carries the `accent-violet` identity marker (border tint + corner sparkle glyph, per Section 7) so users always know, at a glance and without reading, "this was reasoned by the model" vs. "this is raw market data."

### AI Recommendation
- Card with `accent-violet`-tinted 1px border, action badge (BUY/REDUCE/EXIT, Section 7 badge rules) top-left, confidence score top-right as a `NN/100` numeral in tabular numerals — never a bare progress bar alone, always the number.
- Confidence is additionally encoded as a 4-segment fixed vocabulary (NASA Mission-Control influence, Section 2): **Low** (0–39, `text-tertiary` label), **Moderate** (40–64, Amber-tinted label), **High** (65–84, Signal-Blue-tinted label), **Very High** (85–100, Emerald-tinted label) — the same four bands, same four colors, everywhere confidence appears in the product (recommendations, calibration reports, source trust scores).

### AI Thinking
- The animated gradient sweep + sparkle pulse (Section 8), shown in-place of content that hasn't arrived yet — never a generic spinner. For multi-step reasoning (e.g. committee debate), each step reveals with a 200ms stagger as it completes, so the user watches reasoning *arrive* rather than waiting for a single blocking spinner.
- Text generated by the model (explanations, reasoning) uses a token-reveal animation only on first-ever view of a given recommendation (never replayed on revisit — replaying it on every screen visit would read as fake/theatrical rather than a real generation event).

### AI Memory
- Represented as a distinct "Previously…" card variant: same card language as AI Recommendation, but with a `surface-700` (not violet-tinted) border and a small clock-glyph eyebrow ("3 similar events found") — memory is AI-*retrieved*, not AI-*generated*, and the visual language must keep that distinction legible (retrieval is more trustworthy than generation, and the UI should not blur that).
- Each memory match shows its `relevanceConfidence` (per the real backend field) as a compact horizontal bar, Signal-Blue fill — a simpler treatment than the 4-band Recommendation confidence, since memory relevance is a ranking signal, not a decision the user acts on directly.

### AI Confidence
- The 4-band vocabulary defined under "AI Recommendation" is the *only* confidence representation in the entire product — calibration reports, source trust scores, and market-memory relevance all reuse it, differently labeled but identically colored, so "high confidence" always means the same visual thing regardless of which subsystem produced it.

### AI Learning
- A distinct, quieter visual: a thin horizontal Signal-Blue progress-style bar (not a percentage — an *evidence accumulation* bar) showing sample size against the real minimum-sample threshold (e.g. "8 / 15 outcomes needed"), used anywhere a learning system is gated on statistical significance (Outcome Feedback, Dynamic Source Scoring). Below threshold: the bar is `text-tertiary` gray. At/above threshold: the bar turns Signal Blue and a small "Active" badge appears — this is the one place in the product where crossing a threshold has a celebratory-but-restrained visual moment (a single 200ms color transition, nothing more).

### AI Updated
- A small `accent-cyan` dot + "Updated Nm ago" label, appearing on any card whose content changed since the user's last view (a recommendation re-scored, a methodology version rolled back, a source's trust score recomputed) — cyan specifically (not violet, not blue) so "freshness/change" reads as its own distinct signal from "this is AI" (violet) or "this is interactive/branded" (blue).

---

## 12. Accessibility

- **Contrast:** All text meets WCAG 2.1 AA at minimum (4.5:1 for body text, 3:1 for large text ≥24px/19px-bold) against its actual rendered background — verified per surface level, not just against pure black, since Level 2/3 surfaces are lighter than Level 0. Semantic colors (Emerald/Rose/Amber) are chosen specifically to pass AA on both `space-900` and `surface-800` — not just "look right."
- **Reduced motion:** Every animation in Section 8 has a `prefers-reduced-motion` fallback: entrances/exits become instant opacity-only crossfades at 1 frame, AI Thinking's sweep becomes a static (non-animated) gradient with a simple "Thinking…" text label, chart data updates cut instantly rather than tweening.
- **Keyboard:** Every interactive element (Section 7) has a visible focus ring (Signal Blue glow, per Section 4) that is never suppressed via `outline: none` without a replacement. Tab order follows visual/reading order on every screen; modals/drawers trap focus and return it to the triggering element on close.
- **Screen readers:** Every semantic-color-coded element (badges, P&L figures, confidence bands) carries the same information in text, not color alone — per Section 5's "sign and color are redundant on purpose" rule. AI-generated content is announced with a live-region update as it streams in, not silently.
- **RTL / LTR:** Full logical-property usage (`margin-inline-start` not `margin-left`, etc.) throughout — no hardcoded left/right in component styles, so the entire component language mirrors correctly (see Section 13) without component-level RTL patches.

---

## 13. Internationalization

### English
Primary/default locale (LTR). All copy authored here first; every other locale is a real translation, never a placeholder.

### Hebrew
Full RTL. Numerals and prices remain LTR *within* an RTL sentence (standard bidi convention) — a price like `₪1,234.56` reads left-to-right even inside Hebrew prose, per Section 13's Number formatting rule below.

### Arabic
Full RTL, same mirroring rules as Hebrew. Arabic-indic numerals are **not** used by default (Western Arabic numerals are the regional financial-app convention); a future locale-preference toggle may offer them, but it is not default behavior.

### Future languages
The token/component system (Sections 4–9) has no language-specific hardcoding, so adding a new LTR language (Spanish, Portuguese, etc.) requires only translation strings — zero component changes. A new RTL language beyond Hebrew/Arabic requires zero additional component changes either, since RTL support is structural (logical properties), not per-language.

### RTL rules
- The entire layout mirrors: sidebar moves to the right edge, chart y-axis labels move to the right, back/forward chevrons flip direction, the AI Thinking sweep animates right-to-left.
- **Exceptions that never mirror** (industry-standard financial-app convention): numerals, tabular numeric alignment (still right-aligned in RTL — numbers align to their own reading direction regardless of paragraph direction), and candle-chart time axis (always chronological left-to-right, since that's a spatial/temporal convention independent of text direction, same reason a clock face doesn't mirror in RTL contexts).

### Mirroring rules
Icons that encode inherent left/right meaning (back arrow, forward arrow, "trend up-right") flip in RTL. Icons that don't (a magnifying glass, a star, a settings gear) never flip — flipping an icon with no directional meaning is a common RTL-implementation mistake this document explicitly forbids.

### Number formatting
Locale-aware thousands/decimal separators (`1,234.56` in English, `1.234,56` in relevant European locales if added later) — but **currency and price precision rules from Section 5 (tabular, 2 decimals) never change per locale**, only the separator glyphs do.

### Currency formatting
USD is the base currency for all portfolio/market data regardless of UI locale (the product itself, not just its chrome, is USD-denominated at this stage) — the symbol position (`$1,234.56` vs. a locale that would put the symbol after) follows the *number formatting* locale rules above even though the currency itself doesn't change.

---

## 14. Startup Experience

### Splash
A single centered wordmark (the one place `800` weight is used, Section 5) on `space-950`, with the AI Thinking gradient (Section 4/8) sweeping subtly behind it — the first thing a user sees is literally the product's signature "intelligence is warming up" motion, setting expectation immediately. Duration: as long as real initialization takes, never artificially extended, and never shown for longer than 1.5s if initialization is already complete (a splash that outlives its own necessity reads as slow, not premium).

### Initialization
Sequential, honestly labeled steps if initialization genuinely has stages (e.g. "Connecting…" → "Loading your portfolio…") — never a fake progress bar with an invented percentage. If a step is unknown-duration, it uses the AI Thinking spinner variant, not a percentage.

### Loading
Screen-level: skeletons (Section 15) as soon as layout is known, even before all data has arrived — the shell renders immediately, data fills in per-card independently, so nothing blocks on the slowest single API call.

### Offline
A persistent, non-blocking top banner (`surface-700`, Amber left-edge bar, per the Warning semantic) — "You're offline. Showing the last data from [real timestamp]." Never a full-screen takeover; the last-known state remains visible and interactive (read-only) underneath.

### Reconnect
On reconnection, the offline banner transitions (200ms) to a brief Emerald "Back online — refreshing…" state, auto-dismissing after data actually refreshes (not after a fixed timer) — confirming real data, not just a resumed socket.

---

## 15. Empty States

### Skeletons
Match the exact geometry of the content they're standing in for (a card skeleton has the same card chrome, header position, and number-placement as its resolved state) — a generic gray-box skeleton that doesn't match final layout is treated as a defect. Shimmer animation: a single soft highlight sweep, 1.6s loop, `surface-600`-to-`surface-700`, respecting `prefers-reduced-motion` (becomes a static mid-tone fill).

### No data
Never a bare "No data" string. Every empty state names *why* (per this product's existing "never fabricate" discipline) and *what would change it* — e.g. "No open positions yet. Place your first trade to see it here." Icon: 32px outline glyph (Section 9) relevant to the specific content type, `text-tertiary`.

### Learning state
Distinct from "no data": used specifically where a real learning system (Section 11's "AI Learning") hasn't yet crossed its statistical threshold — e.g. "Building confidence — 8 of 15 outcomes needed before this source's trust score goes live." Visually: the same evidence-accumulation bar from Section 11, plus explanatory text — this state is optimistic/in-progress, not a dead end, and must read differently from a true "No data" empty state.

### Offline state
When a screen has no cached data at all *and* the device is offline (distinct from the persistent banner in Section 14, which covers the "have cached data, temporarily offline" case): full in-card message, Amber icon, "Can't load this yet — you're offline and we don't have a saved version" — honest about the actual cause, never a generic spinner that spins forever.

---

## 16. Design Tokens

A representative token system (naming convention: `category-property-variant`). This is the literal implementation target for whenever Section 18's roadmap reaches tokenization — not implemented in code during this phase.

```
// Color — Base
color.space.950            #05070C
color.space.900             #0A0E16
color.surface.800           #11151F
color.surface.700           #1A2030
color.surface.600           #242C40
color.border.subtle         #2A324A
color.border.strong         #3D4A6B

// Color — Brand
color.brand.signal          #3B82F6
color.brand.signal-bright   #5B9CFF
color.brand.violet          #8B7CF6   // AI marker
color.brand.cyan            #22D3EE   // "updated" marker

// Color — Semantic
color.semantic.positive     #22C55E
color.semantic.negative     #F43F5E
color.semantic.warning      #F5A524
color.semantic.info         #3B82F6   // = color.brand.signal

// Color — Text
color.text.primary          #F5F7FA
color.text.secondary        #A8B0C3
color.text.tertiary         #6B7488
color.text.on-brand         #FFFFFF

// Typography
font.family.ui               "Inter"
font.family.numeric          "Inter" (tabular-nums)
font.family.mono             "JetBrains Mono"
font.weight.regular          400
font.weight.medium           500
font.weight.semibold         600
font.weight.bold             700
font.weight.extrabold        800
font.size.xs                 12px / 16px
font.size.sm                 14px / 20px
font.size.base                16px / 24px
font.size.lg                  20px / 28px
font.size.xl                  25px / 32px
font.size.2xl                 31px / 38px
font.size.3xl                 39px / 46px
font.size.numeric-hero        48px / 52px

// Spacing
space.1     4px
space.2     8px
space.3     12px
space.4     16px
space.6     24px
space.8     32px
space.12    48px
space.16    64px
space.24    96px

// Radius
radius.sm     4px    // heatmap cells, small chips
radius.md     8px    // buttons, inputs, dropdown panels
radius.lg     12px   // cards, modals (the default content radius)
radius.full   9999px // pills, badges, avatars

// Elevation (box-shadow)
elevation.0   none
elevation.1   0 8px 24px rgba(0,0,0,0.24)     // hover-lifted card
elevation.2   0 16px 40px rgba(0,0,0,0.32)    // modal / dialog

// Motion
motion.duration.micro       120ms
motion.duration.standard    200ms
motion.duration.screen      320ms
motion.curve.enter          cubic-bezier(0.16, 1, 0.3, 1)
motion.curve.exit           cubic-bezier(0.4, 0, 1, 1)

// Glow
glow.focus       0 0 0 4px rgba(59,130,246,0.20)
glow.live        0 0 8px rgba(34,197,94,0.60)
glow.ai-thinking  0 0 16px rgba(139,124,246,0.30)
```

---

## 17. Screen Inventory

Real inventory, taken directly from the current `screenMap` (`frontend/src/layout/screenRegistry.js`) — every screen that exists in the product today, not a hypothetical list.

**Visual Priority** = how central this screen is to daily use, and therefore how much of NOVA's full visual language it must express (1 = highest).
**Redesign Priority** = sequencing recommendation for the future execution roadmap (Section 18), independent of visual priority — a low-visual-priority dev screen can still be a quick, high-value redesign win.

| Screen | User-facing? | Visual Priority | Redesign Priority | Notes |
|---|---|---|---|---|
| Home | Yes | 1 | 1 | The product's face. Full AI Visual Language, hero numeric type, adaptive card order. |
| Decision Center | Yes | 1 | 1 | Highest data density + highest-stakes decisions — the definitive "instrument panel" screen. |
| Portfolio | Yes | 1 | 2 | Core daily-use screen; chart-heavy (Section 10 fully applies). |
| Recommendations | Yes | 1 | 2 | Primary AI Recommendation card showcase (Section 11). |
| AI Analysis | Yes | 2 | 3 | Deep-dive AI reasoning; benefits most from AI Thinking/token-reveal motion. |
| Market Dashboard | Yes | 2 | 3 | Tesla-instrument-panel influence is most literal here. |
| Watchlist Folders (Workspaces) | Yes | 2 | 3 | Table-heavy; benefits from Section 7's table rules. |
| Decision Timeline | Yes | 2 | 4 | Chronological, benefits from the "AI Updated" marker language. |
| Market Positioning | Yes | 2 | 4 | Chart/heatmap-heavy (Section 10). |
| Global Intelligence | Yes | 2 | 4 | News/event feed; badge and card language central. |
| Daily Feed | Yes | 3 | 5 | Simpler list surface, lower visual novelty needed. |
| Themes | Yes | 3 | 5 | Thematic browsing; card grid. |
| Alerts | Yes | 3 | 5 | Notification-center language (Section 7) applies directly. |
| My Profile | Yes | 3 | 6 | Low data density, mostly forms/inputs. |
| Settings | Yes | 3 | 6 | Pure form/input surface. |
| Watchlist (legacy, unreachable in nav) | No (code exists, not nav-reachable) | 4 | Not scheduled | Superseded by Watchlist Folders per existing product decision; excluded from active redesign scope. |
| Intelligence Console *(dev-only)* | No | 4 | 7 | `VITE_DEV_CONSOLE` gated; internal tooling, functional-only styling acceptable. |
| Health Dashboard *(dev-only)* | No | 4 | 7 | Same as above. |
| Admin Dashboard *(dev-only)* | No | 4 | 7 | Same as above. |
| AI Performance Dashboard *(dev-only)* | No | 4 | 7 | Same as above — though its content (calibration, drift) is a natural showcase for Section 11's confidence language if it's ever promoted to user-facing. |

---

## 18. Future Design Roadmap

What comes after this document — explicitly not part of this phase.

1. **Token implementation.** Translate Section 16 into real CSS custom properties / a theme file, both dark and light. No component changes yet — tokens land first, inert, so they can be reviewed independently of any visual change.
2. **Component library build-out.** Implement Section 7's component language as real, isolated components (likely Storybook or an equivalent visual-review environment) — reviewed against this document line-by-line before touching a single existing screen.
3. **Pilot redesign: Home.** The single highest-leverage screen (Section 17, Visual Priority 1 / Redesign Priority 1) — proves the full system (tokens, components, motion, AI language) end-to-end on the screen every user sees first, before scaling to the rest of the inventory.
4. **Decision Center + Portfolio.** The two other Visual-Priority-1 screens, once Home has validated the system in production.
5. **Systematic rollout by Redesign Priority**, screen by screen, per Section 17's ordering — never a big-bang full-app redesign in one release.
6. **Dev-only screens last** (or never) — internal tooling gets the token system "for free" once components are shared, but is explicitly not a priority for bespoke visual treatment.
7. **Light mode parity pass.** Once dark mode (this document's default) is fully shipped across the priority-1/2 screens, a dedicated pass ensures light mode (Section 4) is a fully realized second citizen, not a mechanically-inverted afterthought.
8. **Motion audit.** After components ship, a dedicated pass verifies every animation in the shipped product actually matches Section 8's durations/curves — motion tends to drift during implementation without a deliberate check.
9. **Accessibility audit.** A full WCAG AA pass (Section 12) against the shipped components, including real screen-reader testing, not just automated contrast checks.
10. **i18n activation.** Hebrew/Arabic RTL (Section 13) ships once the component system's logical-property discipline has been proven on at least one full redesigned screen — RTL is far cheaper to get right from the start than to retrofit.

**Explicitly out of scope for all of the above, until re-authorized:** any code change, any component creation, any screen redesign. This document is the contract those future phases will be held to.
