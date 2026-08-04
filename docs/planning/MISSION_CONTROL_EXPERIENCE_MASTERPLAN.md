# Mission Control Experience Masterplan

### Phase DESIGN-002 (revised in Phase DESIGN-002A) — the permanent UX specification for Mission Control

This document designs Mission Control as the single screen a user opens
every morning before anything else — their personal intelligence command
center. It is written entirely under the authority of
`IMPACTONE_DESIGN_BIBLE.md`; every section reference below (§) points into
that document, and nothing here may contradict it. This is not an
implementation phase — no React, no CSS, no Figma, no code. This is pure
product and UX design: the permanent shape of the experience that a future
implementation phase must build toward.

**Revision note:** this version supersedes the original DESIGN-002 draft.
It was revised in Phase DESIGN-002A to resolve every CRITICAL and as many
HIGH-severity finding as possible from `MISSION_CONTROL_DESIGN_REVIEW.md`,
`MISSION_CONTROL_UX_GAPS.md`, and `MISSION_CONTROL_FINAL_VERDICT.md`,
without redesigning the product or increasing its complexity. Every
substantive change and the reasoning behind it is logged in
`REVISION_NOTES.md`. The philosophy, the Bible's authority, and the
underlying intelligence system (Claims, Attention Engine, Morning Brief)
are unchanged — what changed is the shape of the presentation built on
top of them.

---

## 0. What Mission Control Is

Mission Control is not a dashboard that shows the user everything and lets
them figure out what matters. It is **one continuous intelligence
briefing** — not a page of independent modules, but a single document with
one beginning, one middle, and one deliberate end, the way a trusted
analyst would brief a client face to face rather than hand them a binder
of tabs. Per the Design Bible's Core Philosophy (Bible §1) and Mission
Control's screen philosophy (Bible §8), the screen answers exactly one
primary question — **"What matters today?"** — and a secondary one —
**"What changed since I last looked?"** — and nothing else is allowed to
compete with those two questions for the user's first ten seconds.

### 0.1 Why "one briefing," not "ten sections" (resolves Review §1, §6; Gaps #1, #5 — CRITICAL)

The original draft of this document specified ten independently-rendered
sections, each with its own elevation, motion, density, and interaction
rules. That is, structurally, a very well-organized dashboard — the review
was right to name this directly, and this revision does not pretend
otherwise. A dashboard is not made into an "operating system" by writing
more careful rules for each of its widgets; it is made into something else
by having *fewer, reused* rules that the whole experience shares, so the
user perceives one coherent object rather than a well-curated collection.

This revision makes one structural move that resolves this at the root:
**the ten original sections are consolidated into three narrative tiers**,
each tier sharing exactly one visual/motion treatment across everything
inside it. The content the user needs (today's brief, the single most
important thing, risk, opportunity, portfolio impact, claim changes,
market context, calendar, further reading) is unchanged — nothing named in
the original mission is removed — but it is now organized as **one
scrolling briefing in three acts**, not ten independently-specified
widgets. Where the original document justified premium quality by writing
more rules, this revision earns it by writing fewer, and reusing them.
This is the single most important change in this revision and everything
below is organized around it.

---

## 1. Primary Goal

Within 90 seconds, without asking the platform a single question (Bible
§2.6, Zero Prompt Experience), the user must know:

1. What changed overnight
2. What matters most today
3. How it affects them personally
4. Where risk increased
5. Where opportunity appeared
6. What deserves monitoring

Every part of the briefing below is built backward from this list — each
of the six answers has an explicit home, and nothing exists that doesn't
serve one of them. **The true first-impression bar is 5 seconds, not 90**
(Review §1) — 90 seconds is full comprehension; 5 seconds must already
deliver a real, specific, personally-relevant fact, not merely an
entrance animation resolving. §3.1 below is designed and tested against
that 5-second bar explicitly, not just the 90-second one.

---

## 2. The Experience — What It Must Feel Like

Mission Control must feel like a single, calm briefing handed to the user
by someone they trust — not a wall of widgets they have to interpret
themselves (Bible §0, §2.8), and not a well-organized *collection* of
widgets either (§0.1 above). Concretely, that means:

- **The user perceives one object, not several.** Scrolling through
  Mission Control should feel like turning pages in one document, not
  navigating between distinct panels. This is achieved structurally (§0.1,
  three tiers instead of ten sections) and visually (§4.1 below, one
  recognizable visual signature reused throughout).
- **Nothing is equal — with exactly one named, deliberate exception.**
  Every object has a visibly different weight, except the one place two
  things are *intentionally* shown as equals because together they form a
  single balanced idea (§3.2 below resolves this explicitly — see Review
  §2's second finding).
- **Depth is structural, not stylistic** — an elevated object is elevated
  because it's genuinely more important (Bible §4.3), never because
  floating "looks premium."
- **Motion is rare and meaningful** — the screen is calm by default; when
  something moves, it's because something genuinely changed (Bible §2.4,
  §6).
- **The vocabulary is taught, not assumed** (§8 below resolves this
  directly — see Review §3, Gaps #3, CRITICAL).

---

## 3. The Briefing — Three Tiers, One Continuous Flow

The original ten sections are preserved as **content**, but restructured
into **three tiers**, each with exactly one shared visual/motion treatment.
This is the resolution to Review §6/Gaps #5 ("premium is asserted, not
architecturally earned") — reduction of distinct treatments, not addition
of more rules.

| Tier | Contains | Shared treatment |
|---|---|---|
| **Tier 1 — The Brief** | Today's Brief, led by Top Priority as its first, hero item | Highest elevation, the one place glass + the Emphasis surface material appear, the Confidence Arc signature at full size |
| **Tier 2 — Your Signals** | Key Signals Today (Risk + Opportunity, paired), Portfolio Intelligence, Claims Changing | Elevation 1, solid surfaces, the Confidence Arc signature at compact size, no glass |
| **Tier 3 — Context & Continuation** | Context & Calendar (Market Pulse + Upcoming Events), a one-line Feed teaser, a closing Session Summary | Flattest elevation, quietest color use, no Confidence Arc (this tier is deliberately background, not findings) |

Only **three** distinct visual/motion rule-sets exist across the entire
screen — not ten. Every section below is described in terms of which tier
it belongs to; a reader should notice that most of each section's
"visual hierarchy / elevation / motion / 3D behavior" answer is simply
"inherits its tier's treatment," which is the point: repetition across
content is what makes the screen read as one system.

### 3.1 Tier 1 — The Brief (Today's Brief, led by Top Priority)

**Purpose**: the single canonical entry point and the screen's one
unmistakable visual starting point — the Morning Brief, with its single
highest-priority item promoted to be the literal first thing rendered,
not a separate section competing with it for primacy.

**Resolves the hierarchy contradiction (Review §2, Gaps #2 — CRITICAL).**
The original document specified Today's Brief (§3.1) and Top Priority
(§3.2) as two separate, sequential sections, then separately claimed the
eye lands on Top Priority first — a direct, unreconciled contradiction the
review correctly flagged. This revision removes the contradiction at the
source: **there are no longer two sections.** Top Priority *is* the first,
visually dominant item inside Today's Brief — larger, more elevated, with
the one-time emphasis pulse (Bible §6.7) — followed immediately beneath,
in the same continuous card group, by the remaining 4-7 Brief items at a
visibly smaller scale. There is now exactly one candidate for "the first
thing the eye lands on," because there is exactly one place it could be:
the top of the one section that is, by construction, first.

**Why it exists**: because the mission is "zero prompt" (Bible §2.6) —
the user must never have to go looking for a summary, and must never have
to resolve, themselves, which of two adjacent things is more important.

**Visual hierarchy**: the hero item (formerly "Top Priority") is rendered
at a distinctly larger scale, elevation 2 verging toward the Emphasis
surface material (Bible §3.5) — the *only* object on the entire screen
permitted that material. The remaining Brief items beneath it are
standard elevation-2 cards, visibly smaller, in descending order.

**What the hero item shows** (true 5-second test, Review §1): one
headline, one plain-language sentence, and one Confidence Arc (§4.1) —
nothing else. This is deliberately less than the original spec's "one
sentence + Attention Score + Recommended Attention Level" — see §3.5 for
why those three signals are now one.

**Priority**: highest on the screen, no exception.

**Collapsed state**: hero item fully visible; remaining Brief items show
their headline only, with the full one-sentence explanation revealed on
expand.

**Expanded state**: all 5-8 real items visible, each still capped to one
sentence — depth beyond that belongs on the Symbol Page or AI Analysis,
never here (Bible §8).

**Interactions**: tapping the hero item or any Brief item opens its source
as a floating panel (elevation 3) — the user glances and returns without
losing their place.

**Motion**: on load, the hero item resolves first and alone, then the
remaining items stagger in beneath it (Bible §6.10) — the sequencing
itself reinforces "this one, then these others," rather than ten items
appearing as an undifferentiated batch.

**3D behavior**: the hero sits at a small, distinct elevation step above
the rest of the tier (Bible §4.3, §4.4) — one clear step, not a
gradient the user has to study to read correctly.

**Information density**: the lowest on the screen, and now genuinely
delivers its promise inside 5 seconds, not just 10 (Review §1) — one
headline, one sentence, one arc.

### 3.2 Tier 2 — Key Signals Today (merged Risk + Opportunity)

**Resolves Review §2's second finding and Review §7/Gaps #6, #13 (HIGH,
MEDIUM).** The original document specified Biggest Risk and Best
Opportunity as two separate, fully-specified sibling sections, deliberately
equal in weight — directly contradicting the stated principle that
"nothing is equal." This revision does not remove the equal weighting
(it remains the right call, for the reason the original document gave:
avoiding editorial bias toward pessimism or optimism) — it **names the
exception explicitly, once, as policy**, so it is a documented design
decision rather than an unacknowledged contradiction:

> **The one deliberate tie in this entire hierarchy.** Risk and
> Opportunity are the only two objects on Mission Control ever shown at
> equal visual weight, because together they are not two competing
> findings — they are the two honest halves of one finding ("here is the
> balanced picture today"). Every other pairing or list on this screen is
> ranked; this one, by design, is not, and this is the only place that is
> true.

Structurally, Risk and Opportunity are now also **one section**, not two
— "Key Signals Today" — addressing the Attention Economy note that they
could be merged (Gaps #13) while preserving both halves in full.

**Purpose**: the answer to "where did risk increase" and "where did
opportunity appear," shown together as one balanced picture.

**Visual hierarchy**: Tier 2 treatment (elevation 1, solid surface). Two
side-by-side (or stacked on narrow layouts) halves within one section
frame, using the Risk and Opportunity semantic hues (Bible §5) at
restrained intensity — never alarmist, never celebratory.

**Collapsed state**: one headline + one Confidence Arc per half.

**Expanded state**: adds the top 1-2 real evidence entries and real
portfolio impact magnitude, per half.

**Interactions**: each half opens into its own Claim's evidence view.

**Motion**: a new or worsened item since last session plays the one-time
strengthening/weakening color transition (Bible §6.9); otherwise static.

**3D behavior**: inherits Tier 2 treatment exactly — no glass, elevation 1.

**Information density**: low; one risk, one opportunity, clearly stated.

### 3.3 Tier 2 — Portfolio Intelligence

**Purpose**: the answer to "how does this affect me," at the whole-
portfolio level.

**Why it exists**: a user's real financial stake is in the whole
portfolio, not any one position — consistent with Portfolio Widget
doctrine (Bible §7.10: "what changed" before "why" before "evidence"
before "scenarios").

**Visual hierarchy / 3D behavior**: Tier 2 treatment throughout — no
independent elevation rule beyond what §0.1's table already establishes.

**Collapsed state**: real total value change since yesterday, a compact
count of "claims affecting your portfolio," top 1-2 affected holdings.

**Expanded state**: full "what changed since yesterday" breakdown, then
the real Claims affecting those positions in Why → Evidence → Counter-
Evidence → Scenarios order (Bible §7.10, §8) — a genuine drill-down, full
depth still lives on the Portfolio screen itself.

**Interactions**: "Open Portfolio" leads to the full screen; expand stays
local for a quick look.

**Motion**: a single, restrained count-up/down transition on first view of
the session, never repeating.

**Information density**: medium — governed by "what changed" leading every
sub-block.

### 3.4 Tier 2 — Claims Changing

**Purpose**: the answer to "what deserves monitoring" — Claims that
transitioned since the user last looked.

**Why it exists**: "Living Intelligence" (Bible §2.9) requires the
platform to make its own belief-revision visible.

**Resolves Review §5's trust-risk finding (Gaps #11, MEDIUM).** The
original document treated visible belief-revision as unambiguously
trust-building, without weighing that frequent visible reversals can read
as *inconsistency* rather than *transparency*, especially for a user
without an established track record with the product yet. This revision
adds one explicit mitigation, applied every time this section renders a
change: **the reason is always shown inline, never the status change
alone.** A row never simply says "AAPL: weakening" — it always pairs that
with the one-sentence real cause ("new evidence contradicted the prior
thesis"), and, for a user's first several encounters with this section
specifically, the row is captioned once with a short, honest framing note
— *"The platform updates its view as new evidence arrives — this is it
working correctly, not a mistake being corrected."* This caption is a
first-encounter teaching moment (§8) and is never repeated once learned.

**Visual hierarchy**: Tier 2 treatment, organized as a compact ranked list
(Bible §7.4) rather than individual cards.

**Collapsed state**: a short list (3-5 rows) of symbol + direction of
change, using the exact semantic hues from Bible §5.

**Expanded state**: each row expands in place to reveal the one-sentence
reason (now mandatory, per the mitigation above, not optional).

**Interactions**: row tap opens the Claim's full history.

**Motion**: new rows may carry the one-time strengthening/weakening color
transition; the list reorders using the priority-animation doctrine
(Bible §6.8) if a live update arrives while the user is present.

**Information density**: medium-low.

### 3.5 Tier 1/2 — One Signal, Not Three: The Confidence Arc

**Resolves Review §3's redundancy finding and Gaps #7 (HIGH).** The
original document gave every Brief item three separate indicators —
a numeric Attention Score, a Confidence figure, and a discrete
Recommended Attention Level badge (High/Medium/Low) — three expressions
of what is, in practice, one underlying judgment. This revision collapses
all three into **one signal, used everywhere a score of this kind appears
on the screen**: the **Confidence Arc** — a small partial radial arc
(fill proportional to the real Attention Score) whose color is drawn from
a single High/Medium/Low-mapped semantic range (Bible §5's Attention hue,
graduated by intensity rather than switched between three different
badge colors).

The arc alone answers "how much should I trust and prioritize this" at a
glance — no separate badge, no separate number, needed to read it
casually. The exact numeric score and its plain-language explanation
(Bible's Attention Engine `attentionScore`/`attentionExplanation` fields)
remain fully real and available — they appear on tap/expand, for the user
who wants the underlying number, never hidden or discarded, only no
longer forced into the collapsed, 5-second view three times over.

This single, repeated shape is also this revision's answer to §4
(Differentiation) below — see §4.1.

### 3.6 Tier 3 — Context & Calendar (merged Market Pulse + Upcoming Events)

**Resolves Gaps #14 (MEDIUM) and Gaps #15 (MEDIUM) together.** Market
Pulse and Upcoming Events are merged into one compact, clearly-secondary
section, consistent with the document's own "postpone what isn't
essential" logic finally being applied to its own lowest-urgency content.

**Purpose**: brief market-wide context, plus forward-looking awareness of
scheduled catalysts — both genuinely useful, both explicitly optional
reading.

**Visual hierarchy**: Tier 3 treatment — the quietest section with real
findings in it; smaller type scale, neutral color use, explicitly signals
"this is context, not a personal finding."

**Collapsed state**: one sentence of market sentiment context, plus the
next 2-3 relevant dated events.

**Expanded state**: adds disclosed sentiment confidence/missing-inputs
detail; adds a fuller, still date-capped events list. **Each event now
states its real comparison point when one exists** (e.g., a consensus
expectation to compare a result against), and honestly discloses "No
comparison benchmark available yet" when it doesn't — resolving Gaps #15's
completeness gap without fabricating a benchmark the platform doesn't
actually have.

**Interactions**: tapping an event links to the relevant symbol; this
section is otherwise read, not acted on.

**Motion**: static by default; a market-wide sentiment shift large enough
to matter may earn one restrained transition.

**Information density**: low.

### 3.7 Tier 3 — Feed Teaser (demoted; resolves Gaps #9, HIGH)

**The original "Live Intelligence Feed" section is no longer rendered
inline as full News Cards.** The review correctly identified that placing
the single highest-density section immediately beneath the most curated
content on the page risks undoing the screen's entire discipline — inviting
"scan everything" behavior at the exact point the design's real job
(bounding and prioritizing) was already finished.

This revision replaces the inline feed with a single, honest one-line
teaser: *"14 more items in today's feed"* (the real count, never
rounded or invented), with one tap leading directly to the full Daily
Feed screen, where that screen's own full News Card treatment (Bible
§7.11) already exists and does this job properly. Mission Control states
that more exists and exactly how much; it does not attempt to also *be*
the Daily Feed screen.

**Visual hierarchy / density**: the single lowest-emphasis line of text on
the whole screen — smaller than even the Context & Calendar section.

**Interactions**: one tap to the full Daily Feed screen.

**Motion / 3D behavior**: none.

### 3.8 Tier 3 — Closing: Session Summary (resolves Gaps #12, MEDIUM; replaces "Continue Exploring")

**Two changes here.** First, per Gaps #8 (HIGH) — "Continue Exploring"
likely duplicates existing global navigation. This revision removes it as
a standalone section: every section above already contains its own
contextual link onward ("Open Portfolio," "Open Daily Feed," a tap into a
Claim's Symbol Page) exactly where that link is relevant, and the
product's persistent global navigation (which any multi-screen product
must already have) remains the way to reach Portfolio, Watchlist, Symbol
Pages, and AI Analysis directly. A dedicated exit-navigation section at
the bottom of the daily briefing was redundant chrome competing for
scroll and attention, and it is removed.

Second, per Gaps #12 (MEDIUM), the emotional arc previously ended by
simply fading into decreasing visual energy, with no deliberate closing
beat. This revision replaces the removed navigation section with a short,
calm, **intentional close**: one plain-language sentence summarizing the
whole briefing just delivered — e.g., *"That's today's briefing: 1 item
needs your attention, 2 are worth knowing, and the rest is quiet."* — a
real, computed count (never a template filler), stated once, at the
bottom of Tier 3.

**Visual hierarchy**: the quietest object on the screen, but a *deliberate*
one — a single centered line, not a fading trail-off.

**Interactions**: none required; this is a closing statement, not a call
to action.

**Motion**: none.

**Information density**: minimal, and final.

### 3.9 Why This Exact Order Is Psychologically Optimal

The order is a deliberate descent through three cognitive phases, now
mapped directly onto the three tiers:

1. **Orient (Tier 1)**: answer the single most urgent question — "what
   matters" — before anything else can be processed, with the hierarchy
   contradiction resolved so there is exactly one place the eye can start.
2. **Personalize and balance (Tier 2)**: the personal, two-sided picture —
   Key Signals' deliberate, named balance prevents loss-aversion bias by
   design, then Portfolio Intelligence and Claims Changing ground it in
   full personal context, each transition now honestly explained rather
   than presented as a bare status flip.
3. **Contextualize and close (Tier 3)**: broader market context, a count
   of what else exists (never its full weight), forward-looking awareness,
   and a deliberate, computed closing line — in that order, each
   progressively less urgent, ending with intent rather than trailing off.

This descending-urgency structure, now expressed as three tiers instead of
ten independent sections, is what makes the screen feel like it respects
the user's time *and* like one coherent object: nothing important is ever
buried beneath something less important, and the whole experience is read
using only three visual grammars, not ten.

---

## 4. A Screenshot-Recognizable Identity (resolves Review §9, Gaps #4 — CRITICAL)

**The finding.** Stripped of ImpactOne's specific reasoning vocabulary and
reduced to pure visual structure, the original ten-section layout — a
card-based headline list, a paired risk/opportunity callout, a portfolio
panel, a sentiment gauge, a news feed, an events calendar — reads as
architecturally close to an unusually well-organized Yahoo Finance or
Seeking Alpha homepage. Differentiation lived entirely in reasoning depth
and copy, which is real, but invisible in a screenshot.

**The fix is one recurring, specific visual primitive: the Confidence
Arc (§3.5), used everywhere and only here.**

Every score-bearing object on Mission Control — the hero Brief item, every
other Brief item, both halves of Key Signals, every Claims Changing row —
uses the *exact same* small partial-radial-arc shape to express its real
Attention Score, at a size that scales with that object's tier (largest on
the Tier 1 hero, smallest in the Claims Changing list). No competitor
surface in this product's reference set (Bloomberg, TradingView, Yahoo
Finance, Seeking Alpha) uses a single, repeated arc-fill primitive as its
universal "how much should I trust/prioritize this" mark — those products
default to numeric badges, colored pills, or up/down arrows, precisely
the generic vocabulary this document's original draft also reached for
(Attention Score number + Confidence figure + Attention Level badge).

Concretely, this gives ImpactOne exactly what the mission's screenshot
test requires:

- **A non-card information unit** — the arc itself, distinct from any
  competitor's badge/pill/number convention.
- **A typographic and graphic signature beyond "Display-sized headline"**
  — the arc's fill behavior (a real, continuous fill proportional to a
  real score, never a stepped/discrete bar) is itself a small piece of
  "living intelligence" made visible (Bible §2.9) — it looks like an
  instrument reading, not a badge.
- **A compositional signature** — the three-tier structure (§3) is itself
  visually distinctive: most competitor "personalized homepage" layouts
  are flat grids of equal-weight modules; ImpactOne's is a single
  hero-led briefing that visibly narrows in density and visually quiets
  down as the user scrolls, which is recognizable as a *shape*, not just
  as content.

A single screenshot of Mission Control — hero item with a large arc at the
top, two balanced Key Signal halves each with a small arc, a portfolio
strip, a short claims list, quiet context beneath — is now recognizable as
ImpactOne specifically, on visual grammar alone, without needing to read
any of the copy.

---

## 5. Premium Experience, Strengthened (resolves Review §6, Gaps #5 — CRITICAL)

**Premium must emerge from interaction, hierarchy, intelligence, and
restraint — not from aesthetics alone**, and this revision makes that
claim earn itself in four concrete, checkable ways:

1. **Restraint, measured directly.** The entire screen now uses exactly
   three visual/motion treatments (§3's tier table), one repeated scoring
   primitive (§3.5/§4), and one entrance-motion pattern (hero resolves,
   then the rest staggers beneath it, §3.1). This is a direct, countable
   reduction from ten independently-specified rule-sets to three — the
   same discipline Apple and Linear (Bible §0) achieve premium feeling
   through, applied here as an explicit constraint on this document, not
   an aspiration stated once and abandoned.
2. **Hierarchy, resolved rather than asserted.** The one previously
   unreconciled contradiction (Today's Brief vs. Top Priority) is gone
   (§3.1); the one previously unacknowledged "equal weight" exception is
   now named, explained, and limited to exactly one place (§3.2). A
   premium interface is one whose hierarchy a designer could defend
   line-by-line under questioning — this revision is written so that it
   can be.
3. **Intelligence, made legible without jargon.** The Confidence Arc
   (§3.5) lets a first-time user *feel* the platform's confidence level
   instantly, via a real, continuous, physical-feeling fill — before they
   have learned a single piece of vocabulary (§8 covers how the
   vocabulary itself is taught, for the user who wants to go deeper).
   Premium products let a user act correctly on intuition before they've
   read a manual; this is the specific mechanism that makes that true here.
4. **Interaction, honest and calm.** No manufactured urgency (Bible §12)
   anywhere; belief-revision is disclosed with its real reason every time
   (§3.4); a new user's cold start is named and designed for honestly
   (§7) rather than silently producing a generic screen. Premium, in a
   financial product specifically, is most credibly demonstrated by what
   the product *refuses* to do to hold attention it hasn't earned — this
   document's failure-state and voice doctrine (Bible §9/§10, inherited in
   full below) is as much a part of "premium" as anything visual.

What must never appear is unchanged from the Bible (§12) and is restated
here because it is directly load-bearing for this section: no flashing
color, no celebratory gain animation, no countdown urgency, no gamified
streaks or badges, no illustration or mascot filler, no fabricated
confidence. Every one of those is a form of aesthetic premium standing in
for the real thing; this document is built to need none of them.

---

## 6. 3D Language, By Tier

3D and elevation behavior is now specified once per tier (§3's table),
not once per section — this is itself part of the reduction described in
§0.1 and §5. The underlying rules are unchanged from the Bible (§3-4, in
full):

- **Glass usage**: only Tier 1 uses true glass (Bible §3.1) — the only
  content genuinely floating above the rest of the page in a way worth
  revealing through blur. Tier 2 and Tier 3 are solid surfaces throughout
  (Bible §3.5) — glass overuse would cheapen its meaning, and restricting
  it to one tier is itself part of this revision's reduction discipline.
- **Lighting**: one consistent implied top-down light source across the
  entire screen (Bible §3.2) regardless of tier.
- **Depth**: strictly decreasing from Tier 1 (highest) to Tier 3
  (flattest) — one continuous depth gradient, three steps, not ten.
- **Elevation**: Tier 1 hero = highest single object on the page; Tier 1
  remaining Brief items = elevation 2; all of Tier 2 = elevation 1; all of
  Tier 3 = elevation 1 at its flattest, quietest color/type treatment.
- **Hover**: every interactive card raises exactly one elevation level on
  hover (Bible §6.3) — no exceptions, no tier gets a special hover rule.
- **Perspective**: the same few-degrees-only perspective (Bible §4.5)
  applies uniformly across all three tiers; the hero's closer "camera"
  distance is achieved through scale and shadow, not a different angle.
- **Micro animation**: reserved for the specific moments named in each
  section above (hero's first-load emphasis pulse, claim transition color
  shifts, portfolio value count-ups) — never ambient/idle motion anywhere.
- **Layer transitions**: opening any section's expanded state or a linked
  panel uses the standard view-transition doctrine (Bible §6.5) — the
  triggering content recedes slightly, new content arrives from a
  consistent direction, preserving one coherent spatial system.

The screen must feel alive (Bible §2.9) through exactly these small,
earned signals — never through constant motion. A user who sits still on
Mission Control for a full minute should see almost nothing move, and that
stillness is itself the intended feeling: a system that has already done
its thinking and is calmly waiting to tell you about it.

---

## 7. Information Psychology

**Why the eye moves through the page this way**: the human eye is drawn,
in order, to (1) the largest/highest-contrast object, (2) the object
closest to the top of the viewport, (3) color that reads as meaningful
rather than decorative. The Tier 1 hero item now satisfies all three
simultaneously and unambiguously — it is the largest object, the first
object, and the only object using the Emphasis surface material — with no
competing candidate for "the first thing the eye lands on" anywhere else
on the page (§3.1 resolves what was previously a genuine ambiguity).
Every tier beneath is calibrated to be *visibly* quieter than the one
above it, so the eye's natural descending-attention pattern maps exactly
onto the platform's actual priority ranking.

**How cognitive load is minimized**: by strict caps at every level — one
hero item, 5-8 Brief items total, exactly one Key Signals pairing, 3-5
Claims Changing rows, a capped events list, a one-line feed count. No
section is "as long as the data warrants." This revision additionally
minimizes load by cutting the *number of distinct things to learn how to
read* from ten section-treatments down to three tiers and one recurring
score primitive (§3.5) — cognitive load is not only about how much content
appears, but how many different visual languages the user must hold in
their head to read it, and this revision reduces that count directly.

**How stress is reduced**: through the deliberate, now explicitly-named
Key Signals pairing (§3.2), restrained semantic color use (Bible §5), the
complete absence of urgency-manufacturing devices (Bible §12), and the
new mandatory inline reasoning on every Claims Changing transition (§3.4)
— a user is never shown that something changed without simultaneously
being told, honestly, why, which directly prevents the "is this a
problem?" anxiety an unexplained status change would otherwise produce.

**How confidence increases**: through consistent disclosure of the
platform's own certainty via the Confidence Arc (§3.5) on every scored
object, through honest empty/unknown/cold-start states (§9, §7 below)
that build trust precisely by admitting limits, and through the Living
Intelligence signals (Bible §2.9, §3.4) — now explicitly framed, on first
encounter, as the system working correctly rather than left for the user
to interpret unassisted (directly addressing the trust-risk the review
identified).

---

## 8. Teaching the Vocabulary Naturally (resolves Review §3, Gaps #3 — CRITICAL)

**The finding.** The original document used platform-specific terms —
Attention Score, Claim, Contested Claim, Confidence, Recommended Attention
Level, invalidated, strengthened/weakened — throughout, with no proposed
mechanism for a genuinely ordinary investor to learn what any of them mean
before needing them. This is fixed here with a concrete, three-part
policy, not a vague commitment to "add tooltips later":

### 8.1 Plain language is the primary voice; internal terms are secondary

Every internal term is renamed, in all user-facing copy, to its plain-
language equivalent as the primary label, with the internal term appearing
only as a smaller, secondary caption for the user who wants the precise
concept:

| Internal term (backend/engineering) | Primary user-facing label | Internal term's role |
|---|---|---|
| Attention Score | *(expressed only as the Confidence Arc, §3.5 — no number shown by default)* | Available as a small secondary number on tap |
| Recommended Attention Level | *(removed as a separate label — folded into the Arc, §3.5)* | Not shown separately at all |
| Confidence | "How sure we are" | Shown as secondary caption near the Arc on tap |
| Claim | "What the platform believes" | Introduced via the first-encounter teaching moment below |
| Contested Claim | "Evidence is split" | Plain description always shown; "Contested" itself only appears as a small secondary tag |
| Invalidated | "No longer holds up" | Plain phrase primary; "Invalidated" secondary tag |
| Strengthened / Weakened | "Getting more/less likely" | Plain phrase primary; technical term secondary |

This is not a cosmetic renaming exercise — it changes what a first-time
user reads first. The internal, precise vocabulary is preserved (it is
useful for a user who wants to go deeper, and it must stay consistent with
the rest of the product, including AI Analysis's fuller depth), but it is
never the *only* label offered, and it is never the first one read.

### 8.2 First-encounter teaching, once, never repeated

The first time a session encounters a concept that needs more than a
plain-language relabel to understand (specifically: what a "Claim" is at
all, and what visible belief-revision means, per §3.4's mitigation), a
short, honest, inline caption appears directly beneath that first
instance — not a modal, not a popup requiring dismissal, not a hover-only
tooltip (which fails on touch devices and fails the "ordinary investor,
no prior training" bar outright). The caption reads plainly, e.g.:

> *"This is something the platform currently believes, based on real
> evidence — not a prediction with certainty, and not investment advice."*

Once shown, per user, per concept, it never reappears — this is a teaching
moment, not permanent screen furniture, and repeating it after the user
has clearly learned it would itself violate the "nothing crowds the
screen" principle (Bible §2.1).

### 8.3 No separate glossary screen required, and none is proposed

Consistent with "do not increase complexity," this revision deliberately
does **not** introduce a dedicated help/glossary screen, a persistent
"learn more" navigation item, or an onboarding tutorial sequence. The
vocabulary is taught exactly where and when it's first needed (§8.2) and
is otherwise simply not required to read the screen at all, because the
primary labels are already plain language (§8.1). A user who never taps a
single "learn more" affordance can still correctly read every part of
Mission Control using only plain-language labels and the Confidence Arc —
the internal vocabulary is depth for those who want it, never a
prerequisite.

---

## 9. The First 90 Seconds, Second by Second

### 0-5 seconds — The true first impression (Review §1)
The hero item (Tier 1) resolves first, alone, before anything else
animates in — one headline, one plain-language sentence, one Confidence
Arc. **What the user learns, inside 5 real seconds**: the single most
important thing today, stated plainly, with an immediately-legible sense
of how sure the platform is. This is the document's answer to the
review's finding that the original spec only delivered a real 5-second
win for one of the mission's three questions — this revision ensures the
hero alone delivers a complete, self-contained answer to "what matters
most" within that window, with no dependency on reading further.

### 5-30 seconds — Orientation completes, balance begins
The remaining Today's Brief items stagger in beneath the hero (Bible
§6.10), then the eye reaches Key Signals Today, absorbing both the
caution and the encouragement in equal, deliberately-paired measure.
**What the user learns**: the fuller "what happened" picture, plus
"what's working for me and against me today," each backed by a real
Confidence Arc, not a bare assertion.

### 30-60 seconds — Personal grounding
The eye reaches Portfolio Intelligence and Claims Changing. **What the
user learns**: exactly how this affects them personally, in real dollars
and real belief-confidence terms, with every belief change now
accompanied by its plain-language reason rather than presented as a bare
status flip.

### 60-90 seconds — Context and a deliberate close
The user reads the compact Context & Calendar section, notices the
one-line feed count if they want to read further, and reaches the closing
Session Summary line. **What the user learns**: the broader backdrop their
personal situation sits against, what's coming up, and a final, computed
one-sentence recap that closes the briefing with intent — not a fade into
silence, but a clear "that's everything, here's the shape of it" statement.

---

## 10. Zero Prompt Experience

Unchanged in substance from the original design — every tier and section
exists specifically because it's a question a user would otherwise have
had to ask:

- Tier 1's hero pre-answers "if I only have time for one thing, what is
  it," inside 5 seconds.
- The rest of Today's Brief pre-answers "what should I read today."
- Key Signals Today pre-answers "is anything wrong" and "is anything good
  happening" as one balanced answer.
- Portfolio Intelligence pre-answers "did my portfolio do anything
  overnight."
- Claims Changing pre-answers "did the platform change its mind about
  anything" — and now also pre-answers "should I be concerned that it
  did," via the mandatory inline reasoning (§3.4).
- Context & Calendar pre-answers "is the broader market calm" and "is
  anything scheduled I should know about," including, when available,
  what would make a scheduled event actually notable (§3.6).
- The closing Session Summary pre-answers "is there anything I might have
  missed" with a direct, honest count.

Search/chat remain available as an escape hatch for the genuinely unusual
question this screen didn't anticipate — a well-functioning Mission
Control should make most users forget that search bar exists most
mornings.

---

## 11. Personalization, Including Cold Start (resolves Review §8, Gaps #10 — MEDIUM-HIGH)

Mission Control is never the same screen for two different users, and
rarely the same screen twice in a row for the same user. Every tier
reflects real, live personal state:

- **Portfolio**: Portfolio Intelligence, and the portfolio-relevance
  weighting inside the Brief and Key Signals, are computed against the
  user's actual real positions — portfolio relevance is the single
  heaviest-weighted Attention factor, so a held position's Claim never
  loses to an unheld one of comparable confidence.
- **Risk profile**: where a user's investor profile indicates lower risk
  tolerance, the Risk half of Key Signals surfaces even at somewhat lower
  confidence thresholds, and its Confidence Arc's color mapping skews a
  notch more cautious — always a disclosed, real weighting, never a
  silent thumb on the scale.
- **Watchlist**: watched-but-unheld symbols receive elevated treatment in
  Claims Changing and the feed-teaser's underlying count, distinct from
  but visually consistent with genuinely held positions.
- **Open Claims**: only currently-relevant open Claims populate the Brief,
  Key Signals, and Claims Changing; resolved/invalidated Claims appear
  only where explicitly relevant (e.g., one that just became invalidated
  overnight belongs in Claims Changing, with its reason stated per §3.4).
- **Active Scenarios**: available one tap deeper wherever a Claim on this
  screen has real, non-fabricated Scenario Engine output — never shown
  inline at Mission Control's density (Bible §7.9).
- **Learning history**: informs which categories of information a user has
  historically engaged with vs. ignored, as a tie-break signal only when
  items are close in Attention Score — never an override of real
  confidence/relevance ranking.
- **Attention Engine**: the literal, sole ranking mechanism behind every
  ordered list on this screen — never a screen-local re-ranking.

### 11.1 Cold start is named and designed for, not silently absorbed

For a user with no portfolio, no watchlist, and no interaction history —
exactly the moment a first impression matters most, and exactly the gap
the review identified as unaddressed — Mission Control does not silently
fall back to a generic, indistinguishable screen. It **names the cold
start honestly**, using the same voice doctrine as every other honest
state on this screen (Bible §9/§10):

The Tier 1 hero slot, when no real personalized signal yet exists, is
replaced by a single, calm onboarding-equivalent card: *"Personalizing
your briefing — connect your portfolio or add a few symbols to your
watchlist, and this will fill in with what matters to you."* with one
direct action to do either. This is not a fabricated "Top Priority" dressed
up to look personalized when it isn't (which would violate the platform's
honesty principle, Bible §9) — it is the same honest, specific empty-state
discipline applied to the single most important slot on the screen,
because that slot matters too much to fill with a placeholder.

Once real signal exists — even from a single held position or a single
watchlist symbol — the hero slot begins rendering the real, personalized
Top Priority item exactly as specified in §3.1. Two different day-one
users, before connecting anything, will see the same honest onboarding
card; the moment they connect anything real, they diverge immediately.
This directly resolves the finding that identical fallback content for
new users was previously unaddressed by acknowledging it plainly and
designing the exact moment personalization begins.

---

## 12. Failure States

Nothing on Mission Control ever says "No Data" (Bible §9). Every failure/
absence state names *why*, *what's missing*, and *what happens next*.

- **No Claims**: the Brief, Key Signals, and Claims Changing all honestly
  collapse to a calm explanatory state — *"No active Claims yet — the
  platform hasn't formed a belief with enough evidence to surface here.
  Check back as new evidence arrives."* The screen explains emptiness
  rather than hiding the section, because a quiet Mission Control on a
  genuinely quiet day is itself informative.
- **No News**: the feed-teaser line honestly states *"No feed items right
  now — check back soon,"* consistent with the Daily Feed screen's own
  empty state.
- **No Portfolio**: Portfolio Intelligence explains plainly — *"No
  portfolio data yet — place a trade to see your health metrics here"* —
  and the Brief/Key Signals gracefully drop portfolio-relevance weighting
  entirely, falling back to pure confidence/market-impact ranking, with
  that fact disclosed if it changes what's shown. This state and the cold-
  start state (§11.1) are related but distinct: cold start is the *whole-
  screen* onboarding moment; "No Portfolio" here is the same honest
  absence applied locally within Portfolio Intelligence for a user who
  has, say, a watchlist but no live trades yet.
- **No Data (general provider outage)**: any section whose real backing
  data failed to load shows an honest, specific error — *"Live Claims data
  is temporarily unavailable"* — never a silent blank, never a fabricated
  fallback value.
- **Low Confidence**: shown plainly via a mostly-empty Confidence Arc,
  never dressed up to look more certain than it is.
- **Conflicting Evidence (Contested Claims)**: uses the Bible's dedicated
  Contested visual treatment (§5 — the dual-hue "tension between two
  forces" treatment) and its plain-language description always states the
  disagreement directly — *"Evidence is currently split: some signals
  point bullish, others bearish"* — never smoothed into a false single
  verdict.

---

## 13. Emotional Design

The intended emotional journey is deliberate and sequenced, and now closes
with intent rather than fading out (§3.8, resolving Gaps #12):

- **Calm** — established immediately by the restrained motion doctrine
  (§6), the named Key Signals balance (§3.2), and the total absence of
  manufactured urgency (Bible §12).
- **Informed** — established by the Tier 1 hero delivering a real,
  specific, plain-language finding inside 5 seconds (§9), not a vague
  gesture at "market activity."
- **In control** — established by Portfolio Intelligence and Claims
  Changing making the user's own real situation, and the platform's own
  belief revisions (now always explained, §3.4), fully visible and
  traceable.
- **Prepared** — established by Context & Calendar and the honest
  disclosure of Unknowns/low-confidence states throughout — the user
  leaves knowing not just what already happened, but what to watch for
  next, and exactly how sure the platform is about each thing it told
  them.
- **Concluded, not merely finished** — the closing Session Summary (§3.8)
  gives the emotional arc a deliberate final beat: a real, computed
  sentence stating that the briefing is complete and what its overall
  shape was, rather than the experience simply running out of sections.

At every point, the design actively guards against **overwhelm** — the
strict per-tier caps (§7), the three-tier density gradient (§3, §6), and
the hard rule that Tier 1 must deliver its finding inside 5 seconds all
exist specifically to keep total cognitive load bounded regardless of how
much real intelligence the platform generated that day. A quiet day and a
busy day should both take approximately 90 seconds to absorb, and both
should end on the same deliberate closing note — the platform absorbs the
variance in volume, never the user, and never leaves the experience
without a clear sense of having ended.
