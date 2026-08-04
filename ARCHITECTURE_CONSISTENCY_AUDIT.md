# Architecture Consistency Audit
## Office of the Chief Architect

**Mandate:** Determine whether every document governing ImpactOne's intelligence layer describes **one coherent system** — not two systems that happen to share a repository.

**Documents in scope:**
`VISION.md` · `ARCHITECTURE.md` · `API_CONTRACTS.md` · `RESEARCH_ORGANIZATION.md` · `INVESTMENT_INTELLIGENCE_MODEL.md` · `TRUTH.md` · `EVIDENCE_QUALITY_MODEL.md` · World Memory (`ARCHITECTURE.md` §6.7, `backend/prisma/schema.prisma`, `PROJECT_STATUS.md` §28 — no standalone `WORLD_MEMORY.md` exists) · `INTELLIGENCE_PLATFORM_BLUEPRINT.md` (referenced throughout the above as the five-engine design target).

**Status update (Sprint 22D):** every contradiction this audit identifies below has been resolved in `CANONICAL_DOMAIN_MODEL.md`, whose reconciliation appendix (§3) maps each finding to its resolution one-for-one. This audit's findings are preserved below verbatim as the historical record of what was found — `CANONICAL_DOMAIN_MODEL.md` is now the governing document for every term this audit discusses.

---

## 0. Method and the Finding That Precedes All Others

Before checking any of the eleven required dimensions, one structural fact has to be named, because it is the cause of nearly everything below it.

This repository currently contains **two strata of documents that were built by two different processes and never introduced to each other:**

- **Stratum A — the implementation-grounded lineage:** `VISION.md` → `TRUTH.md` → `EVIDENCE_QUALITY_MODEL.md` → `ARCHITECTURE.md` → `API_CONTRACTS.md` → `INTELLIGENCE_PLATFORM_BLUEPRINT.md` → World Memory. These documents cite each other by name and by section number constantly (`EVIDENCE_QUALITY_MODEL.md` opens by citing `TRUTH.md` §2; `ARCHITECTURE.md` §6.5 cites `INTELLIGENCE_PLATFORM_REVIEW.md`; `API_CONTRACTS.md` §3.44 is cited from `ARCHITECTURE.md` §6.5). They reference real files (`scoringVocabulary.js`, `canonicalVerdict.js`, `worldMemoryRepository.js`), real Prisma models (`WorldMemoryRecord`, `Outcome`, `DecisionTrace`), and real, already-shipped enums and formulas. This stratum is, internally, a genuinely well-maintained single system with a real version history (Sprint 16 through Sprint 21B).
- **Stratum B — the philosophy layer:** `RESEARCH_ORGANIZATION.md` and `INVESTMENT_INTELLIGENCE_MODEL.md`. Both were produced under an explicit instruction to *forget the current implementation* and *not discuss implementation*. Both comply with that instruction completely — which is exactly the problem. Neither document contains a single citation of `TRUTH.md`, `EVIDENCE_QUALITY_MODEL.md`, `scoringVocabulary.js`, `DecisionTrace`, `Outcome`, or World Memory, despite covering the same ground — evidence quality, confidence, thesis lifecycle, disagreement handling — that Stratum A already covers in detail, with different words, different structures, and different numbers.

A system is not "one coherent system" merely because both strata are internally well-written. It is one coherent system only if a person or a future engine could pick up any two of these documents and find the same concept meaning the same thing. That test fails repeatedly below.

---

## 1. Naming Consistency

| Concept | Stratum A name | Stratum B name | Consistent? |
|---|---|---|---|
| The thing that decides what a user sees | `canonicalVerdict.buildCanonicalVerdictView` (a deterministic function), `Recommendation`, `DecisionTrace` | "Investment Council," "Investment Council Record" | **No.** No mapping is stated anywhere. |
| The body that debates without deciding | The Investment Committee — six fixed personas (`investmentCommitteeService.js`), explicitly demoted by Sprint 18A to a debate layer with no independent verdict | "100 AI analysts," "11 departments," "Department Head," "Director," "Chief Economist" | **No.** Stratum A's committee is small, named, and fixed; Stratum B's org is 100-strong, ranked, and promotable. Nothing states whether B is a future replacement for A's committee, a narrative gloss on top of it, or an unrelated third thing. |
| A durable, evolving investment view | `Thesis` (design-only, `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 3): statement, direction, status (`active/strengthening/weakening/invalidated/realized`) | "Department Thesis" → "Cross-Department Synthesis" → "Investment Council Record" (`RESEARCH_ORGANIZATION.md`); separately, a 7-state lifecycle (`Forming/Testing/Strengthening/Weakening/Mature/Harvested/Dying`) in `INVESTMENT_INTELLIGENCE_MODEL.md` | **No.** Three different names, three different state machines, for what is presented in all three places as "the" thesis lifecycle. |
| A single scored belief | `Belief` (`TRUTH.md` §1, `EVIDENCE_QUALITY_MODEL.md` §6.1) | Not named as a distinct object anywhere in Stratum B | **No.** Stratum B has no equivalent unit smaller than a "thesis," so `TRUTH.md`'s Fact/Belief distinction has nothing to attach to in Stratum B's model. |

**Severity: Critical.** These are not stylistic differences — they are four different nouns for what each document individually claims is the central object of the entire platform.

---

## 2. Responsibility Ownership

Stratum A's ownership model is **code-shaped**: a specific function (`canonicalVerdict.js`) structurally strips verdict-shaped keys from committee output before it can reach a response; `DecisionTrace` is create-and-read-only by construction, enforced by a source-scanning test, not by policy. Ownership is enforced by what the code physically permits.

Stratum B's ownership model (`RESEARCH_ORGANIZATION.md` §13) is **person-shaped**: a named analyst owns authorship, a named reviewer owns department-standard compliance, the Investment Council owns the final verdict, the Chief Economist owns process integrity. Ownership is enforced by career consequence and record-keeping, not by what any system physically permits.

These are incompatible enforcement mechanisms for the same word, "ownership." Neither document states which one actually governs a disagreement. If a "Department Head" and `canonicalVerdict.js` disagree about what a user should see, nothing in either document says which one wins — because neither document acknowledges the other exists.

**Severity: Critical.** Ownership that cannot be located in either an org chart or a codebase, consistently, is not real ownership — it is two separate claims of ownership over the same asset.

**A second, sharper problem:** Sprint 18A's single hardest-won architectural lesson (`ARCHITECTURE.md` §6.5) was that letting two subsystems (the Committee and the Recommendation Engine) independently compute a verdict is a trust failure, fixed by forcing everything through one canonical function. `RESEARCH_ORGANIZATION.md`'s 11 departments each producing an independent "Department Thesis," reconciled only informally at "Cross-Department Synthesis," is structurally the *same* two-verdict risk Sprint 18A already paid to fix — just multiplied across 11 sources instead of 2, with no `canonicalVerdict.js`-equivalent named for the department layer. `RESEARCH_ORGANIZATION.md` does not reference Sprint 18A once.

---

## 3. Terminology

The single clearest, most checkable inconsistency in this entire audit:

`TRUTH.md` §3 states, as an epistemic requirement, not a stylistic preference:

> "Confidence measures signal strength... Uncertainty measures disagreement... It is entirely possible... for a signal to be strong *and* the underlying evidence to be in genuine conflict... A system that only has one dial for 'how sure am I' cannot represent that state honestly, and is therefore **epistemically inadequate by this document's standard.**"

This is not aspirational — `uncertainty` is a real, shipped, documented score (`API_CONTRACTS.md` §3.44: `uncertainty = 100 − average(evidenceAgreement, committee consensusLevel)`), distinct from `confidence`, already wired into `DecisionTrace.confidenceCalculation`.

`RESEARCH_ORGANIZATION.md` §9 defines the Division's entire confidence methodology as **a single dial**: five bands (Very Low through Very High) mapped directly onto one 0–100% number, with no second, independent disagreement/uncertainty axis anywhere in the document. By `TRUTH.md`'s own explicit, already-ratified standard, `RESEARCH_ORGANIZATION.md`'s confidence methodology is epistemically inadequate — not by this auditor's opinion, but by a standard this codebase has already committed to in writing and in code.

A second terminology collision: `scoringVocabulary.js` documents `confidence` and `conviction` as *the same number under two names today*, pending real calibration data (`API_CONTRACTS.md` §3.44). `INVESTMENT_INTELLIGENCE_MODEL.md` §6 builds an entire, load-bearing philosophical distinction — "conviction sets the ceiling, timing sets the path" — treating conviction as a stable, independent axis from confidence. If conviction and confidence are numerically identical in the running system, §6's central claim is currently unfalsifiable in practice, and nothing in either document flags that dependency.

A third: `RESEARCH_ORGANIZATION.md` §8 defines four source tiers (Primary/Verifiable, Vetted Proprietary, Professional Secondary, Crowd/Unverified, plus Banned). `EVIDENCE_QUALITY_MODEL.md` §1 defines six evidence classes (Primary, Secondary, Crowd, Speculation, Rumor, Unknown) with ten scored dimensions each. These are not the same taxonomy wearing different labels — `RESEARCH_ORGANIZATION.md`'s single "Professional Secondary" tier collapses what `EVIDENCE_QUALITY_MODEL.md` treats as two materially different classes (Secondary reporting vs. Speculation), and its "Crowd/Unverified" tier collapses `EVIDENCE_QUALITY_MODEL.md`'s Crowd (aggregation-derived, "moderate" reliability) and Rumor (individually near-worthless, "low by default regardless of plausibility") into one bucket that `EVIDENCE_QUALITY_MODEL.md` explicitly says must never be merged.

**Severity: Critical**, on all three points above.

---

## 4. Evidence Flow

Stratum A's evidence flow is precise and singular: raw source → `EventEnvelope` (19 required fields, `API_CONTRACTS.md` §3.45) → scored via the Shared Scoring Vocabulary → referenced from `DecisionTrace.evidenceReferences`. One canonical shape, frozen on purpose so multiple future engines integrate against it.

`RESEARCH_ORGANIZATION.md` §6 describes a differently-shaped pipeline: Raw Source → **Evidence Note** → **Department Thesis** → **Cross-Department Synthesis** → **Investment Council Record**. `Evidence Note` has no defined field list, no relationship to the 19-field `EventEnvelope`, and no stated correspondence to `sourceCredibility`/`freshnessScore`/`relevanceScore` — the exact fields `EventEnvelope` already carries for this purpose.

`INVESTMENT_INTELLIGENCE_MODEL.md` never specifies a structural evidence shape at all — it discusses evidence entirely in prose (informativeness, half-life, corroboration) without anchoring any of it to `EventEnvelope`, `sourceCredibility`, or `evidenceAgreement`, the exact fields that already exist to make those prose concepts computable.

**Severity: High.** Evidence flow is described three times, with three different vocabularies, and only one of the three is wired to anything that runs.

---

## 5. Memory Flow

Stratum A's memory model is concrete and already migrated: `WorldMemoryRecord` (spine) plus seven append-only satellites — `WorldMemoryCausalLink`, `WorldMemoryStateChange`, `WorldMemoryPrediction`, `Outcome`, `WorldMemoryThesisRevision`, `WorldMemorySectorImpact`, `WorldMemoryLesson` — enforced append-only by a source-scanning test, not merely a stated convention (`ARCHITECTURE.md` §6.7).

`INVESTMENT_INTELLIGENCE_MODEL.md` §10.3 describes "institutional memory of cycles" — every full cycle "preserved as institutional memory, not discarded" — which is, conceptually, almost exactly `WorldMemoryLesson` and `WorldMemoryCausalLink`. But it never names them. A future engineer implementing "institutional memory" as described in §10.3 has a real, live, already-migrated schema sitting one document away and no way to know it from reading §10.3 alone — the likely outcome is either duplicated infrastructure or a second, incompatible memory system built to satisfy the same requirement.

**Severity: High.** This is the audit's one genuinely *good news* finding hiding inside a bad one: Stratum A already built the thing Stratum B is asking for. The inconsistency is that nobody has told Stratum B that.

---

## 6. Belief Flow

`TRUTH.md` §1 sets a strict, binary epistemic taxonomy: **Fact** and **Belief**, nothing else. `EVIDENCE_QUALITY_MODEL.md` §6 builds directly on that binary, defining a strict one-directional flow — evidence → Belief → Thesis → Recommendation → Outcome — with an explicit rule that a recommendation may never weigh raw evidence directly, bypassing the Belief layer (§6.3), specifically to prevent two recommendations resting on "the same" evidence from being justified by inconsistent reasoning.

`RESEARCH_ORGANIZATION.md` §7.1 defines a **three-way** taxonomy instead — Fact, Inference, Judgment — with no reference to "Belief" as a term or a layer at all. This is not a renaming of the same two-part split; it is a structurally different epistemic model (a binary vs. a ternary classification) presented by two documents that each claim, independently, to be the platform's foundational epistemology.

**Severity: Critical.** A platform cannot have two different, uncited, structurally different answers to "what kinds of statements am I allowed to make" and describe itself as one system.

---

## 7. Thesis Lifecycle

Four non-identical state machines exist for "how does a thesis live and die," none of which reference each other:

| Source | States |
|---|---|
| `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 3 (design-only) | `active` → `strengthening` / `weakening` → `invalidated` / `realized` (5 states) |
| `INVESTMENT_INTELLIGENCE_MODEL.md` §2–3 | `Forming` → `Testing` → `Strengthening` / `Weakening` → `Mature` → `Harvested` / `Dying` (7 states, plus a 3-way death taxonomy: invalidated / expired / harvested) |
| `RESEARCH_ORGANIZATION.md` §6 | No thesis state machine at all — only document stages (Evidence Note → Department Thesis → Cross-Department Synthesis → Investment Council Record) |
| `EVIDENCE_QUALITY_MODEL.md` §6.2 | A thesis "changes more slowly... revised only when accumulated weight... crosses a real threshold," represented as an append-only revision sequence with no named states at all |

Notably, `INVESTMENT_INTELLIGENCE_MODEL.md`'s three-way death taxonomy (invalidated / expired / harvested) never mentions the one death mode that Stratum A's own grading design (`OUTCOME_INTELLIGENCE_ENGINE.md`) already had to account for: a company delisting, going bankrupt, or being acquired mid-thesis. Stratum A handles this with an explicit `UNGRADEABLE` grade label and a required `ungradeableReason` (e.g. `"delisted"`) — meaning Stratum A already anticipated a failure mode that Stratum B's supposedly more philosophically rigorous lifecycle model omits entirely.

**Severity: Critical.** "Thesis lifecycle" is the single most load-bearing shared concept across every document in this audit, and it is defined four incompatible ways.

---

## 8. Recommendation Lifecycle

Stratum A's `Recommendation.status` is a real, shipped three-state enum: `ACTIVE` / `SUPERSEDED` / `EXPIRED` (`ARCHITECTURE.md` §6.5, `OUTCOME_INTELLIGENCE_ENGINE.md` §11).

Neither `RESEARCH_ORGANIZATION.md` nor `INVESTMENT_INTELLIGENCE_MODEL.md` distinguishes a "Recommendation" from a "Thesis" as separate objects with separate lifecycles the way Stratum A does. `INVESTMENT_INTELLIGENCE_MODEL.md` in particular uses "thesis" for what Stratum A would model as *either* a `Thesis` (Engine 3, design-only) *or* a `Recommendation` (real, shipped) depending on which layer is meant — the two are conflated throughout the document. This matters concretely: `RESEARCH_ORGANIZATION.md`'s "Investment Council Record," described as immutable once issued, has no stated relationship to `SUPERSEDED` — Stratum A's actual mechanism for how a changed view is represented without editing history. Two different immutability mechanisms, again unreconciled.

**Severity: High.**

---

## 9. Outcome Lifecycle

Stratum A's outcome model is precise: up to six `Outcome` rows per recommendation (`D1, W1, M1, M3, M6, Y1`), each graded independently, `gradeLabel ∈ {CORRECT, PARTIALLY_CORRECT, INCORRECT, UNGRADEABLE}`, a documented composite formula (`direction × 0.50 + magnitude × 0.30 + timeliness × 0.20`), and a derived (not stored) `PARTIALLY_GRADED / FULLY_GRADED / GRADING_STALLED` status.

`RESEARCH_ORGANIZATION.md`'s Calibration & Track Record Department (§3.10) describes grading in terms of "Brier score," "calibration curve," and "outcome grading against explicit, pre-committed success criteria" — directionally compatible with Stratum A, but never once referencing `gradeLabel`, the six time windows, or the documented composite formula. It reads as a description of a *different* grading system that happens to share a goal.

`INVESTMENT_INTELLIGENCE_MODEL.md` §10.1 introduces a genuinely new idea not present anywhere in Stratum A: grading "was the mechanism right" *independently* from "was the timing right." This is a real, valuable addition — Stratum A's `Outcome` model currently grades only price direction, magnitude, and timeliness, never whether the *causal story* was correct. This is the one place in this audit where Stratum B has identified something Stratum A's shipped design is missing. As written, it is not integrated: there is no `mechanismGrade` field, no attribution path for it, and no owner named for building it.

**Severity: Medium** for the un-integrated-but-genuine improvement; **High** for the vocabulary mismatch with the shipped `gradeLabel` system.

---

## 10. Future Scalability

`RESEARCH_ORGANIZATION.md` assumes, as its starting premise, "eventually 100 AI analysts" running continuously across 11 departments, each accumulating a multi-year, per-analyst, per-domain calibration record. `ARCHITECTURE.md` §7.4, describing the system these philosophy documents are meant to eventually govern, states plainly: *"Only one default portfolio exists today. No multi-user or account-scoped portfolios."* Earlier sections of `ARCHITECTURE.md` (§6.4) note that AI/intelligence caching is in-memory and "resets on server restart" — process-local state, not horizontally scalable by construction.

Neither philosophy document acknowledges this gap. A 100-analyst, multi-year, per-domain believability-weighting system (`RESEARCH_ORGANIZATION.md` §4, §11) cannot be operated on a single-tenant system with process-local caches and no per-entity persistent identity — the storage and scaling model this scale of ambition requires is an order of magnitude beyond what `ARCHITECTURE.md` documents as existing today, and nothing bridges that gap.

**Severity: High.**

---

## 11. Future Maintainability

The clearest maintainability risk this audit found is not a contradiction of fact but a contradiction of *awareness*: Stratum A's `OUTCOME_INTELLIGENCE_ENGINE.md` design already specifies a minimum sample-size gate before any recalibration proposal is generated ("only runs when sample size clears a minimum threshold — ≥100 graded outcomes") and a drift-alert threshold tuned to avoid small-sample noise ("sampleSize ≥ 20"). Both of these are exactly the kind of statistical safeguard `RESEARCH_ORGANIZATION.md`'s and `INVESTMENT_INTELLIGENCE_MODEL.md`'s aggregate confidence/calibration methodology (§9, §10) never mentions needing. Because Stratum B does not cite Stratum A, a future engineer implementing Stratum B's "Calibration & Track Record Department" from scratch has a real risk of either re-discovering these same safeguards independently (wasted effort) or implementing a second, differently-tuned version of the same safeguard (silent inconsistency between two subsystems grading the same platform).

More broadly: every future document written under a "forget the implementation" instruction, however useful as a thinking exercise, adds another stratum that has to be manually reconciled later unless a standing rule requires every such document to open with an explicit mapping to the real system's existing vocabulary. Right now, no such rule exists, and this audit is the first time these two strata have been read side by side.

**Severity: Medium**, compounding with every future document added to Stratum B without a reconciliation step.

---

## Verdict

# INCONSISTENT

Not because either stratum is individually weak — Stratum A is a genuinely well-maintained, internally cross-referenced, versioned system, and Stratum B is a genuinely rigorous piece of investment philosophy on its own terms. The verdict is **INCONSISTENT** because, read together, these documents do not describe one system. They describe two systems that both claim to be ImpactOne's foundation, use different nouns for the same central objects (belief, thesis, recommendation, confidence, evidence, memory), define incompatible state machines for the same lifecycles, and have never once been checked against each other until this audit.

---

## What must change before additional implementation continues

1. **Freeze any implementation work that would build directly from `RESEARCH_ORGANIZATION.md` or `INVESTMENT_INTELLIGENCE_MODEL.md`** until a reconciliation pass exists. Neither document is implementation-ready as written — not because the ideas are wrong, but because building against them today would create a second, parallel vocabulary alongside `TRUTH.md`/`EVIDENCE_QUALITY_MODEL.md`/`ARCHITECTURE.md` that nothing currently prevents from diverging further.
2. **Produce one reconciliation document** that maps every Stratum B term to its Stratum A equivalent, explicitly, term by term: Belief vs. Fact/Inference/Judgment; Thesis (four competing lifecycles) to one lifecycle; confidence vs. conviction vs. uncertainty; the four-tier source model vs. the six-class Evidence Quality Model; "Investment Council" vs. `canonicalVerdict.js`/`DecisionTrace`; "100 AI analysts" vs. the six-persona Committee. Where a Stratum B concept has no real equivalent, that must be stated explicitly as *new, unimplemented scope* — not left ambiguous.
3. **Adopt `TRUTH.md`'s confidence/uncertainty dual-dial model as canonical** and rewrite `RESEARCH_ORGANIZATION.md` §9's single-dial confidence-band methodology to incorporate a genuine, separate uncertainty/disagreement axis — as written, it fails a standard this codebase has already committed to elsewhere.
4. **Pick one evidence taxonomy.** Recommend `EVIDENCE_QUALITY_MODEL.md`'s six-class, ten-dimension model as canonical, since it is already tied to real fields (`sourceCredibility`, `evidenceFreshness`, `evidenceAgreement`) — and either retire `RESEARCH_ORGANIZATION.md`'s four-tier model or explicitly redefine it as a simplified restatement with a stated, lossless mapping.
5. **Resolve, explicitly and in writing, what the "100 AI analysts / Investment Council" structure actually is**: a literal future target architecture, a narrative/UX personification layer over the existing five-engine system, or a discontinued exploration. Every finding above compounds for as long as this remains unstated.
6. **Reconcile the thesis/recommendation/outcome lifecycle into one diagram** — one set of states, one owner, one document of record — before any further work proceeds on the Thesis Engine (`INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 3), which currently has three incompatible lifecycle descriptions to choose from.
7. **Integrate `INVESTMENT_INTELLIGENCE_MODEL.md` §10.1's mechanism-vs-timing grading distinction into the real `Outcome` model** — it is a genuine improvement Stratum A does not yet have, and it should be added as a scoped, attributed extension to `OUTCOME_INTELLIGENCE_ENGINE.md`, not left stranded in a document with no schema behind it.
8. **Before scaling toward 100 analysts or 11 departments, close the gaps `ARCHITECTURE.md` §7.4 already documents** — single global portfolio, no multi-tenancy, process-local in-memory caching — since none of Stratum B's ambitions are operable on the infrastructure Stratum A currently admits to having.
9. **Adopt a standing rule**: any future document written under a "forget the implementation" instruction must, before being treated as governing, pass through the same reconciliation step this audit just performed for the first time — otherwise this audit's finding recurs with every new document added.
