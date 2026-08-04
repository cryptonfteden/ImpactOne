# Revision Notes — Phase DESIGN-002A

Source inputs: `MISSION_CONTROL_DESIGN_REVIEW.md`, `MISSION_CONTROL_UX_GAPS.md`,
`MISSION_CONTROL_FINAL_VERDICT.md`. Target: `MISSION_CONTROL_EXPERIENCE_MASTERPLAN.md`.

This document records every substantive design decision made while
resolving the review's findings, the reasoning behind each, and — where a
finding was intentionally left unresolved — why. Nothing here changes the
product; nothing here is code. This is the record of what changed in the
UX specification and why, so the decision trail survives independently of
the masterplan document itself.

---

## Guiding constraint

The mission was explicit: **strengthen, don't redesign; do not increase
complexity.** Every decision below was tested against that constraint
first. Where a fix could have been achieved either by adding a new rule or
by removing/merging an existing one, the removal/merge was chosen whenever
it fully addressed the finding — this is why the net effect of this
revision is a **smaller** specification (three tiers, six content
sections, one recurring visual primitive) covering the exact same content
the original ten-section draft specified, not a larger one.

---

## CRITICAL findings — resolution status: all 5 resolved

### 1. "The document does not defend why it isn't a dashboard" (Review §1/§6, Gaps #1/#5)

**Decision**: consolidate the original ten independently-specified
sections into three tiers, each sharing exactly one visual/motion
treatment. **Why this and not something else**: the review's own
diagnosis was precise — ten *well-specified* things is still ten things,
and premium/OS-grade products (the mission's own named references, Apple
and Linear) achieve their feeling through few, reused treatments, not many
carefully differentiated ones. Adding a "Section 11: Why This Isn't a
Dashboard" essay would have been a rhetorical fix, not a structural one,
and the review explicitly warned against exactly that failure mode
("craft applied to justifying ten separate things is not the same as
achieving the feeling of one coherent thing"). Reducing to three tiers is
the only fix that is true on its own terms rather than merely argued to be
true.

### 2. "Section order contradicts the claimed eye-path" (Review §2, Gaps #2)

**Decision**: eliminate Top Priority as a separate section. It is now the
first, hero-scaled item inside Today's Brief itself.

**Why**: the review identified a literal, unreconciled contradiction —
Today's Brief was section 3.1, Top Priority was section 3.2, yet the
document's own "first 10 seconds" narrative claimed the eye lands on Top
Priority first. Any fix that kept them as two sequential sections would
have needed to either (a) reorder them, which just relocates the same
two-competing-candidates problem, or (b) argue that visual weight
overrides reading order, which the original document already gestured at
in §5 without ever applying it back to this specific contradiction. The
only fix that removes the contradiction rather than re-litigating it is
structural: there is no longer a second section to compete with the
first. This was judged the single highest-leverage change in the entire
revision, because it also directly improves the true 5-second
comprehension bar (see below) and gives Tier 1 a single, describable hero
object for §4's screenshot-identity work.

### 3. "Platform-specific jargon is used without any teaching mechanism" (Review §3, Gaps #3)

**Decision**: a three-part policy — (a) plain-language primary labels for
every internal term, with the internal term demoted to a secondary,
on-tap caption; (b) a one-time, per-concept, inline first-encounter
caption (never a modal, never hover-only); (c) explicitly *no* new
glossary screen, help center, or onboarding tutorial sequence.

**Why (a)+(b) and not a glossary/tutorial**: the mission's own persona is
"an ordinary investor," and a glossary or tutorial only teaches someone
who goes looking for it — exactly the population the review said this
document already fails. Plain-language-first labeling means the screen is
correctly readable with zero vocabulary lookups at all; the first-
encounter caption is reserved only for the one concept (visible belief
revision) that a plain-language relabel alone can't fully defuse the risk
of (see Medium finding #11 below). A dedicated glossary/tutorial was
explicitly rejected because it would have added a new screen/flow to
"teach" a vocabulary this fix mostly makes unnecessary to teach at all —
that would have increased complexity to solve a problem better solved by
reduction.

**Trade-off accepted**: the internal, precise vocabulary (Claim, Attention
Score, Contested, etc.) still exists in the product and is preserved as
secondary/on-tap content, because it must remain consistent with AI
Analysis and other depth screens that legitimately need the precise
terms. This means an advanced user loses nothing; an ordinary user is
never required to learn it.

### 4. "Differentiation is entirely in copy and reasoning, not in anything a screenshot would show" (Review §9, Gaps #4)

**Decision**: introduce one, single, universally-reused visual primitive —
the Confidence Arc — replacing the three separate score indicators
(Attention Score number, Confidence figure, Attention Level badge) the
original draft used per item.

**Why one primitive, and why this specific shape**: the review's test was
explicit — a screenshot, without logos, must be recognizable as ImpactOne.
A new color palette or a new typeface would not have passed that test on
its own (competitors can and do use distinctive palettes/type without
being visually confused with each other structurally). A single, repeated,
non-badge, non-numeric scoring shape — used everywhere a score appears, at
a size that scales with a tier — is a structural signature a screenshot
actually shows, not a stylistic one a screenshot might miss. This decision
also happened to solve two other findings simultaneously (see HIGH #7 and
the "three overlapping signals" issue below), which is why it was chosen
over alternatives that would have solved only the differentiation problem
in isolation (e.g., a distinctive background texture, which would have
had no other benefit and risked violating the Design Bible's ban on
decoration, Bible §2.3/§3.12).

### 5. "Premium feeling is asserted, not architecturally earned" (Review §6, Gaps #5)

**Decision**: no new section was added to "argue" premium quality more
persuasively. Instead, §5 of the revised masterplan states four concrete,
checkable mechanisms (measured reduction to 3 treatments, resolved
hierarchy, jargon-free legibility via the Arc, honest restraint in
interaction) and ties each directly back to a specific structural change
made elsewhere in this revision.

**Why**: this finding was, at its root, the same finding as #1 — the
review's critique was that assertion without structural backing is not
persuasive, so the fix could not itself be another assertion. Every claim
in the revised §5 is a pointer to a change that can be independently
verified elsewhere in the document (the tier table, the hero resolution,
the Arc, the cold-start design), which was the only way to resolve
"asserted, not earned" without simply asserting it more emphatically.

---

## HIGH findings — resolution status: 4 of 5 fully resolved, 1 partially (by design)

### 6. "Biggest Risk and Best Opportunity are deliberately equal — in tension with 'nothing is equal'" (Gaps #6)

**Decision**: keep the equal weighting (it remains the correct call for
avoiding editorial bias), but name it explicitly, once, as the single
documented exception to the "nothing is equal" principle, and merge the
two sections into one ("Key Signals Today") so the exception has exactly
one address in the document rather than being implied across two
independent sections.

**Why not remove the equal weighting instead**: doing so would have meant
either suppressing genuine opportunity signal to avoid tying with risk, or
suppressing genuine risk signal to avoid tying with opportunity — both
would be dishonest to the actual, real balance of evidence on a given day.
The review itself did not ask for the tie to be broken, only for the
contradiction with the stated principle to be reconciled. Naming the
exception explicitly, and limiting it to exactly one place, is the
narrowest fix that resolves the stated contradiction without distorting
what the platform actually knows.

### 7. "Three overlapping signals per Brief item" (Gaps #7)

**Decision**: resolved by the same Confidence Arc decision as CRITICAL #4
— Attention Score, Confidence, and Recommended Attention Level collapse
into one visual object (the arc, fill + color), with the precise
underlying numbers still available on tap, never discarded.

**Why this counts as full resolution, not a partial one**: the review's
specific complaint was that the *collapsed, 5-second view* showed three
redundant signals — it did not object to the underlying data being
tracked in triplicate internally (score, confidence, and a derived label
are legitimately different computations under the hood). The fix
addresses exactly the complaint: the fast-read surface now shows one
thing; the deep-read surface (on tap) still shows everything real.

### 8. "'Continue Exploring' likely duplicates existing global navigation" (Gaps #8)

**Decision**: removed as a standalone section entirely. Contextual
"Open X" links remain exactly where they already existed within other
sections (Portfolio Intelligence's "Open Portfolio," the feed teaser's
link to the full Daily Feed).

**Why full removal, not a lighter version**: the review's point was that
a *dedicated* exit-navigation section is redundant chrome if persistent
global navigation already exists, which it must in any real multi-screen
product. There was no partial version of this fix that wouldn't have
either kept the redundancy or invented a new, thinner navigation pattern
— the latter would have increased complexity, which the mission
explicitly forbade. Removing it also created the opportunity to replace
it with something the emotional-journey critique (MEDIUM #12) actually
needed: a deliberate closing beat, rather than one more navigational
widget.

### 9. "The Live Intelligence Feed's placement risks re-inviting 'scan everything'" (Gaps #9)

**Decision**: demoted from a fully-rendered set of News Cards to a single,
honest one-line count with one link to the full Daily Feed screen.

**Why demotion rather than relocation**: the review's concern was
structural — the highest-density section sitting directly beneath the
most curated content undermines the curation's own discipline, regardless
of where exactly on the page it sits, as long as it's rendered at full
density somewhere on this screen. Moving it lower on the page would not
have solved that; only reducing its density on this specific screen does,
while the Daily Feed screen (which already exists and already does this
job at full density, per `UI_INTEGRATION_ARCHITECTURE.md`) remains exactly
where that experience belongs.

### 10. "Cold-start personalization collapse is unaddressed" (Gaps #10) — PARTIALLY addressed by design, not fully "solved"

**Decision**: the cold-start state is now explicitly named and designed
for — the Tier 1 hero slot renders an honest onboarding-equivalent card
for a user with no portfolio/watchlist/history, rather than silently
falling back to a generic-but-unlabeled version of the same layout.

**Why this is deliberately a partial resolution, not a full one**: the
review's finding was that two different day-one users would see close to
the same screen, and it asked whether that gap should be closed. It
cannot be fully closed without either (a) fabricating personalized-looking
content for a user the platform genuinely knows nothing about yet, which
directly violates the Design Bible's honesty principle (Bible §9) and
this product's core "never fabricate" discipline, or (b) building a
substantially new onboarding flow/questionnaire, which is a product
feature addition, not a UX specification strengthening, and was judged out
of scope for "strengthen, don't redesign." The resolution chosen —
honestly naming and designing the cold-start moment itself, with a clear,
low-friction path to the first piece of real personalization — was judged
the correct scope for this revision: two day-one users will still see the
same *onboarding* card, but that card is now a deliberate, honest design
decision rather than an unacknowledged gap, and the moment personalization
diverges is now explicitly specified.

---

## MEDIUM findings — resolution status: 4 of 4 addressed

### 11. "Visible belief-revision could read as inconsistency, not transparency" (Gaps #11)

**Decision**: Claims Changing now mandates that every transition shown is
paired with its real, plain-language reason, and a first-encounter caption
(§8.2's mechanism) frames the behavior explicitly as "the system working
correctly" the first several times a user sees it.

**Why not remove or slow down belief-revision visibility instead**: doing
so would abandon "Living Intelligence" (Bible §2.9), a core Design Bible
principle from a prior phase that this revision has no authority to
override (the mission for this phase was to strengthen Mission Control,
not to revisit the Bible). The correct scope of fix was to mitigate the
specific risk (misreading a status change as an error) without removing
the transparency that produces it — mandatory inline reasoning plus a
one-time teaching caption does exactly that.

### 12. "The emotional arc ends by fading out rather than concluding with intent" (Gaps #12)

**Decision**: added a closing Session Summary line — one real, computed
sentence recapping the briefing's shape — filling the exact space
vacated by the removed "Continue Exploring" section (HIGH #8).

**Why this pairing was efficient rather than additive**: this is the one
place in the revision where removing something (HIGH #8) and fixing
something else (MEDIUM #12) shared the same slot, which is why the net
section count went down even while adding a genuinely new closing beat —
consistent with "do not increase complexity."

### 13. "Biggest Risk / Best Opportunity could plausibly be merged" (Gaps #13)

**Decision**: merged, as part of the same fix as HIGH #6 above. No
separate work was required — the merge that resolved the "nothing is
equal" contradiction is the same merge this Attention Economy note asked
for.

### 14. "Market Pulse, Upcoming Events, and Continue Exploring occupy three of ten sections for low-urgency content" (Gaps #14)

**Decision**: Market Pulse and Upcoming Events are merged into one
"Context & Calendar" section; Continue Exploring is removed (HIGH #8).
Net effect: three low-urgency sections become one.

### 15. "Upcoming Events doesn't address what would make a scheduled event notable" (Gaps #15)

**Decision**: each event entry now states its real comparison point
(e.g., a consensus expectation) when the platform genuinely has one, and
honestly discloses "No comparison benchmark available yet" when it
doesn't.

**Why disclosure rather than fabrication**: inventing a benchmark the
platform doesn't actually have would violate the "never fabricate" rule
that governs this entire product (see prior phases' explicit "no
fabricated summaries" discipline). The honest-absence pattern used
everywhere else in the Bible's failure-state doctrine (Bible §9) was
applied here rather than inventing a new exception to it.

---

## LOW findings — not separately addressed in this revision

Findings #16 (entrance-animation vs. the 5-second clock) and #17 (whether
sections carry persistent header chrome) were rated LOW in
`MISSION_CONTROL_UX_GAPS.md` and are substantially addressed as a side
effect of the CRITICAL/HIGH fixes above — the hero-first entrance sequence
(§3.1 of the revised masterplan) directly clarifies the animation-vs-clock
question the original document left ambiguous, and the reduction to three
tiers with one shared treatment each implicitly minimizes header chrome
relative to the original ten-section draft. Neither was judged to need a
dedicated, separate fix beyond what the higher-severity work already
produced, consistent with prioritizing CRITICAL and HIGH findings first
as the mission instructed.

---

## What was deliberately left unchanged

- **The underlying intelligence system** — Claims, the Attention Engine,
  Morning Brief, the Portfolio/News/Watchlist/Symbol Page/AI Analysis
  screen philosophies — is untouched. This revision is a presentation-
  layer correction, not a reconsideration of the reasoning architecture
  underneath it, consistent with the Final Verdict's own conclusion that
  "nothing structural needs to be rebuilt."
- **The Design Bible itself** (`IMPACTONE_DESIGN_BIBLE.md`) was not
  modified. Every fix above was achieved within the Bible's existing
  authority (elevation system, semantic color, motion doctrine, voice,
  failure-state doctrine) — no new Bible-level rule was required to
  resolve any CRITICAL or HIGH finding.
- **No other screen was redesigned.** This phase's mission was scoped to
  Mission Control only; Portfolio, News, Watchlist, Symbol Page, and AI
  Analysis's own UX specifications (where they exist) are untouched by
  this revision.
