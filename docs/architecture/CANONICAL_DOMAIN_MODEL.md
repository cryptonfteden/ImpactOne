# ImpactOne — CANONICAL_DOMAIN_MODEL.md
## The Single Source of Meaning

**Status:** This document is the single source of meaning for ImpactOne. Every one of the 30 concepts below is defined here exactly once. No other document — past or future — may redefine any of them; every other document either references this one or is wrong. This is not a new philosophy. It is the reconciliation of the philosophy and architecture ImpactOne already has, most of it written well, none of it previously checked against the rest.

### Why this document exists

An internal audit (`ARCHITECTURE_CONSISTENCY_AUDIT.md`) found that ImpactOne's documentation had grown into two strata that were never introduced to each other:

- **Stratum A — the implementation-grounded lineage:** `VISION.md` → `TRUTH.md` → `EVIDENCE_QUALITY_MODEL.md` → `KNOWLEDGE_GRAPH_ARCHITECTURE.md` → `ARCHITECTURE.md` → `API_CONTRACTS.md` → `INTELLIGENCE_PLATFORM_BLUEPRINT.md` → `OUTCOME_INTELLIGENCE_ENGINE.md` → World Memory. Internally well-maintained, versioned, cross-referenced.
- **Stratum B — the philosophy layer:** `RESEARCH_ORGANIZATION.md` and `INVESTMENT_INTELLIGENCE_MODEL.md`, each written under an explicit instruction to forget the implementation. Each internally rigorous. Neither cites a single term from Stratum A, despite covering the same ground with different nouns, different state machines, and different numbers.

The audit's verdict was **INCONSISTENT** — not because either stratum is weak, but because read together they describe two systems, not one. This document is the reconciliation the audit called for. It does not throw either stratum away. It picks, for every contested term, which stratum's definition governs, states explicitly why, and gives every remaining, non-conflicting idea from the losing side an explicit home as a named future extension rather than a silent casualty.

### How to read this document

Section 1 resolves the eight structural conflicts the audit found, once, before any term is defined — because most of the 30 term definitions depend on these resolutions and would otherwise have to re-litigate them 30 times. Section 2 defines the 30 concepts, each against the same 12-point template. Section 3 is the reconciliation appendix — every contradiction found, source-quoted, and its resolution, in one place, for anyone auditing this document's own decisions later (per `TRUTH.md` §14 — this document is included in what must always be challenged).

---

## 1. Structural Reconciliation

### 1.1 Fact / Belief vs. Fact / Inference / Judgment

`TRUTH.md` §1 states a binary: Fact and Belief, nothing else. `RESEARCH_ORGANIZATION.md` §7.1 states a ternary: Fact, Inference, Judgment, with no "Belief" at all. **Resolution: these are not competing classifications of the same axis — they classify different things, and both survive, nested.**

- **Belief** (§2.8 below) is the *node type* — the single unit every piece of interpreted knowledge is stored as, exactly as `TRUTH.md` and `EVIDENCE_QUALITY_MODEL.md` §6 already require, and exactly as `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.10 already schematizes it.
- **Fact, Inference, and Judgment are the three permitted *epistemic methods* by which a Belief is arrived at** — a required, mandatory label every Belief carries, adopted from `RESEARCH_ORGANIZATION.md` §7.1 because it is the more rigorous, already-formal scheme, and because it is not actually incompatible with a Fact/Belief binary once "Fact" is understood correctly:
  - A Belief labeled **Fact** is a Belief held at or near certainty, directly verifiable from Primary or high-tier Secondary evidence, independent of interpretation. This *is* `TRUTH.md`'s "Fact" — not a separate node type from Belief, but the degenerate, highest-certainty case of one. A "Fact" that later turns out to be wrong (a restated filing) was never structurally different from a Belief; it simply had its confidence revised like any other.
  - A Belief labeled **Inference** is a conclusion drawn from Facts using a stated, defensible method (a base rate, a valuation framework, a statistical model).
  - A Belief labeled **Judgment** is an analyst's or model's considered view where evidence is necessarily incomplete — always carrying an explicit confidence and an attributed author (human or AI Analyst, per `TRUTH.md` §11).
- **Hypothesis** (§2.7 below) is not a fourth method and not a fourth node type. It is a Judgment-labeled Belief held at low confidence, early in a Thesis's Forming stage (§1.3) — a state, not a structural category. This resolves `RESEARCH_ORGANIZATION.md`'s own passing, informal use of "hypothesis" as a Very-Low-confidence-band descriptor into something structurally real rather than a stray adjective.

Presenting a Judgment as if it were a Fact is, per `RESEARCH_ORGANIZATION.md` §7.1, treated across this entire platform as the single most serious standards violation any subsystem — human or AI — can commit, and triggers mandatory escalation regardless of source.

### 1.2 The six Evidence classes mapped to the four source tiers

`EVIDENCE_QUALITY_MODEL.md` §1 defines six evidence classes (Primary, Secondary, Crowd, Speculation, Rumor, Unknown). `RESEARCH_ORGANIZATION.md` §8 defines four source tiers (Tier 1 Primary/Verifiable, Tier 2 Vetted Proprietary, Tier 3 Professional Secondary, Tier 4 Crowd/Unverified, plus Banned). **Resolution: source tier is a property of the *source*; evidence class is a property of the *specific claim* — the same source can produce evidence of different classes depending on what it's asserting.** The mapping:

| Source Tier | Default Evidence Class | Exception |
|---|---|---|
| Tier 1 (Primary/Verifiable) | **Primary** | A Tier 1 source's own forward-looking guidance or management commentary is **Speculation**, not Primary — tier does not launder an opinion into a fact (`EVIDENCE_QUALITY_MODEL.md` §2.8). |
| Tier 2 (Vetted Proprietary) | **Primary** or **Secondary**, depending on directness | A vetted dataset reporting its own measurement is Primary; a vetted proprietary *analysis* of someone else's data is Secondary. |
| Tier 3 (Professional Secondary) | **Secondary** | An identified analyst's stated forecast inside a Tier 3 report is **Speculation**, extracted and labeled separately from the reporting around it. |
| Tier 4 (Crowd/Unverified) | Splits into **Crowd** and **Rumor** | `EVIDENCE_QUALITY_MODEL.md` §1 is explicit these must never be merged: aggregated, many-independent-participant signal (a prediction-market price, broad sentiment volume) is **Crowd**; a single unattributed or anonymously-sourced claim is **Rumor**, scored far lower. `RESEARCH_ORGANIZATION.md`'s single Tier 4 weight is therefore a floor for Crowd and a ceiling for Rumor, not one number for both. |
| Banned | *(no class — excluded from ingestion entirely)* | Distinct from **Unknown**, which is ingested and heavily discounted; Banned is never ingested at all. |
| *(source not yet tiered)* | **Unknown** | Resolves forward into one of the above once provenance is established (`EVIDENCE_QUALITY_MODEL.md` §3), never assumed favorably in the meantime. |

### 1.3 One Thesis lifecycle

Three incompatible state machines existed: `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 3's 5-state enum (`active`/`strengthening`/`weakening`/`invalidated`/`realized`), `INVESTMENT_INTELLIGENCE_MODEL.md`'s 7-state lifecycle (`Forming`→`Testing`→`Strengthening`/`Weakening`→`Mature`→`Harvested`/`Dying`, with three death types), and `RESEARCH_ORGANIZATION.md`'s 4-stage authorship pipeline (`Evidence Note`→`Department Thesis`→`Cross-Department Synthesis`→`Investment Council Record`), which has no states at all, only stages. **Resolution: these describe two different axes of the same object, not three competing lifecycles — collapsed into one canonical model with a maturity axis and a standing-status axis.**

**Maturity axis** (how far a Thesis has progressed toward being trusted; reconciles the Blueprint's missing early states with Investment Intelligence Model's `Forming`/`Testing`/`Mature` and Research Org's authorship pipeline):
1. **FORMING** — origination test in progress (mechanism, why-not-priced-in, expected checkpoints, invalidation condition being drafted); evidence accumulating as Evidence Notes/Events. Not yet actionable.
2. **TESTING** — the Minimum Viable Thesis is complete (claim, mechanism, evidence chain with tier, horizon, invalidation conditions, initial confidence, initial sizing view); checkpoints are being actively tracked against reality.
3. **STANDING** — reviewed (the Cross-Department-Synthesis/Council-review step, where that governance layer exists) and promoted to a persistent, Theme-linked thesis backed by an append-only `WorldMemoryThesisRevision` sequence (§2.9 below). A Thesis a persisted this way is what `RESEARCH_ORGANIZATION.md` calls an Investment Council Record and what the Blueprint's Thesis table stores as `active`.

**Standing-status axis** (only meaningful once STANDING; reconciles the Blueprint's `strengthening`/`weakening` with Investment Intelligence Model's identical states):
- **STRENGTHENING** — new corroborating evidence since the last revision.
- **WEAKENING** — new contradicting evidence since the last revision.
- **STABLE** — no material evidence change since the last revision.

**Closure** — a STANDING Thesis ends via exactly one of three reasons, matching Investment Intelligence Model's three-death-type discipline exactly, with the Blueprint's vocabulary aligned onto it:
- **INVALIDATED** — a stated invalidation condition triggered. (Blueprint: `invalidated`.)
- **EXPIRED** — the stated time horizon elapsed without the thesis completing. (Absent from the Blueprint's enum — a genuine gap this document closes; every future implementation of Thesis status must include it.)
- **HARVESTED** — the mechanism played out and the market repriced accordingly. (Blueprint: `realized`.)

A Thesis that is quietly abandoned without reaching one of these three is, per `INVESTMENT_INTELLIGENCE_MODEL.md` §3, a governance failure, not a valid closure state, and must never be represented as one.

### 1.4 One Recommendation lifecycle

The real, shipped enum governs: `ACTIVE` → `SUPERSEDED` | `EXPIRED` (`Recommendation.status`, unchanged since Sprint 16). `RESEARCH_ORGANIZATION.md`'s "Investment Council Record," described as immutable-once-issued with no stated relationship to `SUPERSEDED`, is **not an alternative Recommendation lifecycle** — it is Stratum B's not-yet-implemented name for the human-governance layer that would sit *above* Recommendation once real multi-analyst identity exists (a named, currently-open gap — see `ARCHITECTURE.md` §7.4: single default portfolio, no multi-tenancy). Until that governance layer is built, `Recommendation.status` is the only Recommendation lifecycle that exists or needs reconciling, and a superseding recommendation is how "a changed view is represented without editing history" — the exact mechanism `TRUTH.md` §9 requires and `RESEARCH_ORGANIZATION.md`'s undefined immutability language was gesturing at without a real mechanism attached.

### 1.5 One Outcome lifecycle

Per `OUTCOME_INTELLIGENCE_ENGINE.md` §1/§4/§5 (the only one of the three source documents with a real, field-level Outcome design): an individual `Outcome` row has no internal lifecycle — it is created once, the moment a time window (`D1`/`W1`/`M1`/`M3`/`M6`/`Y1`) matures, and never updated after. The lifecycle exists at the *Recommendation* level, derived (never stored) from its set of Outcome rows: `PENDING_OUTCOME` → `PARTIALLY_GRADED` → `FULLY_GRADED` (or `GRADING_STALLED` if a due window repeatedly fails to grade). `RESEARCH_ORGANIZATION.md` §12's grading discipline ("an ambiguous outcome is graded as ambiguous, explicitly, not dropped") is already satisfied by the shipped design's `UNGRADEABLE` grade label with a required `ungradeableReason` — no reconciliation needed, this is one of the few places Stratum A and Stratum B already agree without having spoken to each other.

`INVESTMENT_INTELLIGENCE_MODEL.md` §10.1's mechanism-vs-timing grading distinction (was the causal story right, independent of whether the price moved on schedule) is a genuine, unimplemented improvement — adopted here as a **named future extension** to `Outcome`, not yet built: a future `mechanismGrade` field, scoped to `OUTCOME_INTELLIGENCE_ENGINE.md`'s existing table rather than a second, parallel grading system.

### 1.6 Confidence and Uncertainty remain two dimensions, permanently

Per `TRUTH.md` §3, restated here as canonical and non-negotiable: Confidence measures signal strength; Uncertainty measures disagreement. They are computed differently (`scoringVocabulary.js`: `confidence` from ranking inputs; `uncertainty` from `computeUncertainty()` — 100 minus the average of evidence agreement and committee consensus) and must never be collapsed into one dial. `RESEARCH_ORGANIZATION.md` §9's single five-band confidence scale, with no independent disagreement axis, does not meet this standard as written and is corrected by this document: any future implementation of Stratum B's confidence bands must carry Uncertainty as a second, genuinely independent value alongside each band, not merely imply it as the band's inverse.

**Confidence vs. Conviction, resolved:** `scoringVocabulary.js` documents, today, that `confidence`/`conviction`/`modelConfidence` are the same underlying number under three names — an intentional, temporary simplification pending real outcome-calibration data. `INVESTMENT_INTELLIGENCE_MODEL.md` §6 builds a load-bearing distinction on top of Conviction as a separate, sizing-ceiling concept ("conviction sets the ceiling, timing sets the path"). **Resolution: both are correct, at different times.** Today, Conviction is canonically an alias of Confidence, exactly as implemented. Investment Intelligence Model's richer definition — Conviction as the sizing ceiling a Thesis could ever justify, distinct from Confidence and from Timing — is adopted as the **canonical target definition**, to be activated the moment the Outcome Engine has enough graded history to actually differentiate them (the same condition `scoringVocabulary.js` itself already names as the gate). Until then, every document, including this one, must state plainly that they are the same number, not silently imply a distinction the platform cannot yet compute.

### 1.7 The Committee can never become a second decision owner

This is not new policy; it is the single hardest-won lesson in this platform's history (Sprint 18A), restated here as permanent, extending to every past, present, and future body that debates. `canonicalVerdict.js` structurally strips any `action`/`decision`/`verdict`-shaped key from Committee Debate output before it can reach a response — a guard independent of the Committee's own discipline. This rule is explicitly extended, by this document, to **any future governance layer**, including `RESEARCH_ORGANIZATION.md`'s proposed "Investment Council" and its 11 departments: if that layer is ever built, each department's "Department Thesis" is a debate/explanation input, exactly like today's six-persona Committee, and the Cross-Department Synthesis step must pass through the same canonical-verdict-style gate before it can produce anything a user sees — never a second, independently-computed verdict standing beside `Recommendation`/`DecisionTrace`. Building an 11-department structure that each independently concludes is, structurally, the exact two-verdict risk Sprint 18A already paid to fix, multiplied by 5.5×, and this document forbids reintroducing it under a new name.

**A related naming note, not a conflict:** "Investment Committee" (six-persona debate engine, `investmentCommitteeService.js`, real and shipped) and "Investment Council" (`RESEARCH_ORGANIZATION.md`'s human-governance body, unimplemented) are **not the same thing** despite the similar names. This document reserves **Committee Debate** exclusively for the shipped six-persona engine. "Investment Council" remains unimplemented Stratum B scope and must not be built, named, or referenced as if it already exists.

### 1.8 Knowledge Graph, World Memory, and DecisionTrace share one relationship vocabulary

`KNOWLEDGE_GRAPH_ARCHITECTURE.md` §3's relationship types (`supports`, `contradicts`, `causes`, `increases_probability`, `reduces_probability`, `strengthens`, `weakens`, `invalidates`, and the rest) are canonical, full stop — no other document may define a competing relationship vocabulary. This document closes the one place that vocabulary wasn't yet explicitly wired in: `DecisionTrace.evidenceReferences`/`matchedEvents`' `impactType` field (`"opportunity"`/`"risk"`/`"neutral"`) is the same concept as a `supports`/`contradicts` edge at the Belief level — `impactType: "opportunity"` is a `supports` edge toward the recommended action's underlying Belief; `impactType: "risk"` is a `contradicts` edge. `WorldMemoryCausalLink.explanation` and `WorldMemoryStateChange.dimension` are free text today; any future structured version of either must draw its relationship type from §3 of `KNOWLEDGE_GRAPH_ARCHITECTURE.md`, not invent a parallel one.

---

## 2. The 30 Canonical Concepts

Each concept below is defined against the same twelve points. Where a document elsewhere in the repository already defines the underlying mechanism correctly, this section states the definition and cites it rather than re-deriving it — this document is a reconciliation, not a rewrite.

---

### 2.1 Event

1. **Exact meaning:** Something that happened in the world, at a specific time, independent of whether or how the platform observed it (`KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.1). In implementation, an Event is captured as a `CanonicalEvent` row the moment a Provider observes it.
2. **What it is not:** Not the same as the platform's *account* of what happened — that is Evidence (§2.3). Not a WorldMemoryRecord (§2.20), which is a broader "real-world occurrence" spine node that may anchor several Events/Evidence items.
3. **Owner:** The provider ingestion layer (`providerIngestionService.js`).
4. **Producers:** The 15 registered Providers (`backend/services/providers/`).
5. **Consumers:** `eventEnvelope.js` (classification), `WorldMemoryRecord` creation, every downstream engine.
6. **Lifecycle:** Ingested once, deduplicated on `deduplicationKey`, never re-ingested as a "new" event for the same underlying occurrence.
7. **Allowed transitions:** None — an Event is a fact of occurrence, not a stateful object.
8. **Forbidden transitions:** Never edited, never deleted, never merged into another Event's identity (only referenced by multiple Evidence items).
9. **Relationships:** `precedes`/`follows`/`co_occurs_with` other Events; is witnessed by Evidence (`derived_from`, inverse).
10. **Persistence expectations:** Permanent, append-only, `CanonicalEvent` table, unique on `deduplicationKey`.
11. **Immutable:** Yes.
12. **Canonical terminology:** API/backend: `CanonicalEvent`, `eventType`. Frontend: not directly exposed (surfaces via Daily Feed items). Docs: **Event**.

---

### 2.2 Source

1. **Exact meaning:** The originator of a piece of Evidence — an outlet, filer, named analyst, regulator, or market. Carries a tier (§1.2) and, over time, a measured historical accuracy (`EVIDENCE_QUALITY_MODEL.md` §2.6) distinct from its slower-moving reputation (§2.7 of that document).
2. **What it is not:** Not the same as `sourceType` (a category like "news"/"regulatory-filing") — Source is the specific originator; `sourceType` is its class.
3. **Owner:** `scoringVocabulary.js` (`sourceCredibility`) today; a dedicated Source node/table is future Knowledge Graph scope, not yet implemented.
4. **Producers:** Providers register Sources implicitly via `sourceName`/`sourceUrl`.
5. **Consumers:** Every Evidence-scoring and Belief-forming process.
6. **Lifecycle:** A Source's credibility is a belief about the Source (`EVIDENCE_QUALITY_MODEL.md` §2.6-2.7) — revised as outcomes accumulate, never treated as fixed.
7. **Allowed transitions:** Reputation converges toward measured historical accuracy over time.
8. **Forbidden transitions:** Never permanently diverges from measured accuracy on the basis of fame alone (`EVIDENCE_QUALITY_MODEL.md` §2.7).
9. **Relationships:** `produces` Evidence; is graded by aggregated Outcomes (via `AttributionSnapshot.dimension = SOURCE`).
10. **Persistence expectations:** Today, denormalized (`sourceName` string fields). Target: a first-class Source node per `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.3.
11. **Immutable:** No — credibility is explicitly revisable, but revisions are new, dated records, never edits to history (`TRUTH.md` §9).
12. **Canonical terminology:** API/backend: `sourceName`, `sourceCredibility`, `HIGH_QUALITY_NEWS_SOURCES`. Frontend: source attribution line on feed items. Docs: **Source**.

---

### 2.3 Evidence

1. **Exact meaning:** A specific, sourced, timestamped account of an Event, classified into exactly one of the six classes in `EVIDENCE_QUALITY_MODEL.md` §1 (Primary, Secondary, Crowd, Speculation, Rumor, Unknown) and scored on its ten dimensions (§2 of that document). Per §1.2 above, may be authored by a human Analyst (Research Org's "Evidence Note") or produced automatically by a Provider (the Blueprint's RIE Event) — both are the same node type with different Producers, never two competing kinds of Evidence.
2. **What it is not:** Not itself a claim about what it means — that interpretation step is a Belief (§2.8). Not the Event itself (§2.1); multiple independent Evidence items may describe one Event.
3. **Owner:** `eventEnvelope.js` (schema), `EVIDENCE_QUALITY_MODEL.md` (scoring rules).
4. **Producers:** Providers (automated) and, in the future org-layer, Analysts (human).
5. **Consumers:** Belief formation (§2.8), `DecisionTrace.evidenceReferences`.
6. **Lifecycle:** Ingested once; ages via freshness/decay (§4 of `EVIDENCE_QUALITY_MODEL.md`), never re-authored.
7. **Allowed transitions:** May later be cross-confirmed by independent Evidence, raising the *Belief* it supports (§3, `EVIDENCE_QUALITY_MODEL.md`) — never changes the Evidence record's own class.
8. **Forbidden transitions:** Never reclassified into a more favorable class to reduce administrative untidiness; never re-ingested as if it were a second, independent piece of evidence for the same claim.
9. **Relationships:** `derived_from`/witnesses an Event; `supports`/`contradicts`/`cross_confirms` other Evidence and Beliefs.
10. **Persistence expectations:** Permanent, append-only, the canonical Event Envelope shape (19+5 fields, `eventEnvelope.js`).
11. **Immutable:** Yes.
12. **Canonical terminology:** API/backend: `eventEnvelope`, `evidenceReferences`, `matchedEvents`. Frontend: citation/source lines. Docs: **Evidence**; a human-authored instance may informally be called an **Evidence Note** (Research Org's term), but it is not a separate schema.

---

### 2.4 Fact

1. **Exact meaning:** Per §1.1: a Belief held at or near certainty, arrived at by direct verification against Primary or high-tier Secondary evidence, independent of interpretation (`RESEARCH_ORGANIZATION.md` §7.1's definition, adopted verbatim as the epistemic-method label).
2. **What it is not:** Not a separate node type from Belief. Not the same as Evidence (a Fact is an interpretation *of* evidence, even a nearly-certain one).
3. **Owner:** `TRUTH.md` §1 (definition), `RESEARCH_ORGANIZATION.md` §7.1 (label discipline).
4. **Producers:** Any Analyst or automated process forming a Belief directly from Primary/Tier-1-or-2 evidence.
5. **Consumers:** Everything downstream that would otherwise need to re-verify a settled claim.
6. **Lifecycle:** A label on a Belief, applied at formation, revisited only if new evidence genuinely contradicts the underlying verification (e.g., a restated filing).
7. **Allowed transitions:** May be downgraded to a lower-confidence Belief if its Primary source is later contradicted or corrected.
8. **Forbidden transitions:** Never asserted for a claim resting on Speculation-, Crowd-, or Rumor-class evidence, regardless of how confidently stated.
9. **Relationships:** A subtype-label of Belief; `supports` other Beliefs at the highest available strength.
10. **Persistence expectations:** Carried as a field/label on the Belief record.
11. **Immutable:** The label, once correctly applied, is stable; a correction is a new, dated Belief revision, never a silent re-label.
12. **Canonical terminology:** Backend/API: an epistemic-method label on a Belief (`epistemicMethod: "FACT"`, target schema — not yet implemented as a literal field anywhere today). Docs: **Fact**.

---

### 2.5 Inference

1. **Exact meaning:** Per §1.1 and `RESEARCH_ORGANIZATION.md` §7.1: a Belief arrived at by applying a stated, defensible method (a base rate, a valuation framework, a statistical model) to one or more Facts.
2. **What it is not:** Not a guess; the method must be nameable and defensible, not merely "the model's output."
3. **Owner:** `RESEARCH_ORGANIZATION.md` §7.1.
4. **Producers:** Any Analyst or scoring function applying a documented method (e.g., `scoringVocabulary.js`'s formulas are, structurally, Inference-producing methods).
5. **Consumers:** Thesis synthesis, Recommendation formation.
6. **Lifecycle:** Revised when its input Facts or its method itself changes (a formula recalibration, per `OUTCOME_INTELLIGENCE_ENGINE.md` §12's `RecalibrationProposal`).
7. **Allowed transitions:** May be strengthened or weakened by new Facts; may be superseded when the method itself is revised.
8. **Forbidden transitions:** Never presented as a Fact; never silently re-derived by a different, undocumented method between two otherwise-identical outputs.
9. **Relationships:** `derived_from` one or more Facts; feeds Thesis (§2.9).
10. **Persistence expectations:** Carried as a Belief's epistemic-method label, same mechanism as Fact.
11. **Immutable:** Same discipline as Fact — a method change produces a new, versioned record.
12. **Canonical terminology:** Backend/API: epistemic-method label `"INFERENCE"` (target schema). Docs: **Inference**.

---

### 2.6 Judgment

1. **Exact meaning:** Per `RESEARCH_ORGANIZATION.md` §7.1: a Belief representing an Analyst's (human or AI, per `TRUTH.md` §11) considered view where evidence is necessarily incomplete, always carrying an explicit confidence and an attributed author.
2. **What it is not:** Not anonymous, ever — a Judgment with no attributed author is not a valid Judgment. Not the same as Speculation (§evidence class — Speculation is a *source's* disclosed opinion treated as input evidence; Judgment is the *platform's own* considered conclusion built from all available evidence, including Speculation).
3. **Owner:** `TRUTH.md` §11 (how every AI Analyst must reason), `RESEARCH_ORGANIZATION.md` §7.1 (labeling discipline).
4. **Producers:** AI Analysts, the Committee (as debate input only, §1.7), and, in a future org layer, human Analysts.
5. **Consumers:** Thesis and Recommendation formation.
6. **Lifecycle:** Explicitly the least stable epistemic-method label — most subject to revision as evidence accumulates.
7. **Allowed transitions:** May mature toward Inference if a defensible method is later formalized; may be revised at any time new evidence arrives (§5, `TRUTH.md`).
8. **Forbidden transitions:** Never presented as Fact or Inference; a Judgment held at very low confidence with no supporting checkpoints is a **Hypothesis** (§2.7), not a stronger claim dressed down.
9. **Relationships:** `supports`/`contradicts` other Beliefs; is the typical output of Committee Debate (§2.17) and individual AI Analysts.
10. **Persistence expectations:** Carried as a Belief's epistemic-method label; author attribution is mandatory and permanent.
11. **Immutable:** The specific Judgment as stated is immutable; revision produces a new Belief entry (§4-5 recalculation discipline, `EVIDENCE_QUALITY_MODEL.md`).
12. **Canonical terminology:** Backend/API: epistemic-method label `"JUDGMENT"` (target schema); today, implicitly every AI Analyst/Committee output not otherwise labeled. Docs: **Judgment**.

---

### 2.7 Hypothesis

1. **Exact meaning:** Per §1.1: a Judgment-labeled Belief held at low confidence, typically corresponding to a Thesis in its FORMING stage (§1.3) — worth tracking, not yet actionable.
2. **What it is not:** Not a fourth epistemic method. Not a Thesis in its own right until it clears the Minimum Viable Thesis bar (§1.3, TESTING stage).
3. **Owner:** Same as Judgment (§2.6), with the FORMING-stage Thesis lifecycle rule layered on top (§1.3).
4. **Producers:** Any Analyst or AI Analyst noting an early, underdeveloped pattern.
5. **Consumers:** Thesis origination process.
6. **Lifecycle:** FORMING → (clears Minimum Viable Thesis bar) → becomes a TESTING-stage Thesis, or is abandoned.
7. **Allowed transitions:** Promotion to a full Thesis once mechanism, checkpoints, and invalidation conditions are stated.
8. **Forbidden transitions:** Never sized with real capital or presented to a user as an actionable Recommendation while still a Hypothesis.
9. **Relationships:** `derived_from` early Evidence; may `causes`/`increases_probability` a later, more developed Belief.
10. **Persistence expectations:** Same as Judgment; explicitly low-confidence.
11. **Immutable:** Same as Judgment.
12. **Canonical terminology:** No dedicated field; represented as a low-confidence, FORMING-stage Belief/Thesis. Docs: **Hypothesis**.

---

### 2.8 Belief

1. **Exact meaning:** The platform's most granular unit of interpreted knowledge — a specific claim, held with a Confidence (§2.24) and an Uncertainty (§2.25), resting on one or more pieces of Evidence, and labeled with exactly one epistemic method (Fact/Inference/Judgment, §1.1). Defined structurally in `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.10 and `EVIDENCE_QUALITY_MODEL.md` §6.1.
2. **What it is not:** Not raw Evidence (a Belief is an interpretation of evidence, never evidence itself). Not a Thesis (a Thesis is a synthesis of many Beliefs over time, §2.9).
3. **Owner:** `TRUTH.md` §1-§5 (what a belief is, when it changes); `EVIDENCE_QUALITY_MODEL.md` §6.1 (how evidence affects it).
4. **Producers:** AI Analysts, Committee Debate (as input only), human Analysts (future org layer).
5. **Consumers:** Thesis synthesis (§2.9), Recommendation justification (§2.11 — a Recommendation may never weigh raw Evidence directly, only through a Belief, per `EVIDENCE_QUALITY_MODEL.md` §6.3).
6. **Lifecycle:** Formed from Evidence; recalculated per the five triggers in `EVIDENCE_QUALITY_MODEL.md` §5 (new evidence, conflict resolution, source-accuracy update, invalidation check, decay past materiality).
7. **Allowed transitions:** Confidence/Uncertainty adjustment on any of the §5 triggers; epistemic-method upgrade (Judgment → Inference) if a defensible method is formalized.
8. **Forbidden transitions:** Never silently averaged with a contradicting Belief into a false middle (`TRUTH.md` §6); never revised for a reason other than new evidence (`TRUTH.md` §5).
9. **Relationships:** `supports`/`contradicts`/`strengthens`/`weakens`/`invalidates` other Beliefs; `derived_from` Evidence; `part_of` a Thesis.
10. **Persistence expectations:** Every revision is a `WorldMemoryStateChange` row (§2.29) — a before/after ledger entry, dated, never overwritten.
11. **Immutable:** The historical record of what was believed and when is immutable; the *current* belief is continuously revisable, always by addition, never by edit.
12. **Canonical terminology:** Backend/API: not yet a standalone table (implicit inside `Recommendation.evidence`/`explanation`); target: a `Belief` node per `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.10. Docs: **Belief**.

---

### 2.9 Thesis

1. **Exact meaning:** A durable, broader narrative synthesized from many Beliefs over time, following the unified maturity/standing-status/closure lifecycle in §1.3. Requires, at minimum, a stated mechanism, an evidence chain, a time horizon, an invalidation condition, and an initial confidence (`INVESTMENT_INTELLIGENCE_MODEL.md` §1.2's Minimum Viable Thesis, adopted as the TESTING-stage bar).
2. **What it is not:** Not a Prediction (§2.18 — a bare directional claim with no mechanism); not a Recommendation (§2.11 — a Thesis is a narrative, a Recommendation is a sized, actionable decision that may draw on one).
3. **Owner:** `INVESTMENT_INTELLIGENCE_MODEL.md` §1-§3 (origination and death discipline), `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 3 (persistence/storage model), reconciled by §1.3 above.
4. **Producers:** AI Analysts, Committee Debate (input only), Thesis Engine (design-only, not yet implemented).
5. **Consumers:** Theme aggregation (§2.10), Recommendation formation.
6. **Lifecycle:** FORMING → TESTING → STANDING {STRENGTHENING|WEAKENING|STABLE} → closed via {INVALIDATED|EXPIRED|HARVESTED} — see §1.3.
7. **Allowed transitions:** Any forward maturity transition; any standing-status change on new evidence; closure via exactly one of the three named reasons.
8. **Forbidden transitions:** "Thesis Creep" — the mechanism changing repeatedly while the conclusion never does (`INVESTMENT_INTELLIGENCE_MODEL.md` §2.3) — is forbidden and must trigger mandatory review, not silent continuation. Quiet abandonment without a stated closure reason is forbidden (§1.3).
9. **Relationships:** `part_of`/aggregates many Beliefs; `belongs_to` a Theme; `exposed_to` Companies/ETFs; `conditioned_on` a Macro Regime.
10. **Persistence expectations:** Every revision is a `WorldMemoryThesisRevision` row (append-only, auto-incrementing `revisionNumber` per `themeKey`, race-safe by design — `ARCHITECTURE.md` §6.7).
11. **Immutable:** Every past revision is immutable; the current thesis is revised only by appending a new, dated revision.
12. **Canonical terminology:** Backend: `WorldMemoryThesisRevision`, `themeIntelligenceService.buildThesis`. API: `Theme.thesis` (current text). Frontend: Theme Dashboard's thesis panel. Docs: **Thesis**.

---

### 2.10 Theme

1. **Exact meaning:** A Thesis that has earned standing as a persistent, broad, actively-tracked lens the platform keeps applied — today, exactly 7: AI, Quantum, Defense, Energy, Space, Cybersecurity, Healthcare (`themeIntelligenceService.THEME_DEFINITIONS`).
2. **What it is not:** Not a Sector (§2.13 — Sector is a standard industry classification a Company structurally `belongs_to`; Theme is a narrative a Company is `exposed_to`, and the two axes routinely disagree, e.g., an energy-transition Theme touching companies across multiple Sectors).
3. **Owner:** `themeIntelligenceService.js`.
4. **Producers:** Deterministic aggregation over classified Events (`classifyEventType`); thesis text is templated, not LLM-generated, by explicit design choice (`PROJECT_STATUS.md` §26).
5. **Consumers:** Theme Dashboard, feed personalization, cross-theme reasoning (`KNOWLEDGE_GRAPH_ARCHITECTURE.md` §4.8).
6. **Lifecycle:** Maturity tier (`Early`/`Emerging`/`Growth`/`Mature`), deterministically derived from real matching-event volume — never fabricated.
7. **Allowed transitions:** Maturity tier moves up or down with real event volume; confidence score updates daily via the snapshot job.
8. **Forbidden transitions:** Never backfilled with invented history; confidence-trend history starts from whenever the platform first tracked it.
9. **Relationships:** Aggregates Theses; `exposed_to` edges to Companies/ETFs; may `influences` or share a Supply Chain node with another Theme (cross-theme reasoning).
10. **Persistence expectations:** `ThemeConfidenceSnapshot` (daily confidence number) + `WorldMemoryThesisRevision` (thesis text history) — two tables, two different aspects of the same Theme, per §1.3's reconciliation.
11. **Immutable:** Snapshots and revisions are both append-only; the live Theme view is a read-time computation over them.
12. **Canonical terminology:** Backend/API: `themeKey`, `Theme.maturity`, `ThemeConfidenceSnapshot`. Frontend: Theme Dashboard. Docs: **Theme**.

---

### 2.11 Entity

1. **Exact meaning:** The broadest node type for "a thing Evidence and Beliefs can be about" — the superclass covering Company, ETF, Country, Sector, and any named subject without its own dedicated type yet (`KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.4). In `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 2, Entity sub-types explicitly include companies, executives/insiders, sectors, commodities, supply-chain nodes, geographies, and government bodies.
2. **What it is not:** Not a specific type itself — Entity exists so the graph is never blocked from recording a relevant subject just because a dedicated node type doesn't exist yet for it.
3. **Owner:** `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.4; the Knowledge Graph Engine's entity resolver (design-only).
4. **Producers:** Entity extraction from Evidence (design-only, Engine 2).
5. **Consumers:** Every downstream reasoning process that needs a stable subject to attach Beliefs to.
6. **Lifecycle:** Resolved/deduped once (name-variant collapsing into one canonical node), then persistent.
7. **Allowed transitions:** May be promoted to a dedicated type (e.g., a generic Entity later reclassified as a Company) without losing its history.
8. **Forbidden transitions:** Never duplicated — one real-world subject, one node, regardless of how many name variants referred to it.
9. **Relationships:** `belongs_to`, `exposed_to`, `depends_on` — the full structural relationship family (`KNOWLEDGE_GRAPH_ARCHITECTURE.md` §3.3).
10. **Persistence expectations:** Design-only today (Knowledge Graph Engine, not yet implemented).
11. **Immutable:** Identity is stable once resolved; attributes are revised by addition, per the graph's general append-only discipline.
12. **Canonical terminology:** Backend/API: `entities` field inside the Event Envelope today (array, unresolved); target: a first-class `Entity` node. Docs: **Entity**.

---

### 2.12 Company

1. **Exact meaning:** A specific investable business — an Entity sub-type. Is `exposed_to` Themes, `belongs_to` a Sector, is `held`/`watched` inside Portfolios, and is the subject of Recommendations.
2. **What it is not:** Not an ETF (§2.14 — a Company is a single business; an ETF's exposure is a composition of its holdings, not a single underlying entity).
3. **Owner:** No dedicated Prisma model today — represented ad hoc via `symbol` strings and response shapes (`{ name, exchange, industry, country, currency, ... }`, per `API_CONTRACTS.md` §3.5). Target owner: Knowledge Graph Engine 2.
4. **Producers:** Market-data providers (Finnhub) for company profile data; Providers/Evidence for company-specific events.
5. **Consumers:** Recommendation Engine, Portfolio Intelligence, Theme exposure mapping.
6. **Lifecycle:** No formal lifecycle today (a company simply exists as a valid symbol); future scope includes delisting/bankruptcy/acquisition as terminal states relevant to Outcome grading (`UNGRADEABLE` with `ungradeableReason: "delisted"`).
7. **Allowed transitions:** N/A today.
8. **Forbidden transitions:** N/A today.
9. **Relationships:** `belongs_to` Sector; `exposed_to` Theme; `holds`/`watches` edge from Portfolio; subject of Recommendation.
10. **Persistence expectations:** Denormalized `symbol` strings today; target: a first-class Company node.
11. **Immutable:** N/A (reference data, not a historical record).
12. **Canonical terminology:** Backend/API: `symbol`, `company` response object. Frontend: ticker displays throughout. Docs: **Company**.

---

### 2.13 Sector

1. **Exact meaning:** A standard industry grouping (Technology, Energy, Healthcare, etc.) a Company structurally `belongs_to` — narrower and typically longer-lived than a Theme (`KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.8).
2. **What it is not:** Not a Theme (§2.10 — Sector is structural membership; Theme is narrative exposure).
3. **Owner:** No dedicated model today — a bare string field on `Position`, `matchedEvents`, `WorldMemorySectorImpact`, and others.
4. **Producers:** Portfolio Intelligence (position-level), Providers (event-level sector tagging).
5. **Consumers:** Concentration/risk metrics, `WorldMemorySectorImpact` (§2.16).
6. **Lifecycle:** N/A — reference classification, not a historical record.
7. **Allowed transitions:** N/A.
8. **Forbidden transitions:** N/A.
9. **Relationships:** Companies `belong_to` a Sector; a Sector may be `exposed_to` a Theme in aggregate.
10. **Persistence expectations:** Denormalized string field today; target: a first-class Sector node (`KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.8) with graph edges, replacing the currently-hardcoded sector tables named in `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 5.
11. **Immutable:** N/A.
12. **Canonical terminology:** Backend/API: `sector` (string field, multiple objects — `Position.sector`, `WorldMemorySectorImpact.sector`). Frontend: sector badges/labels. Docs: **Sector**.

---

### 2.14 ETF

*(Named in the mission brief's node-type examples; defined per `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.6 for completeness, though not separately requested in the 30-term list — included because Theme/Company definitions above reference it.)* A specific investable basket whose exposure to a Theme or Sector is a composition of its holdings, not a single underlying business — reasoned about via its constituent Companies, never as an opaque single Entity.

---

### 2.15 Portfolio

1. **Exact meaning:** A specific set of holdings and watched Entities belonging to a specific context — today, a single-tenant singleton (`Portfolio` model, `portfolioRepository.js`'s `findFirst`/create convention). The node type through which Companies and Themes become personally relevant (`KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.13), and the *only* node type personalization is permitted to touch (`TRUTH.md` §13.10, `VISION.md`'s Personalization Principles).
2. **What it is not:** Not a Recommendation (a Portfolio holds positions; a Recommendation suggests changing them). Not itself a decision-maker.
3. **Owner:** `portfolioEngineService.js`/`portfolioRepository.js`.
4. **Producers:** User-initiated orders (paper trading only — `placeOrder` never reachable from any recommendation-generating path, `VISION.md` Core Principles).
5. **Consumers:** Portfolio Intelligence (exposure/concentration), Recommendation relevance scoring, personalization (feed ranking).
6. **Lifecycle:** Positions open/close via Trades; cash balance adjusts via a Ledger; performance snapshots capture point-in-time state.
7. **Allowed transitions:** Position open → partial/full close; cash debit/credit per trade.
8. **Forbidden transitions:** Never mutated by any recommendation-generating or advisory process directly — only by explicit, user-initiated orders.
9. **Relationships:** `holds`/`watches` Companies/ETFs; `relevant_to` edge target from Beliefs/Theses/Recommendations.
10. **Persistence expectations:** `Portfolio`, `Position`, `Trade`, `Order`, `CashLedgerEntry`, `PerformanceSnapshot` — real, transactional, mutable-by-design (this is the one concept in this document where mutability is correct: a portfolio's current state is not a historical record, it's live inventory; its *history* is preserved via `Trade`/`CashLedgerEntry`/`PerformanceSnapshot`, which are append-only).
11. **Immutable:** No (current state); yes (transaction history).
12. **Canonical terminology:** Backend/API: `Portfolio`, `Position`, `/api/v2/portfolio`. Frontend: Portfolio screen. Docs: **Portfolio**.

---

### 2.16 Recommendation

1. **Exact meaning:** A decision-shaped node connecting one or more Beliefs (and, where relevant, a Thesis) to a specific, actionable, advisory-only suggestion about a specific Company, at a specific time, with a stated Confidence, Quality, Risk, and invalidation condition. Per §1.4, `Recommendation.status` (`ACTIVE`/`SUPERSEDED`/`EXPIRED`) is the one canonical Recommendation lifecycle.
2. **What it is not:** Not an order (advisory-only, structurally — no `placeOrder` import anywhere in the recommendation-generating path, verified as a code invariant). Not a Thesis (a Thesis is a narrative; a Recommendation is a sized, actionable decision). Not the same object as Committee Debate output (§2.17 — Committee Debate can never itself be a Recommendation, §1.7).
3. **Owner:** `autonomousRecommendationEngine.js`.
4. **Producers:** The Recommendation Engine only — never Committee Debate directly.
5. **Consumers:** Home screen ("should I do anything today," via `canonicalVerdict`), Daily Feed, Portfolio-relevance scoring, Outcome grading.
6. **Lifecycle:** `ACTIVE` → `SUPERSEDED` (a new recommendation replaces it, `supersededById` links forward) or `EXPIRED` (per `expiresAt`).
7. **Allowed transitions:** `ACTIVE` → `SUPERSEDED`; `ACTIVE` → `EXPIRED`.
8. **Forbidden transitions:** Never `SUPERSEDED`/`EXPIRED` → `ACTIVE` (no resurrection — a changed view produces a *new* recommendation, per `TRUTH.md` §9); never edited in place to reflect hindsight.
9. **Relationships:** `derived_from` Beliefs/Thesis; `part_of` a DecisionTrace (1:1); `grades` relationship inverse from Outcome; `relevant_to` a Portfolio.
10. **Persistence expectations:** `Recommendation` table, real and shipped.
11. **Immutable:** The record as issued is immutable; status transitions are the only permitted change, and even those never alter the recommendation's original reasoning fields.
12. **Canonical terminology:** Backend/API: `Recommendation`, `action`, `status`. Frontend: Recommendations screen, recommendation cards. Docs: **Recommendation**.

---

### 2.17 Decision

1. **Exact meaning:** The general function of concluding what a user should see for a given symbol at a given moment — implemented, exactly once per symbol, as the pairing of a `Recommendation` and its `DecisionTrace`. "Decision" is not a separate persisted object; it is the *act* the Recommendation/DecisionTrace pair records the result of.
2. **What it is not:** Not a synonym free-for-all — `canonicalVerdict.js` explicitly treats `action`/`decision`/`verdict` as illegitimate synonym keys it strips from any Committee Debate output; only `Recommendation.action` is the canonical decision value. `finalDecision` (a frozen legacy field in the pre-Sprint-18A committee track record) and `investmentRating` (`/api/ai/analyze`'s separate, still-live, explicitly-out-of-scope field) are both **non-canonical, historical or unreconciled synonyms** — never to be treated as additional legitimate decision sources.
3. **Owner:** `canonicalVerdict.buildCanonicalVerdictView` — the one function that assembles what any API response exposes as "the decision."
4. **Producers:** The Recommendation Engine only.
5. **Consumers:** Every screen and endpoint that shows a user "what should I do."
6. **Lifecycle:** Mirrors Recommendation's lifecycle (§2.16) — a Decision exists exactly as long as its underlying Recommendation is `ACTIVE`.
7. **Allowed transitions:** N/A (inherits Recommendation's).
8. **Forbidden transitions:** Two engines producing two disagreeing Decisions for the same symbol at the same time — the single most severe forbidden state in this entire document (`VISION.md` Core Principles, `TRUTH.md` §13.5).
9. **Relationships:** 1:1 with a `Recommendation`; assembled from Committee Debate (input only) plus the Recommendation Engine's own ranking.
10. **Persistence expectations:** Not separately persisted — it is a read-time view over `Recommendation` + `DecisionTrace`.
11. **Immutable:** Inherits `Recommendation`/`DecisionTrace` immutability.
12. **Canonical terminology:** Backend/API: `canonicalVerdict`, `action`. **Forbidden as synonyms:** `decision`, `verdict`, `finalDecision`, `investmentRating` (the last is real and live but explicitly out of scope — never conflated with `action`). Docs: **Decision**.

---

### 2.18 Committee Debate

1. **Exact meaning:** A structured, multi-persona (six agents) debate producing supporting arguments, opposing arguments, individual expert votes (on a `Strong Buy`…`Strong Sell` six-way scale), a disagreement/consensus level, and a synthesis narrative — a debate/explanation layer, never an independent verdict engine (`investmentCommitteeService.js`, demoted structurally by Sprint 18A).
2. **What it is not:** Not a Recommendation. Not a second Decision source (§1.7, forbidden absolutely). Not the same as `RESEARCH_ORGANIZATION.md`'s "Investment Council" (§1.7's naming note).
3. **Owner:** `investmentCommitteeService.js`, gated by `canonicalVerdict.sanitizeCommitteeDebate`.
4. **Producers:** The six fixed committee personas.
5. **Consumers:** `Recommendation.explanation.committeeDebate` (UI-facing), `DecisionTrace.committeeDebate` (immutable audit copy) — never a standalone consumer-facing verdict.
6. **Lifecycle:** Runs once per triggered symbol (gated to symbols where the Recommendation Engine already triggered an action), producing one immutable debate snapshot per decision.
7. **Allowed transitions:** N/A — a single, immutable output per run.
8. **Forbidden transitions:** Its output must never contain, at any point, an `action`/`decision`/`verdict`/`finalDecision`/`recommendation`-shaped key reaching a response (`FORBIDDEN_COMMITTEE_KEYS`, enforced structurally, not by policy).
9. **Relationships:** `cites`/`part_of` a `DecisionTrace`; individual `expertVotes[]` are Judgments (§2.6), each independently attributable.
10. **Persistence expectations:** Embedded in `Recommendation.explanation.committeeDebate` and `DecisionTrace.committeeDebate`; the pre-Sprint-18A standalone `committeeTrackRecordService` JSON store is now frozen — no new entries.
11. **Immutable:** Yes — "the exact sanitized debate object used at decision time... an immutable snapshot, not a live pointer to the committee's current view" (`API_CONTRACTS.md` §3.43).
12. **Canonical terminology:** Backend/API: `committeeDebate` (renamed from `committee` in Sprint 18A). Frontend: Committee debate panel on Recommendation/AI Analysis screens. Docs: **Committee Debate**.

---

### 2.19 DecisionTrace

1. **Exact meaning:** The immutable, create-and-read-only record of exactly what evidence, ranking inputs, confidence calculation, and (since Sprint 18A) Committee Debate produced a specific Recommendation at the moment it was made.
2. **What it is not:** Not editable, ever — no update path exists anywhere in the repository, enforced by convention and, per Sprint 21B's precedent (`worldMemoryRepository.js`'s source-scanning test), the pattern any future immutable table should follow with an actual enforcement mechanism, not just a comment.
3. **Owner:** `autonomousRecommendationEngine.js` (creation only).
4. **Producers:** The Recommendation Engine, at the moment a Recommendation is created.
5. **Consumers:** The Outcome Engine (read-only, never the write path), any future audit or explanation UI.
6. **Lifecycle:** Created once, alongside its `Recommendation` (1:1, unique FK); never updated after.
7. **Allowed transitions:** None.
8. **Forbidden transitions:** Any update, ever.
9. **Relationships:** 1:1 with `Recommendation`; `cites` Evidence via `evidenceReferences`; embeds Committee Debate (input, not decision).
10. **Persistence expectations:** `DecisionTrace` table — the platform's reference implementation of immutability, cited by name in `TRUTH.md`, `EVIDENCE_QUALITY_MODEL.md`, and `KNOWLEDGE_GRAPH_ARCHITECTURE.md` as the pattern every other immutable record follows.
11. **Immutable:** Yes, absolutely — the strictest immutability guarantee in the platform.
12. **Canonical terminology:** Backend/API: `DecisionTrace`, `GET /api/v2/recommendations/:id/decision-trace`. Frontend: "Why this analysis" / decision-trace detail view. Docs: **DecisionTrace**.

---

### 2.20 Prediction

1. **Exact meaning:** Per §1.1's reconciliation and the World Memory model (`ARCHITECTURE.md` §6.7): a thin, frozen link between a `WorldMemoryRecord` and the `Recommendation`/`DecisionTrace` that made a claim about it, snapshotting the predicted action and confidence at the moment stated — distinct from `INVESTMENT_INTELLIGENCE_MODEL.md`'s narrower, informal use of "prediction" to mean a bare directional claim lacking mechanism (that narrower sense is what this document calls a claim *not yet* a Thesis, i.e., still a Hypothesis, §2.7).
2. **What it is not:** Not the Recommendation itself (Prediction is the durable, cross-referenced memory of it). Not a "prediction-market" signal (`predictionMarketProbabilities`, an unrelated Crowd-evidence data feed — a real, separate use of the word "prediction" in the codebase that must never be confused with this node type).
3. **Owner:** `worldMemoryRepository.js` (`createPrediction`).
4. **Producers:** Any process promoting a Recommendation into permanent memory.
5. **Consumers:** `Outcome` grading (§2.21), `getRecordWithHistory` aggregate reads.
6. **Lifecycle:** Created once, alongside the Recommendation it snapshots; never updated.
7. **Allowed transitions:** None.
8. **Forbidden transitions:** Any update to the frozen `predictedAction`/`predictedConfidence` fields, even if the live Recommendation's interpretation later changes.
9. **Relationships:** `part_of` a `WorldMemoryRecord`; `grades` relationship inverse from `Outcome`.
10. **Persistence expectations:** `WorldMemoryPrediction` table, append-only.
11. **Immutable:** Yes.
12. **Canonical terminology:** Backend: `WorldMemoryPrediction`. Docs: **Prediction** (World Memory sense) vs. **prediction-market data** (an unrelated Crowd-evidence source — always qualified explicitly to avoid the collision).

---

### 2.21 Outcome

1. **Exact meaning:** The graded, real-world result of a Recommendation at one specific time window (`D1`/`W1`/`M1`/`M3`/`M6`/`Y1`) — up to six per Recommendation, per the schema and lifecycle in §1.5. `gradeLabel ∈ {CORRECT, PARTIALLY_CORRECT, INCORRECT, UNGRADEABLE}`.
2. **What it is not:** Not a Lesson (§2.22 — Outcome is the graded fact; Lesson is what was learned from it, often across many Outcomes). Not a live, mutable status — each row is created once, graded, and never updated.
3. **Owner:** `OUTCOME_INTELLIGENCE_ENGINE.md`'s design (schema real, per Sprint 21B; grading algorithm not yet implemented).
4. **Producers:** A future Outcome-grading process (not yet built — this document does not implement one, per Sprint 22D's own constraint).
5. **Consumers:** `CalibrationBucket`, `AttributionSnapshot`, `WorldMemoryLesson` (§2.22), Source historical-accuracy updates (§2.2).
6. **Lifecycle:** Per §1.5 — an individual row is created once, at window maturity; the *Recommendation's* derived status moves `PENDING_OUTCOME` → `PARTIALLY_GRADED` → `FULLY_GRADED`/`GRADING_STALLED` as its windows mature.
7. **Allowed transitions:** None at the row level (creation only); the derived Recommendation-level status advances as windows mature.
8. **Forbidden transitions:** A graded Outcome is never re-graded under the same `methodologyVersion`; a methodology fix produces a new-versioned row, never an edit (`@@unique([recommendationId, timeWindow, methodologyVersion])` is the idempotency guarantee).
9. **Relationships:** `grades` a `Recommendation`/`DecisionTrace`/`WorldMemoryPrediction`; `teaches` a `WorldMemoryLesson`.
10. **Persistence expectations:** `Outcome` table (Sprint 21B, schema only).
11. **Immutable:** Yes.
12. **Canonical terminology:** Backend: `Outcome`, `gradeLabel`, `timeWindow`. Docs: **Outcome**.

---

### 2.22 Lesson

1. **Exact meaning:** A synthesized, durable piece of learning — often connecting a pattern across multiple Outcomes, Sources, or Beliefs rather than describing just one (`ARCHITECTURE.md` §6.7). Never edited; a revised understanding is a new Lesson row with `supersedesId` pointing at the one it replaces.
2. **What it is not:** Not an Outcome (Lesson is the *interpretation* of one or more Outcomes, not the graded fact itself). Not `RESEARCH_ORGANIZATION.md`'s undefined "institutional memory of cycles" as a separate mechanism — that concept is this Lesson node, simply not yet named as such in that document (§3.1 of the reconciliation appendix).
3. **Owner:** `worldMemoryRepository.js` (`appendLesson`).
4. **Producers:** A future learning-synthesis process, or manual/reviewed authorship (analogous to `RecalibrationProposal`'s human-reviewed discipline).
5. **Consumers:** Future Belief/Thesis formation, source-credibility recalibration.
6. **Lifecycle:** Written once; superseded (never edited) when understanding improves.
7. **Allowed transitions:** A new Lesson may `supersedes` an old one.
8. **Forbidden transitions:** Editing or deleting an existing Lesson's `lessonText`, ever — proven by a dedicated test (`worldMemoryRepository.immutability.test.js`) that the original stays exactly as written even after being superseded.
9. **Relationships:** `derived_from`/`teaches`-inverse of one or more `Outcome`s; `part_of` a `WorldMemoryRecord`; `supersedes` an earlier Lesson.
10. **Persistence expectations:** `WorldMemoryLesson` table, append-only.
11. **Immutable:** Yes.
12. **Canonical terminology:** Backend: `WorldMemoryLesson`, `supersedesId`. Docs: **Lesson**.

---

### 2.23 Memory

1. **Exact meaning:** The permanent, append-only historical layer as a whole — `WorldMemoryRecord` (spine) plus its six satellites (`WorldMemoryCausalLink`, `WorldMemoryStateChange`, `WorldMemoryPrediction`, `WorldMemoryThesisRevision`, `WorldMemorySectorImpact`, `WorldMemoryLesson`) plus `Outcome` (`ARCHITECTURE.md` §6.7). "Memory" is not itself a node type — it is the name for this whole subsystem.
2. **What it is not:** Not a cache (`ARCHITECTURE.md` §6.4's in-memory AI caches are explicitly the opposite concept — short-lived, reset on restart). Not a single table.
3. **Owner:** `worldMemoryRepository.js`.
4. **Producers:** Every process that promotes a real-world occurrence, prediction, or learned pattern into permanent storage.
5. **Consumers:** Any future engine needing multi-year historical context — the explicit design target of `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §5's "ten years, billions of events" requirement.
6. **Lifecycle:** Continuously, additively extended; nothing removed.
7. **Allowed transitions:** New records/satellites of any of the seven types, always.
8. **Forbidden transitions:** Any `.update()`/`.delete()`/`.upsert()` on any Memory table — enforced by a source-scanning test, not just documented as a convention.
9. **Relationships:** The persistence substrate for nearly every relationship type in `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §3.
10. **Persistence expectations:** Permanent, by design, forever.
11. **Immutable:** Yes, structurally enforced.
12. **Canonical terminology:** Backend: `WorldMemory*` model family, `worldMemoryRepository.js`. Docs: **World Memory** / **Memory**.

---

### 2.24 Confidence

1. **Exact meaning:** How strongly the available evidence supports a specific claim — a calibration claim, not a rhetorical one: a Belief stated at 70% confidence should turn out correct roughly 70% of the time across enough graded instances (`TRUTH.md` §4, `scoringVocabulary.js`).
2. **What it is not:** Not the same dimension as Uncertainty (§2.25 — confidence measures signal strength, uncertainty measures disagreement; both must be reported, never collapsed into one dial, per §1.6). Not, today, meaningfully distinct from Conviction (§2.26) — see §1.6's resolution.
3. **Owner:** `scoringVocabulary.js` (`SCORE_DEFINITIONS.confidence`).
4. **Producers:** The Recommendation Engine's ranking computation.
5. **Consumers:** `CalibrationBucket` grading, every UI surface showing a confidence number.
6. **Lifecycle:** Recalculated per the five triggers in `EVIDENCE_QUALITY_MODEL.md` §5.
7. **Allowed transitions:** Any evidence-driven adjustment, always moving toward the evidence, never toward a preferred target.
8. **Forbidden transitions:** Never inflated to sound persuasive, never deflated to sound falsely humble (`TRUTH.md` §4); never increased merely from repetition or the passage of time without new evidence (`TRUTH.md` §10).
9. **Relationships:** Attached to every Belief, Thesis, and Recommendation; the input to `CalibrationBucket`.
10. **Persistence expectations:** `Recommendation.confidenceScore`, `DecisionTrace.confidenceCalculation`.
11. **Immutable:** The historical value as stated is immutable; a recalculation produces a new, dated value alongside it, never overwrites it (`TRUTH.md` §9's principle applied to scores, not just records).
12. **Canonical terminology:** Backend/API: `confidenceScore`, `confidence`. **Note the reused-name collision** (§1.6, and the architecture-agent findings): the bare word "confidence(Score)" is reused, unrelated, across `Recommendation`, `/api/ai/analyze`, `DailyBriefSnapshot`, alt-data signals, and committee synthesis — only `conviction`/`modelConfidence` are formally tied to `Recommendation.confidenceScore`; the others are separate, non-equivalent uses of the same word and must never be assumed interchangeable. Docs: **Confidence**.

---

### 2.25 Uncertainty

1. **Exact meaning:** How much genuine disagreement exists across evidence and, where available, Committee expert opinion — distinct from Confidence, which reflects signal strength, not agreement (`scoringVocabulary.js`: `computeUncertainty()` = 100 minus the average of `evidenceAgreement` and committee `consensusLevel`).
2. **What it is not:** Not the inverse of Confidence (per §1.6 — a claim can be high-confidence and high-uncertainty simultaneously, e.g., a strong signal built on genuinely conflicting evidence; a single dial cannot represent that state).
3. **Owner:** `scoringVocabulary.js` (`SCORE_DEFINITIONS.uncertainty`).
4. **Producers:** `computeUncertainty()`, fed by evidence agreement and committee consensus.
5. **Consumers:** `DecisionTrace.confidenceCalculation.uncertainty`; not yet its own UI element.
6. **Lifecycle:** Recalculated whenever contradiction resolves or deepens (`EVIDENCE_QUALITY_MODEL.md` §5.2).
7. **Allowed transitions:** Rises with new conflict, falls as conflict resolves via new corroborating evidence.
8. **Forbidden transitions:** Never smoothed toward the middle to look more decisive; never omitted from a response that also states a confidence number.
9. **Relationships:** Rises when Beliefs `contradict` each other; falls when they `cross_confirm`.
10. **Persistence expectations:** `DecisionTrace.confidenceCalculation.uncertainty`.
11. **Immutable:** Same discipline as Confidence — historical value preserved, revision is additive.
12. **Canonical terminology:** Backend/API: `uncertainty`, `confidenceCalculation.uncertainty`. Docs: **Uncertainty** — never used interchangeably with Confidence in any future document.

---

### 2.26 Conviction

1. **Exact meaning:** Per §1.6's resolution: today, an exact alias of Confidence (`scoringVocabulary.js`'s documented, intentional simplification). In the canonical target model (adopted from `INVESTMENT_INTELLIGENCE_MODEL.md` §6), Conviction will be the sizing ceiling a Thesis could ever justify — "conviction sets the ceiling, timing sets the path" — distinct from both Confidence and Timing, activated once real outcome-calibration data exists to differentiate it.
2. **What it is not:** Not, today, a genuinely separate number from Confidence — any document or subsystem claiming otherwise before the differentiation gate is met is describing target-state design, not current behavior, and must say so explicitly.
3. **Owner:** `scoringVocabulary.js` today; `INVESTMENT_INTELLIGENCE_MODEL.md` §6 for the target definition.
4. **Producers:** `computeConvictionScore(rankingItem)`.
5. **Consumers:** Action-tier selection (which of BUY/REDUCE/EXIT triggers).
6. **Lifecycle:** Same as Confidence, today; target-state lifecycle (differentiated from Confidence, feeding position sizing) is unimplemented.
7. **Allowed transitions:** Same as Confidence, today.
8. **Forbidden transitions:** Never presented as already differentiated from Confidence while the platform still computes them identically.
9. **Relationships:** Determines action-tier selection; target-state: sets the sizing ceiling a Recommendation's position size may never exceed.
10. **Persistence expectations:** `DecisionTrace.rankingResult.convictionScore`, `confidenceCalculation.conviction`.
11. **Immutable:** Same as Confidence.
12. **Canonical terminology:** Backend/API: `convictionScore`, `conviction`. Docs: **Conviction** — always annotated, in any document using it, with whether it means today's alias or the target-state sizing-ceiling concept.

---

### 2.27 Quality

1. **Exact meaning:** A weighted rollup of six components describing how trustworthy a Recommendation's evidence base is: source quality (15%), evidence freshness (15%), portfolio relevance (20%), evidence agreement (20%), data completeness (10%), model confidence (20%) — `QUALITY_WEIGHTS`, `scoringVocabulary.js`.
2. **What it is not:** Not Confidence (Quality measures the evidence base's trustworthiness; Confidence measures the signal's strength). Not Risk (§2.28 — orthogonal dimensions).
3. **Owner:** `autonomousRecommendationEngine.computeQualityScore`.
4. **Producers:** The Recommendation Engine.
5. **Consumers:** `CalibrationBucket(scoreType=QUALITY)`, UI quality pill.
6. **Lifecycle:** Computed once per Recommendation at creation; each of its six components has its own documented fallback (`scoringVocabulary.js`), so the rollup is always computable.
7. **Allowed transitions:** N/A (computed once per Recommendation, not revised in place — a superseding Recommendation carries its own new Quality score).
8. **Forbidden transitions:** Never presented as a single opaque number without its six-component breakdown available.
9. **Relationships:** A property of a Recommendation; independently calibrated from Confidence, per `OUTCOME_INTELLIGENCE_ENGINE.md` §10 ("`qualityScore`'s calibration is genuinely independent, since it's a real weighted composite... not an alias").
10. **Persistence expectations:** `Recommendation.qualityScore` + `qualityComponents`.
11. **Immutable:** Yes, once created (part of the immutable Recommendation record).
12. **Canonical terminology:** Backend/API: `qualityScore`, `qualityComponents`. Frontend: Quality pill (opportunity-colored ≥75, neutral ≥50, risk-colored below). Docs: **Quality**.

---

### 2.28 Risk

1. **Exact meaning:** How much downside/volatility risk a specific Recommendation carries, folding in concentration and macro exposure (`computeSymbolRiskScore`, `autonomousRecommendationEngine.js`).
2. **What it is not:** Not Uncertainty (§2.25 — Risk is about the *position's* downside; Uncertainty is about the *evidence's* disagreement). Disclosed with the same visual/structural weight as upside, never smaller, later, or optional (`VISION.md` Investment Principles).
3. **Owner:** `autonomousRecommendationEngine.js`.
4. **Producers:** The Recommendation Engine's risk computation.
5. **Consumers:** `AttributionSnapshot(dimension=RISK_LABEL)`, Portfolio concentration checks.
6. **Lifecycle:** Computed once per Recommendation; baseRisk defaults to 50 when the underlying `rankingItem.riskScore` is missing.
7. **Allowed transitions:** N/A (computed once per Recommendation).
8. **Forbidden transitions:** Never buried, minimized, or shown with less prominence than expected upside.
9. **Relationships:** A property of a Recommendation; feeds Portfolio concentration/risk metrics.
10. **Persistence expectations:** `Recommendation.riskScore` + `riskLabel`.
11. **Immutable:** Yes, once created.
12. **Canonical terminology:** Backend/API: `riskScore`, `riskLabel` (Recommendation-level); `riskLevel` (a distinct, non-identical field on `matchedEvents` entries — not the same object, do not conflate). Frontend: "Risk {Low|Moderate|High}" label. Docs: **Risk**.

---

### 2.29 Relevance

1. **Exact meaning:** How directly evidence or a Recommendation applies to a user's actual held positions or watchlist, versus a generic market scan — tiered 100 (portfolio) / 70 (watchlist) / 40 (market-scan), with a capped weight boost when held (`scoringVocabulary.js`'s `relevance`/`portfolioRelevance` component).
2. **What it is not:** Not personalization-as-truth-change (§1.6 area, `TRUTH.md` §13.10) — Relevance changes *ordering and emphasis*, never the underlying Belief or Recommendation shown to different users.
3. **Owner:** `autonomousRecommendationEngine.js` (`qualityComponents.portfolioRelevance`), `feedPersonalizationService.js` (feed-level reordering).
4. **Producers:** Symbol-source classification (portfolio/watchlist/market-scan) plus, for the feed, `feedPersonalizationService.rankFeedForInvestor`.
5. **Consumers:** Quality score composite; Daily Feed ordering.
6. **Lifecycle:** Recomputed per request against current portfolio/watchlist state.
7. **Allowed transitions:** Any change in the user's actual holdings/watchlist changes relevance immediately.
8. **Forbidden transitions:** Never fabricates a boost where no honest signal exists (`feedPersonalizationService.js`'s explicit refusal to invent a "passive income" relevance signal it doesn't have real data for).
9. **Relationships:** A `relevant_to` edge weight between a Belief/Thesis/Company and a Portfolio.
10. **Persistence expectations:** Computed at read time, not persisted as history (a live ranking signal, not a graded historical fact).
11. **Immutable:** N/A — a live, recomputed signal by design.
12. **Canonical terminology:** Backend/API: `qualityComponents.portfolioRelevance`, symbol-source badge. Docs: **Relevance**.

---

### 2.30 Source Credibility

1. **Exact meaning:** How reliable an evidence source's outlet/originator is, independent of what any single piece of evidence from it claims — `sourceQualityScore(sourceName)`: 95 for a known high-quality outlet (Reuters, Bloomberg, WSJ, etc.), 60 default (`scoringVocabulary.js`). Per §1.2/§2.2, this is one of two distinct credibility signals: an a-priori baseline (this one) and an outcome-derived track record (`AttributionSnapshot(dimension=SOURCE)`, not yet implemented) — the two must never be conflated as a single number.
2. **What it is not:** Not the same as a Source's reputation writ large (`EVIDENCE_QUALITY_MODEL.md` §2.7's slower-moving prior) nor its measured historical accuracy (§2.6 of that document, the fast-moving, outcome-driven correction) — Source Credibility today implements only the a-priori baseline; the other two are target-state refinements layered on top.
3. **Owner:** `autonomousMarketService.sourceQualityScore`.
4. **Producers:** A static, curated `HIGH_QUALITY_NEWS_SOURCES` list today; target-state: continuously recalibrated via `RecalibrationProposal`.
5. **Consumers:** `qualityComponents.sourceQuality`, Evidence-class default reliability posture (§1.2's tier table).
6. **Lifecycle:** Static today; target-state, revised via the same reviewed, backtested, human-approved recalibration process as any other constant (`OUTCOME_INTELLIGENCE_ENGINE.md` §12) — never a silent, automatic adjustment.
7. **Allowed transitions:** A `RecalibrationProposal`-driven change, reviewed and git-committed.
8. **Forbidden transitions:** Any silent, automated adjustment with no reviewed proposal behind it.
9. **Relationships:** A property of a Source (§2.2); an input to Evidence scoring (§2.3).
10. **Persistence expectations:** A hardcoded constant today; target-state: a first-class, versioned Source-credibility record.
11. **Immutable:** The constant's current value is mutable only via a reviewed code change, never a runtime toggle.
12. **Canonical terminology:** Backend/API: `sourceCredibility`, `qualityComponents.sourceQuality`, `HIGH_QUALITY_NEWS_SOURCES`. Docs: **Source Credibility**.

---

### 2.31 Freshness

*(31st entry — the mission brief's list names 30 concepts ending at Freshness, but Confidence/Uncertainty/Conviction/Quality/Risk/Relevance/Source Credibility/Freshness are eight scoring dimensions the brief lists after the 22 domain-object concepts; Freshness is retained here as the eighth and final scoring concept, completing the requested set.)*

1. **Exact meaning:** How recent a piece of Evidence is, decayed over time — the single concept previously expressed under three different names across the three source strata (`Freshness` in `INTELLIGENCE_PLATFORM_BLUEPRINT.md`'s Engine 1 scorer naming; "half-life"/"decay"/"stale" in `INVESTMENT_INTELLIGENCE_MODEL.md` §4.4 and `RESEARCH_ORGANIZATION.md` §6/§8). **Resolution: Freshness is the canonical name**, since the Blueprint is the only source to reify it as a named, scored output; "half-life," "decay," and "staleness" are the mechanism by which Freshness changes over time (§4, `EVIDENCE_QUALITY_MODEL.md`), not competing names for the score itself.
2. **What it is not:** Not the same as Decay (Decay is the *rate function*; Freshness is the *current reading* — `EVIDENCE_QUALITY_MODEL.md` §2.3). Not uniform across evidence classes — Primary evidence decays slowly in freshness but never in reliability; Crowd evidence decays almost immediately (§4, `EVIDENCE_QUALITY_MODEL.md`).
3. **Owner:** `autonomousMarketService.recencyScore` / `scoringVocabulary.js`'s `evidenceFreshness`.
4. **Producers:** Computed from `publishedAt` at read/scoring time.
5. **Consumers:** `qualityComponents.evidenceFreshness`, Evidence-class decay curves.
6. **Lifecycle:** 100 within 6h, decaying to 10 beyond 168h (`recencyScore`); 40 fallback when `publishedAt` is missing.
7. **Allowed transitions:** Continuously recomputed against the present as time passes — never a stored, static value.
8. **Forbidden transitions:** Never treated as timeless — even Primary evidence, whose *reliability* never decays, still has its *relevance* discounted by Freshness over time (§4, `EVIDENCE_QUALITY_MODEL.md`).
9. **Relationships:** A property of Evidence; an input to Belief confidence recalculation (`EVIDENCE_QUALITY_MODEL.md` §5, trigger 5).
10. **Persistence expectations:** Computed at read time from `publishedAt`; not itself persisted as a historical value (the underlying `publishedAt` timestamp is what's permanent).
11. **Immutable:** N/A — a live, recomputed signal by design (the timestamp it's computed from is immutable; the score is not).
12. **Canonical terminology:** Backend/API: `freshnessScore` (Event Envelope level), `evidenceFreshness` (quality-component level) — confirmed the same underlying value under two names depending on context (`API_CONTRACTS.md` §3.44/§3.45); both are canonical, context-dependent names for one concept, not a conflict to resolve further. Docs: **Freshness**.

---

## 3. Reconciliation Appendix

Every contradiction identified by `ARCHITECTURE_CONSISTENCY_AUDIT.md` and by this document's own research pass, with its resolution and the section governing it.

| # | Contradiction | Source(s) | Resolution | Governing section |
|---|---|---|---|---|
| 1 | Fact/Belief binary (`TRUTH.md`) vs. Fact/Inference/Judgment ternary (`RESEARCH_ORGANIZATION.md`) | `TRUTH.md` §1; `RESEARCH_ORGANIZATION.md` §7.1 | Both survive, nested: Belief is the node type; Fact/Inference/Judgment are the three permitted epistemic-method labels a Belief carries. | §1.1 |
| 2 | Six Evidence classes vs. four source tiers, non-identical taxonomies | `EVIDENCE_QUALITY_MODEL.md` §1; `RESEARCH_ORGANIZATION.md` §8 | Tier is a property of the source; class is a property of the specific claim. Explicit mapping table, including the mandatory Crowd/Rumor split within Tier 4. | §1.2 |
| 3 | Four incompatible Thesis lifecycles/state machines | `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 3; `INVESTMENT_INTELLIGENCE_MODEL.md` §2-3; `RESEARCH_ORGANIZATION.md` §6; `EVIDENCE_QUALITY_MODEL.md` §6.2 | Collapsed into one model: a maturity axis (FORMING/TESTING/STANDING) plus a standing-status axis (STRENGTHENING/WEAKENING/STABLE) plus one closure set (INVALIDATED/EXPIRED/HARVESTED). `EXPIRED`, missing from the Blueprint's enum, is restored. | §1.3, §2.9 |
| 4 | "Recommendation" absent from both philosophy documents despite `INVESTMENT_INTELLIGENCE_MODEL.md` claiming to govern "every recommendation" | `INVESTMENT_INTELLIGENCE_MODEL.md` (whole document); `RESEARCH_ORGANIZATION.md` (whole document) | `Recommendation` (the shipped object) is canonical. "Sized thesis"/"allocation view" (Investment Intelligence Model) and "Investment Council Record" (Research Org) are the unimplemented governance-layer's names for related-but-not-identical future concepts, explicitly not treated as existing alternatives to `Recommendation` today. | §1.4, §2.16 |
| 5 | "Investment Council" (Research Org, human governance body) vs. "Investment Committee" (Blueprint/shipped, six-persona debate engine) — near-identical names, different bodies | `RESEARCH_ORGANIZATION.md` §2, §13; `ARCHITECTURE.md` §6.5 | Not the same thing. "Committee Debate" is reserved exclusively for the shipped engine. "Investment Council" remains unimplemented and must not be conflated with it. | §1.7 |
| 6 | 11-department "Investment Council" structure structurally reintroduces the exact two-verdict risk Sprint 18A fixed, multiplied across 11 sources | `RESEARCH_ORGANIZATION.md` §6, §13; `ARCHITECTURE.md` §6.5 | The never-a-second-decision-owner rule is extended, explicitly, to any future governance layer, not just today's Committee. | §1.7 |
| 7 | Confidence vs. Uncertainty: `TRUTH.md`'s mandatory dual-dial model vs. `RESEARCH_ORGANIZATION.md` §9's single five-band confidence scale with no independent disagreement axis | `TRUTH.md` §3; `RESEARCH_ORGANIZATION.md` §9 | `TRUTH.md`'s dual-dial model is canonical and non-negotiable. Any future implementation of the five-band scale must carry Uncertainty as a second, genuinely independent value. | §1.6, §2.24, §2.25 |
| 8 | Confidence vs. Conviction: `scoringVocabulary.js` says they're numerically identical today; `INVESTMENT_INTELLIGENCE_MODEL.md` §6 builds a load-bearing distinction on top of them being separate | `scoringVocabulary.js` (via `API_CONTRACTS.md` §3.44); `INVESTMENT_INTELLIGENCE_MODEL.md` §6 | Both correct, at different times: alias today, differentiated (sizing-ceiling) target-state once outcome data justifies it. Every reference must state which sense it means. | §1.6, §2.26 |
| 9 | "Belief"/"believability" — Research Org's analyst-trust weighting vs. TRUTH.md/Evidence-Quality-Model's proposition-type "Belief" | `RESEARCH_ORGANIZATION.md` §4, §11; `TRUTH.md` §1 | Disambiguated: "believability" (Research Org) = analyst-trust weighting, a Source-credibility-adjacent concept (§2.2/§2.30), never to be confused with Belief (§2.8), the proposition node type. | §2.8, §2.30 |
| 10 | Source Credibility — one signal (`sourceQualityScore`) vs. two signals implied by the Blueprint (a-priori baseline + outcome-derived track record) | `scoringVocabulary.js`; `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 4 | Both are real and distinct; today only the a-priori baseline is implemented. The outcome-derived track record is named as unimplemented target-state, not conflated with the baseline. | §2.30 |
| 11 | Freshness vs. half-life vs. decay vs. staleness — one concept, three vocabularies | `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 1; `INVESTMENT_INTELLIGENCE_MODEL.md` §4.4; `RESEARCH_ORGANIZATION.md` §6, §8 | Standardized on **Freshness** (the only source to name it as a scored output); half-life/decay/staleness are the mechanism, not competing names. | §2.31 |
| 12 | `action`/`decision`/`verdict`/`finalDecision`/`investmentRating` — five different names touching "what should the user do," only one canonical | `API_CONTRACTS.md` §3.6, §3.8, §3.9, §3.39, §3.44 | `Recommendation.action`/`canonicalVerdict.action` is the sole canonical decision value. The other four are explicitly named as non-canonical: two structurally forbidden as committee-output keys, one frozen/legacy, one live-but-unreconciled and out of scope until a future sprint addresses it. | §2.17 |
| 13 | "thesis" reused as a field name on both `Recommendation.explanation.thesis` and `Theme.thesis`, no stated relationship | `API_CONTRACTS.md` §3.39, §3.50 | A Recommendation's `explanation.thesis` is a point-in-time narrative snapshot; `Theme.thesis` is the live-read-time view over the Theme's append-only `WorldMemoryThesisRevision` sequence (§1.3, §2.9). Related, not identical — the Recommendation-level field is a frozen excerpt, not a live pointer. | §2.9 |
| 14 | `Prediction` used for two unrelated senses: `WorldMemoryPrediction` (memory record) vs. `predictionMarketProbabilities` (a Crowd-evidence financial data feed) | `ARCHITECTURE.md` §6.7; `API_CONTRACTS.md` §3.6, §3.17 | Both real, both kept, always qualified explicitly ("Prediction" for the World Memory sense, "prediction-market data" for the Crowd-evidence sense) to prevent confusion. | §2.20 |
| 15 | "Lesson"/institutional memory described conceptually in `INVESTMENT_INTELLIGENCE_MODEL.md` §10.3 with no awareness that `WorldMemoryLesson` already implements it | `INVESTMENT_INTELLIGENCE_MODEL.md` §10.3; `ARCHITECTURE.md` §6.7 | `WorldMemoryLesson` is canonical and already shipped (schema); `INVESTMENT_INTELLIGENCE_MODEL.md` §10.3's "institutional memory of cycles" is the same concept, simply not yet aware of its own implementation — no new mechanism needed. | §2.22 |
| 16 | Mechanism-vs-timing grading (`INVESTMENT_INTELLIGENCE_MODEL.md` §10.1) — a real gap in the shipped `Outcome` design | `INVESTMENT_INTELLIGENCE_MODEL.md` §10.1; `OUTCOME_INTELLIGENCE_ENGINE.md` §3 | Adopted as a named, scoped future extension (a `mechanismGrade` field) to the existing `Outcome` table — not a parallel grading system. | §1.5 |
| 17 | 100-analyst / 11-department ambition vs. `ARCHITECTURE.md` §7.4's single-tenant, no-multi-user, process-local-cache reality | `RESEARCH_ORGANIZATION.md` (whole document); `ARCHITECTURE.md` §7.4, §6.4 | Not resolved by this document — named explicitly as an open infrastructure gap that must close before any org-scale ambition is implemented. Not a term-definition conflict; carried forward as a stated precondition. | (no section owns infrastructure scope; flagged here per the audit's recommendation 8) |
| 18 | Standing rule for future "forget the implementation" documents | `ARCHITECTURE_CONSISTENCY_AUDIT.md` recommendation 9 | Adopted: any future document written under a "forget the implementation" instruction must, before being treated as governing, be reconciled against this document the same way this document reconciled Stratum B — the process this document itself is the output of. | (standing rule, this appendix) |

---

## Mandatory reading

This document is mandatory reading, alongside `VISION.md`, `TRUTH.md`, `EVIDENCE_QUALITY_MODEL.md`, and `KNOWLEDGE_GRAPH_ARCHITECTURE.md`, for every future subsystem, engine, document, and AI Analyst built inside ImpactOne. Where any other document — including `ARCHITECTURE.md`, `API_CONTRACTS.md`, `INTELLIGENCE_PLATFORM_BLUEPRINT.md`, `OUTCOME_INTELLIGENCE_ENGINE.md`, `RESEARCH_ORGANIZATION.md`, and `INVESTMENT_INTELLIGENCE_MODEL.md` — appears to define one of the 30 concepts above differently, this document governs, and the other document is either updated to reference this one or is itself out of date. A future document written under a "forget the implementation" instruction is not exempt from this rule; it is exactly the situation this document exists to prevent from recurring unreconciled.
