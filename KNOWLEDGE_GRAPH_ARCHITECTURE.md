# ImpactOne — KNOWLEDGE_GRAPH_ARCHITECTURE.md
## The Permanent Knowledge Graph

**Status:** A design document. It describes the shape of what ImpactOne knows, not how that shape is stored, queried, or served — no database, no API, no code follows from this document directly. It sits beside `TRUTH.md` (how the platform is allowed to know anything) and `EVIDENCE_QUALITY_MODEL.md` (how a single piece of evidence is scored) and answers the question neither of those documents answers: how does one piece of evidence connect to everything else the platform has ever learned? This is a knowledge architecture, described the way a knowledge scientist or epistemologist would describe it — as nodes, relationships, and the rules by which meaning flows between them — not the way a database schema would.

Everything in this document must remain true at a scale of ten years, billions of events, and millions of beliefs. A design that only works at today's scale is not a design this document accepts.

**Terminology:** Every node type in §2 and relationship type in §3 corresponds to a concept defined exactly once in `CANONICAL_DOMAIN_MODEL.md` — this document describes their shape and behavior; that document is the authority on what each one means and how it relates to every other document's usage of the same word.

---

## 1. The Transformation Pipeline

The graph exists to explain one thing: how a fact in the world becomes learning the platform can act on, and how that learning eventually feeds back into judging new facts. This happens in eight transformations, each one a distinct kind of *meaning-making*, not just a data pipeline stage:

**Events → Evidence → Beliefs → Theses → Themes → Companies → Portfolios → Outcomes → Learning**

- **Event → Evidence.** A raw occurrence in the world (a filing, a headline, a vote, a price move) is not yet usable until it is captured with provenance, timing, and a class (per `EVIDENCE_QUALITY_MODEL.md` §1). This transformation is an act of *witnessing* — turning something that happened into something that can be reasoned about.
- **Evidence → Beliefs.** Evidence, alone or in combination, is interpreted into a claim held with a confidence and an uncertainty (`TRUTH.md` §3–§4). This transformation is an act of *interpretation* — the first point at which the platform commits to a view, however provisional.
- **Beliefs → Theses.** Individual beliefs, accumulated and cross-confirmed over time, aggregate into a longer-running narrative about a sector, a trend, or a structural shift. This transformation is an act of *synthesis* — many small, specific claims becoming one durable, slower-moving one.
- **Theses → Themes.** A thesis becomes a Theme when it is judged persistent and broad enough to organize ongoing attention around (AI, Energy, Defense, and so on) — a Theme is a thesis that has earned the status of a standing lens the platform keeps applied, not a one-off conclusion.
- **Themes → Companies.** A Theme's implications are made concrete by identifying which specific companies are exposed to it, and how — this transformation is an act of *attribution*, connecting an abstract narrative to investable specifics.
- **Companies → Portfolios.** A company's relevance is made personal by connecting it to what a specific portfolio actually holds or watches — this transformation is an act of *relevance*, and it is the one place personalization is allowed to operate, changing weighting and attention only, never the underlying belief (`TRUTH.md` §13.10).
- **Portfolios → Outcomes.** A recommendation acted on (or not) against a portfolio eventually resolves into a real, measurable result — this transformation is an act of *reality-testing*, the only place in the graph where the platform's claims meet the world's actual behavior.
- **Outcomes → Learning.** A resolved outcome feeds back — into source reputation, into belief confidence, into thesis durability — closing the loop. This transformation is an act of *revision*, and it is the only transformation permitted to change how earlier transformations behave going forward (never how they are historically recorded — see §6).

Two things about this pipeline matter more than the stage names themselves. First, it is not strictly linear in practice — a single Event can produce Evidence that touches multiple Beliefs across multiple Theses simultaneously, and Outcomes feed Learning that reaches backward into every earlier stage at once, not just the one immediately before it. Second, every transformation is additive, not destructive — an Event does not disappear once it becomes Evidence; a Belief does not disappear once it contributes to a Thesis. The pipeline describes how meaning accumulates upward, not how raw data is discarded on its way there.

---

## 2. Node Types

Every node type below is a distinct *kind of thing the platform can know about*, not a database table. Several correspond closely to structures already established elsewhere in this platform's design (`CanonicalEvent`, the World Memory model, `Recommendation`/`DecisionTrace`); this section names the concept, those other documents own the persistence detail.

### 2.1 Event
Something that happened in the world, at a specific time, independent of whether or how the platform learned about it. An Event exists whether or not it was ever observed — the graph only ever holds the Events it *did* observe, and must never pretend otherwise (an Event node's existence in the graph is itself evidence of observation, not of the event's importance or completeness).

### 2.2 Evidence
A specific, sourced, timestamped account of an Event (or of an absence, per `EVIDENCE_QUALITY_MODEL.md` §2.10) — the unit `EVIDENCE_QUALITY_MODEL.md` classifies and scores. Multiple Evidence nodes may point to the same Event (independent reports of the same filing); an Evidence node never merges into another, even when they agree, because *how many independent accounts existed* is itself meaningful information (`EVIDENCE_QUALITY_MODEL.md` §2.4).

### 2.3 Source
The originator of a piece of Evidence — an outlet, a filer, a named analyst, a regulator, a prediction market. A Source is a node in its own right, distinct from any single piece of Evidence it produced, because a Source accumulates properties over time (reputation, historical accuracy) that no single Evidence node could hold on its own.

### 2.4 Entity
The broadest node type for "a thing evidence and beliefs can be about" — a superclass covering Company, ETF, Country, Sector, and any named person, institution, or instrument not yet given its own specific type. Entity exists so the graph is never blocked from recording a relevant subject just because that subject doesn't yet have a dedicated node type.

### 2.5 Company
A specific investable business. A Company is exposed to Themes, is held or watched inside Portfolios, and is the subject of Recommendations — it is the primary point where abstract narrative becomes a specific, actionable subject.

### 2.6 ETF
A specific investable basket, distinct from a Company because its exposure to a Theme or Sector is itself a composition of other nodes (its holdings), not a single underlying business. An ETF's relationship to a Theme is often more direct and diversified than any single Company's, and must be reasoned about accordingly.

### 2.7 Country
A jurisdiction — the anchor for regulatory Events, macro Evidence, and geopolitical Theses. Country is a node rather than a mere label because national-level Beliefs (about growth, policy, stability) are themselves reasoned-about entities with their own confidence and history, not just tags on other nodes.

### 2.8 Sector
A standard industry grouping (Technology, Energy, Healthcare, and so on) — narrower and more standardized than a Theme, and typically longer-lived. A Sector is what a Company belongs to structurally; a Theme is what a Company is exposed to narratively. The two overlap but are not the same axis.

### 2.9 Theme
A persistent, standing narrative the platform actively tracks (AI, Quantum, Defense, Energy, Space, Cybersecurity, Healthcare, and others as they earn the status — see §1). A Theme carries its own confidence trend, thesis history, and set of exposed Companies/ETFs, and is the graph's primary organizing lens for cross-company, cross-sector reasoning.

### 2.10 Belief
The graph's most granular unit of interpreted knowledge — a specific claim, held with confidence and uncertainty, resting on one or more pieces of Evidence (`TRUTH.md` §3–§4). Belief is the node type every reasoning chain in the graph ultimately passes through; nothing downstream (Thesis, Recommendation) is permitted to rest directly on raw Evidence without an intervening Belief (`EVIDENCE_QUALITY_MODEL.md` §6.3).

### 2.11 Thesis
A durable, broader narrative synthesized from many Beliefs over time (§1, §6.2 of `EVIDENCE_QUALITY_MODEL.md`). A Thesis is versioned, not mutated — each revision is its own node, connected to the one it supersedes.

### 2.12 Recommendation
A decision-shaped node connecting one or more Beliefs (and, where relevant, a Thesis) to a specific, actionable suggestion about a specific Company, at a specific time, with a stated confidence and invalidation condition (`TRUTH.md` §12). A Recommendation is the graph's primary bridge from *knowing* to *suggesting acting*.

### 2.13 Portfolio
A specific set of holdings and watched Entities belonging to a specific context (today, single-tenant; eventually, a real identity). Portfolio is the node type through which Companies and Themes become personally relevant, and the only node type personalization is permitted to touch (`TRUTH.md` §13.10).

### 2.14 DecisionTrace
The immutable record of exactly what evidence, beliefs, and reasoning produced a specific Recommendation at the moment it was made. DecisionTrace is a node type that, once created, gains no new edges pointing into its own reasoning content — only edges pointing *at* it from later nodes (an Outcome grading it, a Lesson learned from it).

### 2.15 Outcome
A graded, real-world result of a Recommendation, measured against reality after the fact (`EVIDENCE_QUALITY_MODEL.md` §6.4). An Outcome is the node type where the graph's claims are checked, not just made.

### 2.16 Lesson
A synthesized, durable piece of learning — often connecting a pattern across multiple Outcomes, Beliefs, or Sources rather than describing just one. A Lesson is never edited once written; a revised understanding is a new Lesson node pointing back at the one it supersedes (`TRUTH.md` §9).

### 2.17 Macro Regime
A standing characterization of the broader economic/rate/liquidity environment (e.g., "tightening," "disinflationary," "risk-off") that many Beliefs and Theses are implicitly conditioned on. Macro Regime is its own node type, not a property of other nodes, because a regime *change* is itself a first-class Event with its own downstream consequences across many unrelated Themes simultaneously.

### 2.18 Supply Chain
A modeled dependency structure connecting Companies, Sectors, and Countries through material/component/service flows. Supply Chain nodes exist because a great deal of real causal propagation (an Event in one country affecting a Company on the other side of the world) only makes sense through this structure — without it, causal edges between distant nodes would have no legible path.

### 2.19 (Reasoning participants) Analyst / Committee Member
A distinct AI Analyst persona or committee role (`TRUTH.md` §11) that produces Beliefs and participates in Recommendations. Modeled as a node, not just a field, because — like Source — an Analyst accumulates its own track record over time and is itself something the platform must be able to reason about and challenge (`TRUTH.md` §14).

---

## 3. Relationship Types

Relationships are typed, directional (except where noted), and — critically — never assumed transitive by default. `A supports B` and `B supports C` does not imply `A supports C`; transitivity, where it exists, is a property of specific multi-hop reasoning (§4.7), never of the edge type itself.

### 3.1 Evidentiary relationships
- **supports** — this Evidence/Belief increases confidence in the target Belief/Thesis.
- **contradicts** — this Evidence/Belief decreases confidence in, or directly conflicts with, the target.
- **cross_confirms** — an Evidence node independently corroborates another Evidence node about the same Event (distinct from `supports`, which connects evidence to belief, not evidence to evidence).
- **derived_from** — this node's content was synthesized or extracted from the target (a Belief derived_from Evidence; a Lesson derived_from an Outcome).
- **cites** — this node explicitly references the target as its stated basis, without claiming full derivation (a Recommendation cites a specific Evidence node among several inputs).

### 3.2 Causal and probabilistic relationships
- **causes** — a claimed direct causal relationship between two Events or Beliefs, always carried with its own confidence (a causal claim is itself a Belief about the relationship, never asserted as a bare fact).
- **increases_probability** — a weaker causal claim: the source node's occurrence makes the target more likely, without asserting direct causation.
- **reduces_probability** — the inverse of `increases_probability`.
- **influences** — the broadest, weakest causal-family relationship, used when a directional effect is believed real but not well enough specified to justify `causes` or a probability-shift claim.
- **precedes** / **follows** — pure temporal ordering between Events, carrying no causal claim at all; a necessary building block for causal reasoning (§4.6) but never itself evidence of causation.
- **co_occurs_with** — two Events or Beliefs are correlated in time without any claimed direction or causal relationship — a deliberately non-causal edge type, used specifically to record correlation the platform is *not* yet willing to interpret further.

### 3.3 Structural relationships
- **belongs_to** — hierarchical/categorical membership (a Company belongs_to a Sector; a Country belongs_to a region grouping).
- **exposed_to** — a Company or ETF's degree of exposure to a Theme, carried with a weight, not a boolean.
- **depends_on** — a structural or operational dependency (a Company depends_on a Supply Chain node; a Thesis depends_on a Macro Regime holding).
- **holds** / **watches** — a Portfolio's relationship to a Company or ETF, the two personalization-relevant membership edges.
- **part_of** — a Belief or Evidence node's membership in a larger aggregate reasoning unit (an Evidence node part_of a specific DecisionTrace's evidence set).

### 3.4 Revision and lifecycle relationships
- **supersedes** — a new version of a Thesis, Lesson, or Belief revision replaces an older one in current standing, while the older node remains permanently in the graph, untouched (`TRUTH.md` §9).
- **invalidates** — a piece of Evidence or an Outcome triggers a Belief or Thesis's own stated invalidation condition (`TRUTH.md` §5), forcing mandatory reconsideration.
- **strengthens** — new corroborating information raises confidence in an existing node without superseding or replacing it.
- **weakens** — new conflicting information lowers confidence in an existing node without necessarily invalidating it outright.
- **grades** — an Outcome node's relationship back to the Recommendation/DecisionTrace it evaluates.
- **teaches** — an Outcome or a pattern across many Outcomes produces a Lesson.

### 3.5 Personal/contextual relationships
- **relevant_to** — a general-purpose weighted edge connecting a Belief, Thesis, or Company to a specific Portfolio's context, the mechanism through which personalization ranks without altering underlying truth.
- **conditioned_on** — a Belief or Thesis's implicit dependency on a Macro Regime holding true; when the regime changes, every Belief conditioned_on it is flagged for mandatory reconsideration, exactly like an invalidation trigger.

---

## 4. Propagation

Propagation is how meaning, confidence, and conflict move through the graph beyond a single edge — the part of this design that most determines whether the graph is actually useful at scale, or just a large pile of correctly-labeled but disconnected facts.

### 4.1 Evidence inheritance
A Belief inherits the *quality ceiling*, not the raw score, of its best supporting Evidence — a Belief resting on five Rumor-class pieces of evidence does not average up to Secondary-class confidence; it remains capped near Rumor-class reliability regardless of volume (`EVIDENCE_QUALITY_MODEL.md` §2.1, §2.4). A Thesis inherits the *distribution* of its constituent Beliefs' quality, not just their average — a Thesis built on twenty high-quality Beliefs and two low-quality ones should visibly reflect that mixture, not blend it into one number that hides the weak links.

### 4.2 Confidence propagation
Confidence moves outward from where new evidence lands, attenuating with each hop, and along typed edges only — `supports`/`strengthens` raise a target's confidence, `contradicts`/`weakens` lower it, and the *magnitude* of propagation is a function of both the edge's own weight (§4.4) and the source node's own confidence (a low-confidence Belief cannot strongly propagate confidence to what it supports, no matter how directly it connects). Propagation past a Belief into a Thesis is always damped relative to propagation within a single Belief's own evidence set — one new piece of evidence should meaningfully move the Belief it directly supports, and only slightly move the Thesis several hops away, by design (this is what makes a Thesis durable rather than as reactive as a Belief).

### 4.3 Conflict propagation
Conflict does not cancel out as it propagates — it accumulates as *visible tension*, never as a silently netted number (`TRUTH.md` §6). When two Beliefs feeding the same Thesis are in conflict, the Thesis node must carry that conflict forward as a recorded property of the Thesis itself (elevated uncertainty, an explicit note of internal disagreement), not resolve it invisibly on the Thesis's behalf. Conflict that reaches a Recommendation must surface in that Recommendation's stated uncertainty and, where material, its disclosed counter-case — conflict is only ever "resolved" by new evidence genuinely tipping the balance (§4.2), never by aggregation math alone.

### 4.4 Relationship weighting
Every relationship carries a weight, and every weight is itself a claim with its own confidence, not a fixed constant — a `causes` edge asserted at high confidence based on strong historical pattern behaves differently in propagation than the same edge type asserted speculatively. Weights are never permanently fixed at creation: a `causes` or `increases_probability` edge's weight is itself subject to the same recalculation discipline as Belief confidence (`EVIDENCE_QUALITY_MODEL.md` §5) — if the claimed relationship is repeatedly borne out (or repeatedly fails to be) across many instances over years, the *edge type's* typical weight in that context should itself be treated as a Belief the Outcome Engine can grade and the Learning stage can revise.

### 4.5 Temporal relationships
Every relationship carries the time at which it was asserted, separate from the time of the Events it concerns — this is what allows the graph to answer "what did we believe on this date" without confusing it with "what do we believe now" (a critical distinction at decade scale, and the same principle `TRUTH.md` §9 and `EVIDENCE_QUALITY_MODEL.md` §3 apply to individual records, extended to relationships). Relationships are never edited to reflect current understanding; a relationship whose weight or validity has changed gets a new, dated relationship record, connected to the old one the same way a superseding Thesis connects to what it replaced.

### 4.6 Historical snapshots
Because nothing is ever mutated, the graph as it stood at any past date is always reconstructable by filtering every node and edge to those asserted on or before that date — this is not a separate "snapshot" mechanism bolted on, it is a direct consequence of the append-only philosophy (§6) applied consistently. This capability is treated as a first-class requirement of the design, not an incidental byproduct: the platform must be able to honestly answer "what did you believe, and how confidently, on this date, before you knew what happened next" — the only way to genuinely audit calibration over ten years rather than merely assert it.

### 4.7 Multi-hop reasoning
Reasoning across more than one relationship (an Event affecting a Supply Chain affecting a Company's exposure affecting a Theme's confidence) is permitted, but every additional hop compounds uncertainty — multi-hop propagation must always report a confidence that degrades with path length and with the weakest link on the path, never a confidence equal to the strongest single edge involved. A multi-hop chain is only as trustworthy as its least trustworthy edge, and the graph must make that legible (showing the full path, not just the concluding relationship) rather than collapsing a long chain of speculative `influences` edges into a conclusion that reads as confidently as a single `causes` edge would. Where multiple independent multi-hop paths reach the same conclusion, that convergence is itself a form of cross-confirmation (§4.1) and may reasonably increase confidence beyond what any single path alone would justify — but only when the paths are genuinely independent, not variations on the same underlying chain.

### 4.8 Cross-theme reasoning
Themes are not silos — a single Event or Belief frequently bears on multiple Themes simultaneously (a rate-policy Event affecting both a Macro Regime and, through it, every rate-sensitive Theme's conditioned_on edges at once). Cross-theme propagation must respect that a Company or Event can be a node shared by multiple Themes' reasoning without duplicating that node once per Theme — the graph reasons about a single Company node with multiple `exposed_to` edges to different Themes, not about separate copies of the Company living inside each Theme's private context. This is what allows genuinely novel cross-theme insight (a Defense Theme development revealing an implication for an Energy Theme through a shared Supply Chain node) rather than only ever reasoning within one narrative silo at a time.

---

## 5. Designing for Ten Years and Billions of Events

A knowledge graph that behaves correctly today but degrades in usefulness or coherence at scale has failed this document's brief, regardless of how well it performs at launch. Four design commitments make decade-and-billion-event scale survivable, described conceptually, not as an implementation plan:

1. **Nothing is ever deleted, and almost nothing is ever edited.** Every node and every relationship, once created, persists. Aging, decay, and reduced relevance (`EVIDENCE_QUALITY_MODEL.md` §4) are properties computed *about* a node at query time relative to the present, not destructive changes made *to* the node. A ten-year-old Event is exactly as real a node in year ten as it was in year one; only its currently-computed relevance has changed.
2. **Aggregation nodes prevent combinatorial explosion, honestly.** A Theme, a Thesis, a Source's reputation — these exist precisely so multi-hop reasoning across billions of Events does not require traversing every underlying Event individually every time. An aggregation node is not a shortcut that hides the underlying detail — the full chain down to the original Evidence must always remain reachable from it — but it is what makes reasoning over a decade of accumulated knowledge computationally and cognitively tractable rather than requiring re-deriving everything from raw Events each time.
3. **Recency and volume are never confused with truth.** At billions-of-events scale, the sheer quantity of recent, low-quality evidence on some subjects will vastly outnumber older, higher-quality evidence on others. Every propagation rule in §4 is deliberately weighted by evidence *quality* and *independence*, not by count or recency alone, specifically so that scale itself never becomes a way to manufacture false confidence through sheer volume.
4. **Continuous updates are additive events, not batch rewrites.** The graph is designed to be extended by a continuous stream of new Event/Evidence/Belief nodes arriving at any time, each one only ever adding new nodes and edges or asserting a new, dated revision — never requiring a reprocessing pass that touches historical nodes. This is what makes "ten years of continuous learning" a property the graph's shape supports by construction, rather than a scale target bolted on after the fact.

---

## Mandatory reading

This document is mandatory reading, alongside `TRUTH.md` and `EVIDENCE_QUALITY_MODEL.md`, for every future subsystem that creates, connects, or reasons over knowledge inside ImpactOne — the Research Intelligence Engine, the Thesis Engine, Portfolio Intelligence, the Recommendation Engine, the Outcome Intelligence Engine, and World Memory. A subsystem that introduces a new node type, a new relationship type, or a new propagation rule not describable in these terms is not compliant until this document is deliberately extended to cover it, through the same reviewed process every other correction in this platform requires.
