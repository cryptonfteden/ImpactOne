# ImpactOne Design System

### Phase DESIGN-SYSTEM-001 — the reusable component layer extracted from Mission Control and Portfolio Workspace

This document catalogs the platform components that emerged from
building Mission Control (`MISSION-CONTROL-001/002`, `LIVE-DATA-001`) and
rebuilding Portfolio Workspace on the same architecture
(`PORTFOLIO-001`). Every component here was **extracted**, not
newly designed: each one existed as near-duplicate code in two or more
screens before this phase, and was generalized into a single canonical
implementation. This document is the usage contract for that shared
layer — the next screen built on this architecture should start here,
not by re-copying a pattern from an existing screen.

All components live in `frontend/src/components/nova/` and are exported
from `frontend/src/components/nova/index.js`. All visual rules trace
back to `IMPACTONE_DESIGN_BIBLE.md` and
`MISSION_CONTROL_EXPERIENCE_MASTERPLAN.md` — this document does not
introduce new visual language, only documents components that already
implement it.

---

## 1. MetricArc

**File:** `MetricArc.jsx` · **Introduced:** `MISSION-CONTROL-001` (as `ConfidenceArc`) · **Renamed:** `MISSION-CONTROL-002`

### Purpose
The one recurring scoring primitive for the entire product. A partial
radial "gauge" arc (270°) whose fill is a real, computed percentage —
never decorative, never animated for its own sake. Replaces three
separate ad hoc indicators (a numeric badge, a confidence bar, a
discrete level label) with one instrument-style reading.

### Props
| Prop | Type | Default | Notes |
|---|---|---|---|
| `score` | `number` | — | The real value, 0-100. Absent/non-finite renders an honest "not yet available" state, never a fabricated number. |
| `metric` | `"confidence" \| "attention" \| "probability"` | `"confidence"` | Determines both the label and the color rule (see below). Required whenever the caller knows which metric it is — never omit to "save a prop." |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | `sm` = 36px (list rows), `md` = 56px (default), `lg` = 96px (hero only). |
| `showValue` | `boolean` | `false` | Shows the numeric value in the center. Off by default — the arc alone is the collapsed/fast-read signal; the number is a deliberate opt-in for expanded/detail contexts. |
| `label` | `string` | derived | Overrides the accessible label. Rarely needed — the derived label is already correct and metric-specific. |

### States
- **Real score** — arc fill proportional to the clamped 0-100 value.
- **Absent score** (`score` is `undefined`/`NaN`) — empty arc, `showValue` renders `—`, accessible label reads `"{Metric} not yet available"`. Never fabricates a number.
- **Out-of-range score** (e.g. 140) — silently clamped to 100. Never renders an invalid arc.

### Variants (by `metric`)
| `metric` | Color rule | Label pattern |
|---|---|---|
| `confidence` | Banded by `Badge.js`'s `confidenceBand` (positive/info/warning/neutral, by real score) | `"Confidence {n} out of 100 — {band}"` |
| `attention` | **Fixed** `--nova-color-brand-signal` (never banded) | `"Attention {n} out of 100"` |
| `probability` | **Fixed** `--nova-color-brand-cyan` (never banded) | `"Probability {n} percent"` |

**Why Attention and Probability are never banded:** per
`IMPACTONE_DESIGN_BIBLE.md` §5, the Attention hue is reserved
exclusively for prioritization and must never borrow Confidence's
good/bad-coded palette — a high Attention Score is "look at this," not
"good news." The same reasoning applies to Probability, which is a
statistical likelihood, not a judgment.

### Accessibility
`role="img"` with a full, metric-specific `aria-label` carrying the real
number and (for Confidence) the real band — a screen reader user gets
the complete information the arc conveys visually, without needing
`showValue`. The SVG itself is `aria-hidden`.

### Motion
The fill's `stroke-dasharray` transitions over `--nova-motion-duration-screen`
on value change — the one "reveal" transition, honoring
`prefers-reduced-motion`/`data-motion="reduced"` (collapses to 1ms). No
other motion.

### Usage rules
1. **Never reuse one `metric` for another's data.** A component showing
   `attentionScore` must pass `metric="attention"`, never leave it
   defaulted to `"confidence"`.
2. **Never show two metrics' arcs without a caption underneath.** A bare
   arc next to another bare arc is ambiguous — always pair with a small
   `nova-text-xs` caption ("Confidence" / "Probability") when more than
   one arc appears together (see `IntelligenceCard`).
3. **`showValue` is the exception, not the default,** in any collapsed/
   list view.

---

## 2. HeroCard

**File:** `HeroCard.jsx` · **Introduced:** `DESIGN-SYSTEM-001` (extracted from `MissionControlHomeScreen.jsx`'s Top Priority card and `PortfolioWorkspaceScreen.jsx`'s "How am I doing?" card, both `PORTFOLIO-001`/`MISSION-CONTROL-001`)

### Purpose
The single, largest, highest-elevation object on a screen — the one
unmistakable visual starting point (masterplan §3.1). Wraps `Card` with
the Emphasis surface material (`.mc-hero`) and the one-time entrance
pulse (`.mc-hero--enter`).

### Props
| Prop | Type | Notes |
|---|---|---|
| `eyebrow` | `string` | The small label above the hero's content (e.g. "Top Priority", "How am I doing?"). |
| `children` | `node` | The hero's real content — never generic; always the screen's single most important real fact. |
| `className` | `string` | Merged with `mc-hero`/`mc-hero--enter`; rarely needed. |

### States
- **Entering** (`mc-hero--enter` present) — plays the one-time emphasis
  pulse (Bible §6.7) for ~900ms, then permanently removes the class via
  `onAnimationEnd`. Never re-triggers on re-render (state is local, set
  once on mount).
- **Settled** — no animation, just the static glass/emphasis border.

### Accessibility
No special ARIA — `Card`'s existing `eyebrow` slot renders as visible
text, and hero content should always include real, readable text (not
purely visual/color-coded information).

### Motion
Exactly one animation: the entrance pulse, `900ms`, honors reduced
motion (disabled entirely under `prefers-reduced-motion`/
`data-motion="reduced"`).

### Usage rules
1. **At most one `HeroCard` per screen.** Two heroes on one screen
   defeats the entire purpose — see Bible §4.3.
2. **Never used for anything but the single most important real fact.**
   A `HeroCard` wrapping placeholder or generic content is a Design
   Bible violation, not just a stylistic choice.

---

## 3. DemoModeBanner

**File:** `DemoModeBanner.jsx` · **Introduced:** `DESIGN-SYSTEM-001` (extracted from the identical inline block duplicated in both screens, both introduced independently in `LIVE-DATA-001` and `PORTFOLIO-001`)

### Purpose
Discloses, honestly and precisely, when some or all of a screen is
running on simulated fallback data rather than live services. Computed
per-section, never as a single global flag.

### Props
| Prop | Type | Notes |
|---|---|---|
| `liveSections` | `{ [key: string]: boolean }` | `true` = that section loaded real data this render. |
| `sectionLabels` | `{ [key: string]: string }` | Plain-language name for each key, used only in the partial-outage message. |

### States
- **Fully live** (every value in `liveSections` is `true`) — renders
  **nothing at all** (`null`). This is the default, expected state.
- **Fully demo** (every value is `false`) — renders the full message:
  *"Demo — every value on this screen is simulated for demonstration.
  It does not reflect your real portfolio or live market data."*
- **Partial outage** (a mix) — names exactly which sections fell back:
  *"Demo data — {Section A, Section B} could not be loaded live right
  now and are showing simulated values. Everything else on this screen
  reflects real, live data."*

### Accessibility
Wrapping `<div role="status" aria-label="...">` — the `aria-label`
itself states which of the two states is active (fully demo vs.
partial), so assistive tech gets the same disambiguation sighted users
get from the message text, without needing to parse the body copy.

### Motion
None. This is disclosure, not an alert — it should never draw the eye
with movement.

### Usage rules
1. **Never render a per-card "demo" badge in addition to this banner.**
   One disclosure, once, at the top of the screen — scattering demo
   indicators per-card is exactly the "distracting" failure mode this
   component exists to avoid (Bible §12).
2. **A section is only "not live" on a real fetch failure** — an
   honestly empty real result is not a fallback condition and must not
   appear in `liveSections` as `false`. Confusing "empty" with "demo" is
   a factual error, not a UI nuance.
3. **`sectionLabels` values must be plain language**, matching what a
   user would recognize as that section's name on screen — not an
   internal key or service name.

---

## 4. IntelligenceCard

**File:** `IntelligenceCard.jsx` · **Introduced:** `DESIGN-SYSTEM-001` (extracted from `MissionControlHomeScreen.jsx`'s `SignalCard` — Biggest Risk/Best Opportunity — and `PortfolioWorkspaceScreen.jsx`'s inline "Why This Affects You" per-claim card)

### Purpose
The one canonical way a real Claim renders as a card anywhere in the
product — a Confidence `MetricArc`, a direction badge, the affected
symbols, and the real reasoning text, with a handful of well-defined
optional additions. This is the "Risk Card" / "Opportunity Card" /
"Claim Card" the extraction brief named as separate examples — they are
the same component, parameterized, not three components.

### Props
| Prop | Type | Default | Notes |
|---|---|---|---|
| `claim` | `object` | — | The real Claim contract object. Required. |
| `title` | `string` | — | Card title (Biggest Risk / Best Opportunity style). |
| `eyebrow` | `string` | — | Card eyebrow (Why-This-Affects-You style); ignored if `title` is given. |
| `showProbability` | `boolean` | `false` | Renders a second, separate `MetricArc` (metric="probability") when `claim.probability` is finite. |
| `showStatusBadge` | `boolean` | `false` | Renders a neutral badge with the claim's real lifecycle status. |
| `sections` | `Array<{label, content}>` | — | When given, replaces the default terse body with explicitly-labeled sections (Why / Evidence / Counter Evidence / Potential Scenarios). Omit for the terser default. |
| `expandable` | `boolean` | `false` | Shows a "Show more"/"Show less" toggle. |
| `expandableContent` | `node` | — | Real content (e.g. real `portfolioImpact`) revealed only when expanded. |

### States
- **Default body** (`sections` omitted) — plain-language statement, then
  the single strongest real evidence line (`claim.evidence[0]`).
- **Labeled-sections body** (`sections` given) — each section rendered
  as `**Label:** content`, in the order given.
- **Expandable, collapsed** — `expandableContent` not rendered; button
  reads "Show more".
- **Expandable, expanded** — `expandableContent` rendered above the
  toggle; button reads "Show less".

### Accessibility
Confidence/Probability arcs each carry their own real `MetricArc`
`aria-label` (see §1). The direction badge's tone is never the only way
its meaning is conveyed — the text `BULLISH`/`BEARISH`/`NEUTRAL` is
always the badge's visible content, satisfying Bible §11.4 (color
independence).

### Motion
None beyond what `MetricArc` and `Button`/`Card` already provide
(standard hover, the arc's value-change transition).

### Usage rules
1. **Never render Confidence and Probability in the same arc** — they
   are always two separate `MetricArc` instances, each with its own
   caption, even when shown side by side.
2. **`sections` and the default body are mutually exclusive** — don't
   pass both `sections` and expect the terse default to also appear;
   pick the shape that matches the screen's information density (dense
   list → default body; deep-dive detail card → `sections`).
3. **`expandableContent` must be real data or `null`** — never a
   fabricated placeholder shown "to give the button something to do."
   An `IntelligenceCard` with `expandable` and nothing real to expand
   should omit `expandable` entirely (an inert toggle erodes trust — see
   `MISSION_CONTROL_IMPLEMENTATION_REVIEW.md`, finding H1).

---

## 5. AttentionLevelBadge

**File:** `AttentionLevelBadge.jsx` · **Introduced:** `DESIGN-SYSTEM-001` (extracted from the identical pattern duplicated on the Mission Control hero and every Today's Brief row)

### Purpose
The discrete "Priority Indicator" — the Recommended Attention Level
(`High`/`Medium`/`Low`), always rendered identically wherever it
appears.

### Props
| Prop | Type | Notes |
|---|---|---|
| `level` | `"High" \| "Medium" \| "Low"` | The real, server-computed level. |

### States
Purely a function of `level` — no internal state.

### Variants
| `level` | Tone |
|---|---|
| `High` / `Medium` / `Low` | `attention` (always, regardless of level) |

**Fixed post-extraction (`PRODUCT_STYLE_GAPS.md`, H1):** the original
extraction mapped High/Medium/Low to the shared `warning`/`info`/
`neutral` Badge tones — the same tones Confidence bands
(`confidenceBand`) and claim status badges already use, so a
High-Attention badge, a Moderate-confidence badge, and a Weakening-
status badge all rendered as the identical amber on the same screen.
`Badge` now has a dedicated, exclusive `attention` tone (a fixed hue,
matching `MetricArc`'s own non-banded Attention color) that this
component always uses — High/Medium/Low are differentiated by their
text alone, never by color. **Never reuses Confidence's 4-band
vocabulary** (Low/Moderate/High/Very High) either — this is a discrete
3-band priority label, a genuinely different concept from both
continuous scores.

### Accessibility
Renders as a `Badge` — text content is always `"Attention: {level}"`,
never color-only.

### Motion
None.

### Usage rules
1. **Always use the full `"Attention: {level}"` text**, even in a
   compact list row — a bare `"High"` badge next to a `MetricArc` is
   ambiguous about which metric it's a level of (this exact bug existed
   in `BriefRow` before this extraction and is now structurally
   impossible to reintroduce, since the component always prepends the
   label).

---

## 6. EmptyState (existing, documented here for completeness)

**File:** `Loading.jsx` · **Introduced:** prior phases (NOVA Foundation)

### Purpose
The honest, specific "nothing real exists here yet" state — never a
bare "No Data." Used identically across Mission Control, Portfolio
Workspace, and every other screen.

### Props
`icon` (a single character, conventionally `"◇"` across this app's
intelligence screens), `title` (the honest, specific message).

### Usage rules (reaffirmed by this phase's extraction work)
1. **The message must name what's missing and, where possible, what
   would change it** — e.g. *"No prior-day snapshot yet — this is the
   first day being tracked"*, never *"No data."*
2. **An honestly-empty real result is never the same as Demo Mode.**
   `EmptyState` is what a section shows when its real fetch succeeded
   and returned nothing; `DemoModeBanner` (§3) is what discloses when a
   fetch itself failed. Confusing these two is the exact bug this
   phase's screens were built to avoid (see `LIVE-DATA-001`'s "honest
   empty state — not the same as Demo Mode" test suite).

---

## 7. Section tiers (convention, not a component)

Mission Control and Portfolio Workspace both organize their screen into
three `<Section>` wrappers, classed `mc-tier-1`/`mc-tier-2`/`mc-tier-3`
(defined once in `components.css`, reused by both screens — see
`MISSION_CONTROL_EXPERIENCE_MASTERPLAN.md` §3 for the full rationale).
This was deliberately **not** extracted into a `TierSection` component
this phase: the existing `<Section aria-label="..." className="mc-tier-N">`
usage is already minimal (one line), and introducing a wrapper component
around it would add an abstraction layer without removing any real
duplication. Document the convention here instead:

- **Tier 1** (`mc-tier-1`): the `HeroCard` plus at most one supporting
  list — highest elevation, the only tier using glass/emphasis material.
- **Tier 2** (`mc-tier-2`): the screen's core "your signals" content —
  `IntelligenceCard`s, ranked lists — elevation 1, solid surfaces.
- **Tier 3** (`mc-tier-3`): supporting/contextual detail — flattest,
  quietest color and type treatment.

If a third screen adopts this architecture and the tier-wrapper pattern
grows real per-tier logic (not just a className), extracting a
`TierSection` component at that point would be justified — right now it
would be premature.

---

## What was deliberately NOT extracted this phase

- **`BriefRow`** (Mission Control's compact, click-to-expand Today's
  Brief list row) was left screen-local. It's structurally distinct from
  `IntelligenceCard` (a button-as-row, not a card; expand-on-row-click,
  not a separate toggle button) and has no duplicate elsewhere yet —
  extracting it now would be speculative generalization ahead of a
  second real use case.
- **Card's own `expandable` prop** (a pre-existing, separate mechanism
  on the base `Card` component) was not touched or fixed. It has a real,
  known bug (a fixed 60px collapsed-height clip that can cut off short
  content) — both `IntelligenceCard` and Portfolio's `Portfolio
  Intelligence` card avoid it entirely by managing expand state locally
  instead. Fixing `Card.expandable` itself is out of scope for this
  extraction phase (no screen currently depends on it after this
  refactor) and is noted here as a known follow-up rather than silently
  left undocumented.
- **A generic `useExpandable` hook** was considered and rejected: the
  three real expand/collapse call sites (`BriefRow`, `IntelligenceCard`,
  Today's Brief's own "+N more") each pair the boolean state with
  different, non-generic surrounding behavior (row click vs. a
  dedicated button vs. revealing a list slice) — the actual duplicated
  logic is one line (`useState(false)` + a toggle callback), which does
  not clear the bar for a shared abstraction.
