# The ImpactOne Design Bible

### Phase DESIGN-001 — the permanent design constitution of ImpactOne

This document is not a style guide for one screen. It is the design
constitution for the entire product, present and future. Every new screen,
every new component, every new interaction must be checked against this
document before it ships. When this document and an existing screen
disagree, the existing screen is wrong and should be scheduled for
correction — this document is the source of truth, not a retroactive
description of what already exists.

This is not a UI implementation phase, not a Figma phase, and not a code
phase. Nothing here is a component library or a token file. It is the
thinking that a token file and a component library must be built from.

---

## 0. What ImpactOne Is

ImpactOne is not a dashboard. A dashboard is a wall of numbers that assumes
the human will do the prioritizing. ImpactOne is an **Intelligence
Operating System** — a system that has already decided, on the user's
behalf, what matters right now, and presents everything else as
deliberately quieter.

The product must feel closer to **Apple Vision Pro + Linear + Nothing +
Porsche + a modern Mission Control** than to Bloomberg, TradingView, or any
typical finance dashboard. Those reference points are not aesthetic
name-drops — each one encodes a specific discipline this product must
inherit:

- **Apple Vision Pro** — spatial calm. Depth used to communicate structure,
  never spectacle. Glass that feels like it belongs to physical space, not
  a filter applied to a rectangle.
- **Linear** — obsessive information density control. Every pixel earns
  its place. Keyboard-first respect for the user's time. Motion that is
  fast, not decorative.
- **Nothing** — restraint as a brand value. Dot-matrix precision,
  transparency as material honesty (you can see the mechanism), and a
  refusal to add ornament just because space is available.
- **Porsche** — engineering confidence expressed through simplicity, not
  through chrome. A Porsche dashboard has exactly as many dials as it
  needs and not one more. Precision over decoration.
- **Modern Mission Control** — every object on screen is there because
  someone's job depends on reading it correctly and fast, under real
  stakes. Nothing is ornamental in a room where decisions get made.

If a design decision cannot be justified by reference to one of those five
disciplines, it does not belong in ImpactOne.

---

## 1. Core Philosophy

Every visual decision, without exception, must communicate one or more of:

- **Clarity** — the user understands what they're looking at in under one
  second.
- **Priority** — the user understands what to look at *first* without
  having to work it out themselves.
- **Confidence** — the user can see, at a glance, how sure the platform is
  about what it's telling them.
- **Focus** — the interface never asks for attention it hasn't earned.
- **Depth** — information has layers, and the interface shows the user
  which layer they're currently on.
- **Trust** — nothing is decorative, nothing is fabricated, nothing
  oversells.

The interface should never feel crowded. Crowding is not a density
problem — it is a prioritization failure that got pushed onto the visual
layer. If a screen feels crowded, the fix is never "make things smaller."
The fix is deciding what doesn't need to be on screen right now.

Users should be able to answer, without reading a paragraph:

1. **What matters.**
2. **Why it matters.**
3. **How confident the platform is.**

If any screen cannot answer those three questions inside its first
viewport, the screen has failed, regardless of how attractive it looks.

---

## 2. Design Principles

These are the ten laws. Every component, every screen, every future
designer or engineer touching this product answers to these.

### 2.1 Clarity Over Density
More visible data is not more value. A screen that shows 40 numbers and
lets the user drown is worse than a screen that shows 6 numbers the user
actually needed. Density is earned per-screen, never assumed as a default.

### 2.2 Information Hierarchy Over Quantity
Every screen has exactly one primary object, a small number of secondary
objects, and everything else is tertiary or hidden behind a deliberate
action (expand, scroll, drill-in). Hierarchy is expressed through size,
weight, elevation, and position — never through color alone, and never
through "everything is the same size, good luck."

### 2.3 Depth Over Decoration
When the interface uses shadow, blur, or layering, it is because something
is *structurally* above or below something else — a floating action above
a base layer, a modal above a scrim, a focused card above its siblings.
Depth that doesn't map to a real structural relationship is decoration,
and decoration is forbidden.

### 2.4 Motion With Purpose
Every animation answers one question: what changed, or what is about to
change. An animation that exists because "it looks nice when it loads" is
not acceptable. See §6 (Motion Language) for the full doctrine.

### 2.5 Explain Before Detail
Every surface leads with the plain-language explanation before the raw
number, the chart, or the table. A user should never have to reverse-
engineer a chart to understand what the platform believes. The sentence
comes first; the evidence comes after, for the user who wants it.

### 2.6 Zero Prompt Experience
The user should never have to ask ImpactOne a question to get the answer
they came for. If a user has to type "what should I look at today," the
product has failed at its primary job. Morning Brief, Attention Score, and
every "why this matters" surface exist so the platform volunteers the
answer before it's asked. Search and chat are escape hatches for the
unusual case, never the primary interaction model.

### 2.7 Personalization First
Nothing on screen is generic. Every card, every ranking, every "why this
matters" sentence is computed against *this* user's real portfolio, real
watchlist, and real history. A screen that would look identical to two
different users with different portfolios is a screen that has failed to
personalize.

### 2.8 Nothing Is Equally Important
Flat, undifferentiated grids of equal-weight cards are a design failure,
not a neutral default. Every list the platform renders must already be
sorted by what matters, and that sort must be visually obvious — through
size, position, elevation, or emphasis — without the user needing to read
a label that says "sorted by importance."

### 2.9 Living Intelligence
The interface should feel alive, not static. A Claim that strengthened
overnight should visibly feel different from a Claim that has sat
unchanged for a week. This is not achieved through constant motion (that
would violate §2.4) — it is achieved through subtle, deliberate signals:
a freshness indicator, a confidence trend arrow, a gentle one-time pulse
the moment new information arrives. The platform should feel like it is
thinking continuously, even when it is visually calm.

### 2.10 Premium Minimalism
Premium is not more materials, more color, more chrome. Premium is the
confidence to leave space empty. Every element that survives onto a
screen must have fought for its place — if removing it loses no meaning,
it should not have been there. See §12 for the full doctrine on what
"premium" means for this product.

---

## 3. Visual Language

### 3.1 Glass Usage
Glass (translucency + blur) is used exclusively to indicate **layering in
z-space** — a panel that floats above the base content, a modal above a
scrim, a side panel above the workspace it was opened from. Glass is never
used on a base-layer surface that has nothing beneath it to reveal. If
there is nothing to see through, there is no reason for the surface to be
translucent.

Rules:
- Glass surfaces always sit *above* something, and that something must be
  visible (softly blurred) through them. Glass over a flat, empty
  background is decoration and is forbidden.
- Blur radius scales with elevation (§3.3) — a surface one layer up gets a
  light blur; a modal three layers up gets a heavier blur, because it is
  meant to fully separate the user's attention from the base layer.
- Glass never reduces text contrast below the accessibility floor (§13).
  A glass surface's blur/opacity must be tuned per background, not fixed.

### 3.2 Lighting
ImpactOne has one implied light source, coming from above, consistent
across the entire product. This is what makes elevation *readable* rather
than merely coded in a shadow token — a raised card should look like it is
physically closer to a light source above it (a subtle top highlight, a
soft shadow falling below and slightly toward the viewer), the same way a
raised button looks on a well-lit physical console. Every card, panel, and
floating object obeys this single light direction. Multiple, inconsistent
light sources instantly cheapen the interface — this is one of the fastest
ways an interface starts to look like a template rather than a considered
object.

### 3.3 Depth & Elevation
Depth is a discrete, named scale, not a free-floating shadow value picked
per-component. There are five elevation levels:

| Level | Meaning | Typical use |
|---|---|---|
| 0 — Base | The canvas itself | Screen background |
| 1 — Surface | Content sits here by default | Standard cards, list rows |
| 2 — Raised | Something the user is meant to notice first | The #1-ranked card in a ranked list, an active/selected state |
| 3 — Floating | Detached from the flow, follows the user | Side panels, tooltips, dropdowns |
| 4 — Modal | Demands full attention, blocks interaction beneath | Confirmation dialogs, full-screen focus views |

Each level up means: slightly larger shadow blur/spread, slightly cooler
shadow color, slightly more glass blur if glass is used, and a small
scale/brightness increase on the surface itself. An object never jumps two
levels in one interaction — hover raises level 1 to level 2, it does not
jump straight to level 4.

### 3.4 Shadows
Shadows are soft, long, and low-opacity — never hard-edged, never black.
A shadow's job is to make elevation *legible*, not to draw attention to
itself. If a user consciously notices a shadow as a shape, it's too strong.
Shadow color is a desaturated, cool neutral derived from the base surface
color, never a generic `#000000` at low opacity — pure black shadows read
as cheap in a glass/dark environment.

### 3.5 Surface Materials
Three material types exist, and no others:

1. **Solid surface** — flat, opaque, used for the base canvas and for any
   content-dense area (tables, long lists) where translucency would hurt
   legibility.
2. **Glass surface** — translucent + blurred, used only per §3.1's rules,
   for anything genuinely floating above other content.
3. **Emphasis surface** — a solid surface with a subtle inner glow or
   gradient, reserved for the single most important object on a screen
   (the #1 Morning Brief item, an actively-triggered alert). This material
   is intentionally rare — if more than one object per screen uses it, it
   has stopped meaning anything.

### 3.6 Rounded Geometry
Corners are consistently rounded across the entire system, using a small,
fixed set of radii that scale with the size of the object (a small badge
gets a small radius, a full-screen panel gets a larger one) — never an
arbitrary per-component value. Radii read as *engineered*, not soft for
softness's sake: think Porsche interior trim, not a children's app. Sharp
90° corners are reserved for data-dense tabular contexts (tables, dense
grids) where rounding would reduce legibility of aligned columns.

### 3.7 Spacing Philosophy
Spacing is generous by default and tightens only inside data-dense
components (tables, dense lists) where the user has explicitly opted into
density by choosing that view. The base rule: when in doubt, add space, not
a border. Borders and dividers are a last resort for separating content —
whitespace is the first resort. A screen that needs a lot of dividers to
stay organized has a hierarchy problem that more spacing would have fixed
more honestly.

### 3.8 Grid Philosophy
A single, consistent underlying column grid governs every screen, so that
alignment feels intentional across the whole product rather than
per-screen. Cards and panels snap to the grid; nothing floats at an
arbitrary offset. The grid flexes for content, but content never breaks
the grid.

### 3.9 Typography Hierarchy
A small number of type sizes and weights, used with total consistency:

- **Display** — reserved for the single most important number or headline
  on a screen (a Morning Brief headline, a portfolio total). Used
  sparingly; if everything is Display size, nothing is.
- **Heading** — section titles, card titles.
- **Body** — the plain-language explanation sentences (§2.5) — this is
  the most-read size in the product and must be the most comfortable to
  read, not an afterthought sized smaller than it should be.
- **Label** — metadata: timestamps, tags, badges, source attributions.
- **Micro** — the smallest permitted size, used only for legal/attribution
  text that must exist but must never compete for attention.

Weight carries meaning, not just size: a Body-sized sentence in a heavier
weight can outrank a Heading-sized label in visual priority when that's
what the hierarchy calls for. Hierarchy is a combination of size, weight,
color, and position — never any one of those alone.

### 3.10 Whitespace Rules
Whitespace is not empty space to be filled later. It is an active design
tool that tells the user "this group of things belongs together, and this
gap tells you where that group ends." Never fill whitespace with
decoration to make a screen "feel more finished" — an unfinished-feeling
sparse screen is a design success if the sparseness is honest about how
little there genuinely is to say right now (see §9, Empty States).

### 3.11 Icon Philosophy
Icons are thin-line, geometric, and monochromatic by default — they take
color only to carry semantic meaning (§5), never for decoration. An icon
in ImpactOne is a precise instrument marking, like a gauge needle, not an
illustration. No skeuomorphism, no drop shadows on icons, no icon that
requires a caption to be understood in context.

### 3.12 Illustration Philosophy
ImpactOne does not use illustration. There are no mascots, no
hand-drawn empty-state characters, no decorative spot art. Every visual
element on screen is either real data, a real explanation, or a structural
UI element. This is a deliberate, permanent rule, not a placeholder
awaiting a future illustration pass — illustration is emotional filler for
products that don't trust their content to carry the room, and ImpactOne's
content must always be strong enough that it never needs that crutch.

---

## 4. The 3D System

3D in ImpactOne exists for exactly one reason: to make **structural
relationships** (this is above that, this is more important than that,
this is connected to that) physically legible. 3D is never allowed to
exist for spectacle.

### 4.1 Where 3D Is Allowed
- **Floating cards** that represent something genuinely elevated in
  priority (the Morning Brief's top item, an actively-selected symbol).
- **Spatial hierarchy** views where multiple related objects (a claim and
  its supporting evidence, a portfolio position and the claims affecting
  it) are shown with real depth offsets so their relationship is
  immediately legible without a connecting line or label.
- **Glass objects** that genuinely sit above other content per §3.1.
- **The Impact Graph** and any future graph/network visualization, where
  3D depth is the only honest way to show which nodes are causally closer
  to the user's portfolio.

### 4.2 Where 3D Is Forbidden
- Any onboarding, marketing, or empty-state screen. If 3D shows up on a
  screen with no real data behind it, it is decoration by definition.
- Logos, headers, navigation chrome. Structural chrome stays flat — it is
  not a "thing" with a priority relationship to anything else.
- Charts. A price chart, a confidence trend line — these are precision
  instruments and must stay orthographic and flat. 3D on a chart distorts
  the very data it exists to communicate honestly.
- Any object whose depth cannot be explained in one sentence starting
  with "this is above/below/behind that because…"

### 4.3 Floating Cards
A floating card is never floating "for style." It is floating because it
has been raised to elevation level 2 or 3 (§3.3) for a real reason: it's
the top-ranked item, it's the currently-focused object, it's a panel the
user explicitly opened. The float itself (shadow, slight scale, blur
beneath) is the *visual proof* of that elevation, not an independent
decision.

### 4.4 Spatial Hierarchy
When multiple related objects are shown together with depth (e.g., a
Claim in front, its evidence slightly behind and to the side), the depth
ordering must always match the real logical dependency: evidence supports
a Claim, so evidence sits behind/beneath it, never in front. Depth
ordering that contradicts logical dependency is confusing, not elegant.

### 4.5 Layer Depth & Perspective
Perspective is subtle — a few degrees at most. This is Apple Vision Pro's
lesson: convincing depth comes from consistent, gentle perspective and
correct occlusion, not from exaggerated 3D transforms. An object that
looks like it's about to fly off the screen has broken the illusion of
calm spatial depth this product is built on.

### 4.6 Camera Feeling
The implied "camera" is always static and eye-level with the content —
the user is looking directly at their information, not down at it from
above or up at it from below. A consistent camera angle across the whole
product is what makes depth feel like one coherent space rather than a
collection of independently-animated widgets.

### 4.7 Hover Behavior
On hover, an object may rise one elevation level (§3.3) and its shadow may
soften/expand slightly to match. That is the full extent of hover-driven
3D. No tilt-to-cursor, no exaggerated pop, no rotation. The object
acknowledges attention; it does not perform for it.

### 4.8 Micro Parallax
A very small amount of parallax (background layers shifting slightly
slower than foreground layers on scroll or subtle cursor movement) is
permitted specifically to reinforce depth ordering that's already been
established by elevation and blur. It must be nearly subliminal — if a
user consciously notices "the background is moving," the effect is
overtuned. Micro parallax is reinforcement, never the primary depth cue.

### 4.9 Motion Depth
Any object moving in 3D space moves along a physically plausible path
(the shortest, most natural arc between two points), never a stylized
bounce, spin, or overshoot. See §6 for full motion doctrine — this
section is the 3D-specific instance of the same rule: motion earns its
place by clarifying, not entertaining.

---

## 5. Color Language

ImpactOne's color system is **semantic, not branding-driven**. Color exists
to answer one question instantly: *what kind of thing am I looking at, and
what should I feel about it?* A brand palette exists (for logos, marketing,
chrome) but it is kept entirely separate from — and subordinate to — this
semantic system inside the actual intelligence surfaces of the product.

Every semantic color below must be usable independently of hue for
accessibility (see §13.4, Color Independence) — shape, icon, and label
always carry the same meaning the color does, redundantly.

| Semantic meaning | Psychological purpose |
|---|---|
| **Opportunity** | A warm, confident green-adjacent tone. Communicates "this is worth your attention in a good way" without tipping into the alarm-red-adjacent territory that would read as urgent risk. Never the loud, saturated "buy button green" of a trading app — a quieter, more considered green that says "this is worth knowing," not "act now or lose money." |
| **Risk** | A restrained warm red/amber. Communicates real caution without inducing panic. ImpactOne never uses risk color to manufacture urgency the underlying data doesn't support — the exact same red is never used for a mild risk and a severe one; intensity within the risk hue itself carries the magnitude. |
| **Growing confidence** | An ascending, warming tone (a green or blue that reads as "moving upward") paired always with a directional cue (an arrow, a trend line) — color alone never claims a trend without the shape to back it up. |
| **Weakening confidence** | A cooling, receding tone — deliberately not the same as Risk. Something weakening is not automatically something dangerous; conflating the two would be dishonest to the user about what the platform actually knows. |
| **Unknown** | A neutral, desaturated gray-blue. Deliberately calm, never alarming — the platform doesn't know something, and that is a normal, expected state, not a failure state, so the color must not read as an error. |
| **Learning** | A distinct, cool, "in-progress" tone (often paired with subtle motion, see §6.9) — signals the platform is actively gathering evidence, not stuck or broken. |
| **Attention** | A focused, saturated accent reserved *exclusively* for the Attention Score system and Morning Brief prioritization. Because this hue means "the system has decided this matters most," it must never be reused for anything else — reusing it anywhere else would dilute the one signal the entire product's prioritization philosophy depends on. |
| **Resolved** | A settled, quiet tone — calmer and less saturated than Opportunity/Risk, because a resolved Claim is no longer actionable; it's closed history, and its color should communicate "this chapter is closed," not "something is currently happening." |
| **Invalidated** | A distinct muted tone, never simply "Risk red" — invalidation is a fact about the platform's own belief revision (the platform was tracking something and it stopped being true), not a market-risk signal, and conflating the two would mislead the user about what actually happened. |
| **Contested** | A tone that visually reads as "tension between two forces" — often achieved with a split/dual treatment (two hues meeting) rather than a single flat color, since a Contested Claim is definitionally a disagreement between real evidence on both sides. |

### 5.1 Governing rules
- No semantic color is ever reused for a second meaning. If a new concept
  needs a color, it gets a new hue — never a reused one with a "different
  context, so it's fine" justification.
- Saturation and lightness both carry meaning within a hue (e.g., a
  stronger Opportunity is a more saturated Opportunity green, not a
  different color entirely) — but hue itself must never drift as a proxy
  for magnitude.
- Dark mode and light mode share the same semantic hue identities; only
  lightness/contrast are adjusted per mode, never the underlying hue,
  so a user's learned color associations transfer between modes.

---

## 6. Motion Language

Nothing animates merely because it can. Every motion in ImpactOne answers
one of two questions: *what just changed* or *what is about to happen.* If
an animation cannot be described that way, it is decoration and must be
removed.

### 6.1 Durations
Motion is fast by default (150-250ms for most UI transitions) — this is a
Linear-derived value: the interface must feel instantly responsive, never
languid. Slower motion (300-450ms) is reserved for transitions that
represent a genuine spatial/contextual shift (opening a full side panel,
entering a focused symbol view) where a slightly longer duration helps the
user's mental model keep up with a bigger context change. Nothing in the
product should ever exceed ~500ms for a single transition — beyond that,
motion stops feeling premium and starts feeling like latency.

### 6.2 Easing
All motion uses an easing curve that decelerates into its resting state
(ease-out) for anything entering or growing, and accelerates out (ease-in)
for anything leaving or shrinking. Linear easing (constant speed) is
never used — it is the single fastest way to make an interface feel
mechanical and cheap rather than considered. A small, consistent set of
named easing curves is used product-wide; no per-component custom curves.

### 6.3 Hover
Hover transitions are near-instant (under 150ms) and reversible at any
point mid-animation — a user moving their cursor quickly across several
cards must never see a queued-up backlog of half-finished hover
animations. Hover raises elevation by exactly one level (§3.3) and nothing
more.

### 6.4 Expansion / Collapse
Expanding content (an accordion, a "show more" detail panel) animates its
height and opacity together, easing out on expand and easing in on
collapse, and always anchored from the edge closest to the trigger the
user interacted with — content should visibly grow "from" the thing that
caused it to grow, not appear disconnected from the interaction that
produced it.

### 6.5 Transitions Between Views
Navigating between screens or opening a detail panel is treated as moving
through the product's implied 3D space (§4), not as a hard cut. The
outgoing view recedes slightly (scale down, blur up) while the incoming
view arrives from a consistent direction. This reinforces the single
coherent spatial system described in §4.6 rather than treating each screen
as an disconnected slide.

### 6.6 Loading
Loading states never use an indeterminate spinner as the default when a
skeleton is possible — skeletons preserve layout stability and let the
user's eye start orienting to *where* information will appear before it
arrives, which is calmer than a spinner that reveals nothing about the
coming layout. Where a true indeterminate wait is unavoidable, the loading
indicator is quiet, small, and never full-screen — the product should
never make the user feel like the whole system has stopped.

### 6.7 Attention Animations
When the Attention Engine (see the platform's backend Attention Score
system) elevates something to the top of a ranked list, that object may
receive a single, one-time, gentle emphasis (a soft glow pulse, a subtle
scale-in) the *first* time it appears in that position — never a looping
or repeating animation. A repeating pulse on a "you should look at this"
element is exactly the kind of manufactured urgency this product must
never use; one clear signal, once, is enough for an intelligent user.

### 6.8 Priority Animations
Reordering within a ranked list (e.g., Watchlist re-ranking as Attention
Scores update) animates items sliding to their new position rather than
popping instantly — this lets the user's eye track *what moved and why*
instead of forcing them to re-scan the whole list from scratch.

### 6.9 Claim Strengthening / Weakening
A Claim transitioning to STRENGTHENING is marked with a brief, warming
color transition on its confidence indicator (see §5) plus a small upward
directional cue — never a celebratory animation (no confetti, no bounce;
this is a belief revision, not an achievement). A Claim transitioning to
WEAKENING mirrors this with a cooling transition and a downward cue, at
the same restrained intensity — the platform must not visually editorialize
a weakening claim as worse news than a strengthening one is good news;
both are simply real updates to a real belief.

### 6.10 Morning Refresh
When the Morning Brief refreshes with new content, the transition is calm
and deliberate: the previous brief fades back slightly (recedes in
elevation, per §4) while the new brief's items arrive in their ranked
order, top item first, each subsequent item following with a very slight
stagger (on the order of tens of milliseconds, not full seconds) — this
communicates "this was just computed, in this priority order" without
feeling like a slot machine or a dramatic reveal.

---

## 7. Component Philosophy

Every component in ImpactOne must have an explicit answer to five
questions: **Purpose, Hierarchy, Interaction rules, Motion rules, Spacing
rules.** A component proposed without answers to all five is not ready to
ship.

### 7.1 Cards
- **Purpose**: the atomic unit of "one thing worth knowing." A card never
  represents more than one primary idea.
- **Hierarchy**: a card's own internal hierarchy always leads with the
  plain-language explanation (§2.5), then the key metric, then supporting
  detail behind a fold.
- **Interaction rules**: the whole card is a single hit target where
  possible; a card that requires the user to hunt for a specific hot zone
  to interact with it has failed.
- **Motion rules**: hover raises elevation by one level (§6.3); selection
  raises it further and may reveal expanded detail (§6.4).
- **Spacing rules**: internal padding is generous and constant across all
  cards of the same type — never tightened ad hoc to fit more content;
  if content doesn't fit, the content is summarized further, not the
  padding reduced.

### 7.2 Panels
- **Purpose**: a focused, temporary workspace layered above the base
  screen (elevation 3, §3.3) — the Symbol Page side panel is the canonical
  example.
- **Hierarchy**: leads with "why this matters" (per the Symbol Page
  philosophy in §8), then organizes supporting sections beneath in
  descending importance.
- **Interaction rules**: dismissible from anywhere outside its bounds and
  via an explicit close action; never modal-locks the user without an
  obvious way out.
- **Motion rules**: enters via the view-transition doctrine in §6.5,
  exits by reversing the same motion, never a different, cheaper exit
  animation than its entrance.
- **Spacing rules**: sections within a panel are separated by whitespace
  first, dividers only when information density genuinely requires it
  (§3.7).

### 7.3 Charts
- **Purpose**: precision instruments, not decoration. A chart exists to
  make a real trend legible faster than the number alone could.
- **Hierarchy**: the current/most-recent value is always the most visually
  prominent point on the chart; historical context supports it.
- **Interaction rules**: hover reveals exact values without obscuring the
  overall shape of the trend; charts never animate the underlying data
  values to "grow in" repeatedly on every re-render, only on genuine first
  load.
- **Motion rules**: minimal — a chart's job is stillness and precision,
  motion is reserved for the moment new data actually arrives.
- **Spacing rules**: charts get generous surrounding whitespace; a
  cramped chart with no breathing room is a readability failure.

### 7.4 Lists
- **Purpose**: a ranked sequence of comparable things — a list that isn't
  sorted by something meaningful (§2.8) shouldn't exist as a list.
- **Hierarchy**: rank order *is* the hierarchy; the first item must read
  as visually more important through position and, where warranted,
  elevation.
- **Interaction rules**: reordering (§6.8) is animated, never instant, so
  the user can track what moved.
- **Motion rules**: new items entering a list fade/slide in from where
  they logically belong, never appear at the top regardless of their rank.
- **Spacing rules**: consistent row height and internal spacing regardless
  of content length — a longer headline truncates or wraps predictably,
  never stretches the row and misaligns the list.

### 7.5 Tables
- **Purpose**: the one place raw, dense, comparable data belongs — tables
  are the intentional exception to the "explain before detail" (§2.5) rule,
  because a table is what the user explicitly asked for when they wanted
  the raw numbers.
- **Hierarchy**: the primary sort column is visually indicated; no column
  competes with it for attention.
- **Interaction rules**: sortable columns are obviously sortable; sharp
  90° corners are permitted here per §3.6 to preserve column alignment.
- **Motion rules**: sorting animates row reflow the same way list
  reordering does (§6.8) — a table is a list with more columns, not a
  different motion universe.
- **Spacing rules**: this is the one component family permitted to run
  tighter than the generous default (§3.7), because the user has opted
  into density by choosing tabular data.

### 7.6 AI Summaries
- **Purpose**: the plain-language explanation the entire product's
  "explain before detail" principle (§2.5) depends on.
- **Hierarchy**: always the first thing read on any surface it appears on
  — visually the most prominent text block, never squeezed beneath a
  chart or number.
- **Interaction rules**: never truncated without an explicit, honest
  "show more" — never silently cut off mid-sentence.
- **Motion rules**: text appears fully formed, never letter-by-letter
  "typing" animation on repeat views (a typing effect may be acceptable
  exactly once, on a genuinely new/streaming summary, never as a
  decorative default on every render).
- **Spacing rules**: generous line-height and paragraph spacing — this is
  the most-read text in the product and must be the easiest to read.

### 7.7 Claims
- **Purpose**: the atomic unit of platform belief — what the platform
  currently thinks, how sure it is, and why.
- **Hierarchy**: direction (bullish/bearish/neutral) and confidence lead;
  full evidence sits behind, in supporting position (§4.4).
- **Interaction rules**: every Claim is clickable through to its full
  evidence/history — a Claim summary is never a dead end.
- **Motion rules**: strengthening/weakening treatment per §6.9; status
  transitions (e.g., to CONTESTED/INVALIDATED) get their own color per §5,
  never reuse Risk red.
- **Spacing rules**: consistent internal structure across every screen
  that renders a Claim card, so a user learns the shape once and
  recognizes it everywhere (Mission Control, Portfolio, Symbol Page, AI
  Analysis all render "a Claim" identically in structure).

### 7.8 Evidence
- **Purpose**: the "why" behind a Claim, made inspectable on demand.
- **Hierarchy**: supporting and counter-evidence are always shown as
  visually distinct groups, never interleaved — a user must be able to
  see "the case for" and "the case against" as two clear bodies.
- **Interaction rules**: evidence entries link back to their real source
  (which engine, what was observed) — never presented as unattributed
  assertion.
- **Motion rules**: revealed via the expansion doctrine (§6.4), not a
  separate navigation.
- **Spacing rules**: each evidence entry is its own short block, never a
  dense run-on paragraph mixing multiple observations.

### 7.9 Scenarios
- **Purpose**: honestly bounded "what could happen next," never a
  prediction dressed as certainty.
- **Hierarchy**: presented as parallel, comparably-weighted possibilities
  (never one scenario visually dominating as if it were the "real" answer)
  unless the platform has a genuine, disclosed reason to weight one higher.
- **Interaction rules**: where the underlying Scenario Engine has no real
  data yet, this is disclosed honestly (§9) — never a fabricated scenario.
- **Motion rules**: minimal; scenarios are read carefully, not skimmed,
  so motion here should never rush the user.
- **Spacing rules**: generous — this is dense conceptual content and
  needs room to be read slowly.

### 7.10 Portfolio Widgets
- **Purpose**: "how does this affect me" made concrete and personal
  (§2.7) — every widget here reflects the user's real, live portfolio,
  never a generic market view.
- **Hierarchy**: what changed leads (per the Portfolio screen philosophy,
  §8), followed by why, then evidence, then scenarios — this order is a
  product-wide rule, not a per-widget choice.
- **Interaction rules**: every number is traceable back to a real
  position — no aggregate figure without a path to its components.
- **Motion rules**: value changes since last view may receive a brief,
  single count-up/down transition on first load, never a repeating tick.
- **Spacing rules**: generous, matching the Card doctrine (§7.1) — a
  portfolio widget is a card first, a data table second.

### 7.11 News Cards
- **Purpose**: answer "why do I care" about one real event, immediately
  (per the Daily Feed screen philosophy, §8).
- **Hierarchy**: headline, then real Attention Score and portfolio
  relevance, then the plain-language "why it matters," then supporting
  detail (affected Claims, sources) behind a fold.
- **Interaction rules**: an item with no real relevance says so honestly
  ("No meaningful impact detected") rather than forcing a relevance
  section to render empty or fabricated (§9).
- **Motion rules**: new items entering the feed follow the list doctrine
  (§7.4/§6.8), never a jarring insert at an arbitrary position.
- **Spacing rules**: one card per event, never compressed into a
  headline-only row — the whole point of this component is that the
  user shouldn't have to click through to understand why something
  matters.

---

## 8. Screen Philosophy

Every screen answers exactly one primary question. If a user cannot state
that question after ten seconds on the screen, the screen has failed,
regardless of how the rest of this document has been followed.

### Mission Control
- **Primary user goal**: start the day already knowing what to do.
- **Primary question**: "What matters today?"
- **Secondary question**: "What changed since I last looked?"
- **Maximum cognitive load**: five to eight prioritized items, full stop —
  never an unbounded feed.
- **Most important object**: the #1 Morning Brief item.
- **Least important object**: any KPI tile that duplicates a number
  available elsewhere (these exist only as glanceable context, never as
  the reason to visit the screen).

### Portfolio
- **Primary user goal**: understand real personal impact, not browse
  recommendations.
- **Primary question**: "How does this affect me?"
- **Secondary question**: "What changed since yesterday, and why?"
- **Maximum cognitive load**: one "what changed" section, one "why this
  affects you" section, both scannable in under thirty seconds; deeper
  detail (concentration, sector risk) is supporting context beneath.
- **Most important object**: the real, personal "what changed since
  yesterday" summary.
- **Least important object**: rebalance suggestions or any speculative
  feature with no real backing engine — shown honestly absent rather than
  competing for attention it hasn't earned (§9).

### News (Daily Feed)
- **Primary user goal**: understand what changed in the world, filtered by
  real relevance.
- **Primary question**: "What changed?"
- **Secondary question**: "Why do I care?"
- **Maximum cognitive load**: each card answers relevance immediately;
  the user should never have to open a card to find out if it matters to
  them.
- **Most important object**: the highest-Attention-Score item currently
  in the feed.
- **Least important object**: a market-wide item with no portfolio
  relevance and no Claim relationship — still shown (transparency), but
  never visually competing with a personally-relevant item.

### Watchlist
- **Primary user goal**: know which tracked symbols deserve attention
  *today*, not which moved most in price.
- **Primary question**: "What deserves attention?"
- **Secondary question**: "Why does this symbol deserve it?"
- **Maximum cognitive load**: ranked by Attention Score, one clear reason
  line per symbol — never a dense multi-column ticker-tape.
- **Most important object**: the top-ranked symbol by real Attention
  Score.
- **Least important object**: raw price movement, deliberately
  de-emphasized relative to its historical prominence on typical finance
  platforms — price is present, but never the primary sort key.

### Symbol Page
- **Primary user goal**: understand the platform's current belief about
  one symbol, immediately.
- **Primary question**: "What does the platform currently believe?"
- **Secondary question**: "What's the evidence, and what would change its
  mind?"
- **Maximum cognitive load**: the "why this symbol matters today" section
  must be understandable before the user scrolls at all; everything below
  is supporting context, in descending importance.
- **Most important object**: the current, highest-confidence Claim for
  this symbol.
- **Least important object**: raw chart/quote data — present because
  users expect it, but explicitly reframed as *supporting context* beneath
  the belief, not the reason the page exists.

### AI Analysis
- **Primary user goal**: get the complete, unabridged reasoning behind a
  belief, when the summary isn't enough.
- **Primary question**: "Explain everything."
- **Secondary question**: "What would prove this wrong?"
- **Maximum cognitive load**: this is the one screen permitted to be
  dense and long — the user has explicitly opted into depth by navigating
  here — but it must still follow the mandated order (Executive Summary →
  Why this matters → Evidence → Counter evidence → Portfolio impact →
  Possible outcomes → Confidence → Unknowns → Things to monitor next) so
  depth never becomes disorganized.
- **Most important object**: the Executive Summary — even on the "explain
  everything" screen, the plain-language answer still comes before the
  detail (§2.5).
- **Least important object**: raw supplementary data feeds (alt-data
  signals, sector comps) — valuable, but placed after the belief-and-
  evidence core, never ahead of it.

---

## 9. Voice

ImpactOne communicates the way a trusted, senior colleague would: **calm,
precise, transparent, confident but never arrogant, and honest about
uncertainty.** It never talks like a trading app trying to provoke action,
and never talks like a legal disclaimer trying to avoid liability. It
talks like someone who has done the analysis and is telling you the truth
plainly.

- **Headlines** are short, declarative, and never use exclamation points
  or engagement-bait phrasing ("You won't believe...", "Urgent!"). A
  headline states the real finding: *"NVDA demand outpaces supply through
  Q3"* — not *"NVDA is about to explode!"*
- **Alerts** state the real fact and the real reason, in that order —
  never just a bare number with no context. An alert is a fact plus its
  significance, never significance manufactured to justify sending the
  alert.
- **Errors** name what actually failed and, where honestly possible, what
  the user can do next. ImpactOne never says "Something went wrong" when
  it can say "Live quote data is temporarily unavailable" — vague error
  language is a trust violation, because it suggests the platform doesn't
  understand its own failure.
- **Warnings** are proportionate to real risk — the same restrained,
  non-alarmist tone the Risk color (§5) uses visually. A warning never
  oversells caution to seem more sophisticated.
- **Unknowns** are stated plainly, as a normal fact, not hedged into
  vagueness or hidden. *"Confidence not yet available"* — direct, no
  apology, no evasive hedge language.
- **AI summaries** always distinguish observed fact from inference from
  prediction, in that order, matching the platform's own internal
  reasoning breakdown — the voice never blurs "what we saw" into "what we
  think will happen" as if they were the same kind of statement.
- **Morning Brief** items read like a briefing from someone who respects
  the reader's time: one clear sentence on what happened, one clear
  sentence on why it matters to *this* portfolio specifically — never
  padded to sound more substantial than the underlying finding actually is.

---

## 10. Empty States

An empty state is never a dead end and never says "No Data." A bare "No
Data" tells the user nothing about whether that's expected, temporary, or
a problem — it is the single most common way finance software makes users
feel like the product is broken or abandoned them.

Every empty state answers three things, briefly:

1. **Why** — is this genuinely empty (nothing has happened yet), or
   unavailable (a provider/engine isn't connected), or filtered (nothing
   currently meets a real threshold)?
2. **What is missing** — named specifically ("no active Claim for this
   symbol yet," not "no data").
3. **What happens next** — when, or under what condition, this will
   change (a claim will appear once evidence accumulates; a comparison
   will appear after the first full day is tracked).

Examples of the voice this requires, already established as precedent
across the product and to be treated as the permanent standard:

- *"No prior-day snapshot yet — this is the first day being tracked."*
- *"Scenario preview not yet available — the Scenario Engine is
  architecture-only today."*
- *"Rebalance suggestions aren't available yet — this app doesn't
  generate them today. Nothing is shown here rather than a guess."*
- *"No meaningful impact detected."* (for a News item that is genuinely,
  honestly irrelevant — this is itself an honest empty state, not a
  fallback string)

An empty state must never be filled with illustration (§3.12) to make it
feel more finished — the honest sentence is the finished state.

---

## 11. Accessibility

Accessibility is not a compliance checkbox appended after design is
finished — it is load-bearing for the same trust the whole product is
built on. An interface a user can't actually read or operate is not a
premium interface, regardless of how it looks to someone who can.

### 11.1 Contrast
Text contrast meets or exceeds WCAG AA at minimum, on every real
background it can appear over — including on glass surfaces (§3.1), where
blur/opacity must be tuned per-background rather than assumed safe from a
single design-time preview. Semantic colors (§5) are chosen and tested for
sufficient contrast in both light and dark modes, not just whichever mode
was designed first.

### 11.2 Motion Reduction
Every animation described in §6 has a reduced-motion equivalent: cross-
fades replace slides/scales, count-ups become instant value updates,
parallax (§4.8) is disabled entirely. Reduced motion is never treated as a
degraded experience — it is a first-class mode, because the underlying
information hierarchy (§2) must communicate everything on its own, with
motion only ever adding clarity on top, never carrying meaning motion-off
users would lose.

### 11.3 Keyboard
Every interactive surface — cards, panels, list items, table sorts — is
fully operable by keyboard, with a visible focus state that follows the
same elevation language (§3.3) as hover, so keyboard users get the same
visual feedback mouse users get, not a generic browser-default outline
bolted on separately.

### 11.4 Color Independence
No semantic meaning (§5) is ever carried by color alone. Every Claim
direction, every risk level, every confidence trend is paired with a
shape (an icon, an arrow, a label word) that communicates the same
meaning without color, so the product is fully legible to colorblind
users and in any accessibility mode that strips color.

### 11.5 Readable Hierarchy
Hierarchy (§2.2, §3.9) is built from structure (heading levels, landmark
regions, reading order) that matches the visual hierarchy exactly, so a
screen reader user experiences the same "what matters first" prioritization
a sighted user sees, not a differently-ordered or flattened experience.

---

## 12. Premium Experience

### What makes ImpactOne feel premium
Premium is not the presence of more visual richness — it is the *absence*
of anything that didn't earn its place. It is the confidence to show a
user five things instead of forty, because the platform trusts its own
judgment about which five matter. It is consistent light, consistent
depth, consistent motion timing across the entire product, so nothing ever
feels like it was bolted on by a different team with different taste. It
is language that tells the truth plainly, including about what the
platform doesn't know. Premium, in this product, is precision — the
Porsche standard: exactly as many dials as are needed, each one accurate,
none of them there to look impressive.

### What must never appear
- Stock trading-app tropes: neon green/red flashing, celebratory
  animations on gains, urgency-manufacturing countdown timers, engagement
  streaks, gamified badges.
- Generic dashboard chrome: dense unstyled tables as a default view,
  undifferentiated grids of equal-weight KPI tiles, sidebar navigation
  crammed with more items than a user could prioritize.
- Illustration, mascots, or decorative spot art of any kind (§3.12).
- Fabricated confidence: a number, chart, or claim presented without real
  data behind it. This is a design rule as much as a data-integrity
  rule — an interface that *looks* certain about something the platform
  doesn't actually know is a premium-breaking trust failure, not a
  cosmetic one.
- Clutter created by treating every available metric as equally worth
  displaying, rather than making the hard editorial call about what
  matters right now.

### What should immediately distinguish ImpactOne
Where Bloomberg and TradingView compete on *how much* they can show you,
ImpactOne competes on how confidently it can tell you what to ignore. The
first five seconds on any ImpactOne screen should feel like being handed a
clear, already-prioritized briefing by someone you trust — not being
handed a wall of instruments and left to figure out which ones matter.
That gap — between "here is everything, good luck" and "here is what
matters, and here's why" — is the entire product, and every rule in this
document exists to protect it.
