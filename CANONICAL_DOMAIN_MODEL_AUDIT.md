# Canonical Domain Model Audit
## Office of the Independent Chief Architect

**Mandate:** Review `CANONICAL_DOMAIN_MODEL.md` and every documentation change made during Sprint 22D, and verify ten specific consistency properties. No code was modified or inspected as part of this review; no uncommitted application code was examined.

---

## 0. Controlling Finding — The Requested Artifacts Do Not Exist

Before any of the ten checks can be performed as specified, two facts have to be stated plainly, because they change what this audit is actually able to certify:

1. **`CANONICAL_DOMAIN_MODEL.md` does not exist anywhere in this repository.** A repository-wide search for the filename returns nothing, tracked or untracked.
2. **"Sprint 22D" does not exist.** A full-text search across every document in the repository, and a review of the git commit history, returns zero matches. The most recent real commits on record are the Sprint 21A/21B World Memory work (`feat(backend): add World Memory schema...`, `docs: document the World Memory model in ARCHITECTURE.md and PROJECT_STATUS.md`). No Sprint 22 work of any kind — A, B, C, or D — has commits, and no document mentions it.

This audit cannot certify the consistency of a document that was never written, or documentation changes that were never made. Reporting otherwise would itself be exactly the kind of unearned confidence every document in this platform's own epistemology (`TRUTH.md` §13.1) explicitly forbids.

**What this audit does instead:** it applies the same ten checks to the actual current state of the domain model — which is not one canonical document, but a set of fragments spread across `TRUTH.md`, `EVIDENCE_QUALITY_MODEL.md`, `KNOWLEDGE_GRAPH_ARCHITECTURE.md`, `ARCHITECTURE.md`, `API_CONTRACTS.md`, `INTELLIGENCE_PLATFORM_BLUEPRINT.md`, `OUTCOME_INTELLIGENCE_ENGINE.md`, `RESEARCH_ORGANIZATION.md`, and `INVESTMENT_INTELLIGENCE_MODEL.md`. Most of this ground was already covered by `ARCHITECTURE_CONSISTENCY_AUDIT.md`, produced earlier today; this audit re-verifies those findings, incorporates one document not previously reviewed (`KNOWLEDGE_GRAPH_ARCHITECTURE.md`), and applies the ten specific checks requested here. **The absence of a canonical document is not a stylistic gap — it is precisely the condition that makes checks #1 and #9 fail by construction: there cannot be "one definition only" for a term when no single document has ever been designated as the place that definition lives.**

---

## 1. Every major domain term has one definition only

**Result: FAIL.**

| Term | Definitions found | One only? |
|---|---|---|
| **Thesis** | (a) `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 3: an object with status `active/strengthening/weakening/invalidated/realized`. (b) `INVESTMENT_INTELLIGENCE_MODEL.md` §2–3: a 7-state lifecycle (`Forming→Testing→Strengthening/Weakening→Mature→Harvested/Dying`) with a 3-way death taxonomy. (c) `EVIDENCE_QUALITY_MODEL.md` §6.2: an append-only revision sequence with no named states. (d) `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.11/§3.4: a node type, versioned via `supersedes`/`strengthens`/`weakens`/`invalidates` edges, no status field at all. (e) `RESEARCH_ORGANIZATION.md` §6: not a state machine but a document-stage name ("Department Thesis"). | **No — five incompatible representations.** |
| **Confidence** | (a) `TRUTH.md` §4 / `EVIDENCE_QUALITY_MODEL.md` §5 / `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.10: a calibration claim, explicitly independent of uncertainty. (b) `API_CONTRACTS.md` §3.44: `confidence` and `conviction` are, today, literally the same stored number. (c) `RESEARCH_ORGANIZATION.md` §9: a single-dial, five-band score (Very Low–Very High) with no separate uncertainty axis at all. | **No.** |
| **Evidence tier/class** | (a) `EVIDENCE_QUALITY_MODEL.md` §1: six classes (Primary, Secondary, Crowd, Speculation, Rumor, Unknown). (b) `RESEARCH_ORGANIZATION.md` §8: four tiers (Primary/Verifiable, Vetted Proprietary, Professional Secondary, Crowd/Unverified) plus a separate Banned category. No document maps one taxonomy onto the other. | **No.** |
| **Committee** | (a) `investmentCommitteeService.js`/`canonicalVerdict.js` (documented in `ARCHITECTURE.md` §6.5, `API_CONTRACTS.md` §3.8): a fixed six-persona debate layer with no verdict authority. (b) `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.19: "Analyst / Committee Member" node. (c) `RESEARCH_ORGANIZATION.md`: no node or role literally named "Committee" exists at all — the analogous body is "Investment Council," never stated to be the same thing. | **No — three documents, and it is not even clear all three are describing the same entity.** |

---

## 2. Fact, inference, judgment, hypothesis, belief, and thesis are clearly distinguishable

**Result: FAIL.**

- `TRUTH.md` §1 sets a strict **binary**: *Fact* and *Belief*, nothing else.
- `RESEARCH_ORGANIZATION.md` §7.1 sets a strict **ternary**: *Fact*, *Inference*, *Judgment* — and never uses the word "Belief" anywhere in the document.
- `EVIDENCE_QUALITY_MODEL.md` and `KNOWLEDGE_GRAPH_ARCHITECTURE.md` build directly and consistently on `TRUTH.md`'s binary (Belief as the graph's "most granular unit of interpreted knowledge," §2.10), and clearly distinguish Belief from Thesis ("nothing downstream... is permitted to rest directly on raw Evidence without an intervening Belief," `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.10, citing `EVIDENCE_QUALITY_MODEL.md` §6.3). This part of the model — Belief vs. Thesis — **is** clearly and consistently distinguished, across three documents that cite each other correctly.
- **"Hypothesis" is not a defined domain term anywhere in this repository.** A full search finds exactly two incidental, non-formal uses of the word: `RESEARCH_ORGANIZATION.md` §9.1 ("little more than a hypothesis worth tracking," describing a confidence band, not a domain object) and `TRUTH.md` §10 ("an analyst process that only gathers evidence supporting its leading hypothesis," a colloquial usage). No document defines what a Hypothesis *is* as a class of statement, nor how it differs from a Belief. If Hypothesis is meant to be a distinguishable domain term, it currently does not exist to be distinguished.

**Net result:** Belief vs. Thesis is well handled; Fact vs. Belief/Inference/Judgment is defined twice, differently, by two documents that do not cite each other; Hypothesis is undefined.

---

## 3. Evidence classes and source tiers are mapped without contradiction

**Result: FAIL — no mapping exists at all**, contradictory or otherwise.

`RESEARCH_ORGANIZATION.md` §8's four tiers and `EVIDENCE_QUALITY_MODEL.md` §1's six classes were both written as if each were the platform's only evidence taxonomy. Concretely: `RESEARCH_ORGANIZATION.md`'s Tier 4 ("Crowd/Unverified") merges what `EVIDENCE_QUALITY_MODEL.md` treats as two classes with explicitly different reliability postures — Crowd ("moderate, dependent entirely on sample size and independence") and Rumor ("low by default, regardless of plausibility," §2.1). Treating these as one tier directly contradicts `EVIDENCE_QUALITY_MODEL.md`'s explicit instruction that aggregated crowd signal and individual rumor must never be scored the same way. No third document reconciles the two; neither original document is even aware the other's taxonomy exists.

---

## 4. Confidence and uncertainty remain independent dimensions

**Result: FAIL, unresolved since the prior audit.**

`TRUTH.md` §3 states this as a hard requirement: *"A system that only has one dial for 'how sure am I' cannot represent [high confidence + high uncertainty simultaneously] honestly, and is therefore epistemically inadequate by this document's standard."* `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.10 and §4.3 correctly build on this (a Belief is "held with confidence and uncertainty"; conflict "must carry that conflict forward as a recorded property... elevated uncertainty... not resolve it invisibly").

`RESEARCH_ORGANIZATION.md` §9 has not changed since the prior audit: it still defines confidence as a single 0–100% dial across five named bands, with no independent uncertainty/disagreement score anywhere in the document. This document remains, by `TRUTH.md`'s own explicit and already-ratified standard, epistemically inadequate. This is a **repeat finding** — it was raised in `ARCHITECTURE_CONSISTENCY_AUDIT.md` earlier today and remains unaddressed, because no document has been changed since.

---

## 5. There is one lifecycle for Thesis, Recommendation, and Outcome

**Result: FAIL — now five representations for Thesis alone, and Recommendation/Outcome remain separately inconsistent.**

| Object | Lifecycle representation | Source |
|---|---|---|
| Thesis | 5-state status enum | `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 3 |
| Thesis | 7-state narrative lifecycle + 3-way death taxonomy | `INVESTMENT_INTELLIGENCE_MODEL.md` §2–3 |
| Thesis | append-only revision sequence, no named states | `EVIDENCE_QUALITY_MODEL.md` §6.2 |
| Thesis | node + `supersedes`/`strengthens`/`weakens`/`invalidates` edges, no status field | `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.11, §3.4 (**newly identified — a fifth representation not present in the prior audit**) |
| Recommendation | 3-state enum: `ACTIVE`/`SUPERSEDED`/`EXPIRED` | `ARCHITECTURE.md` §6.5, `OUTCOME_INTELLIGENCE_ENGINE.md` §11 |
| Outcome | `gradeLabel ∈ {CORRECT, PARTIALLY_CORRECT, INCORRECT, UNGRADEABLE}` per time window, plus a **separately derived** (not stored) `PARTIALLY_GRADED`/`FULLY_GRADED`/`GRADING_STALLED` status | `OUTCOME_INTELLIGENCE_ENGINE.md` §11 |

No document in the repository states how the Thesis Engine's status enum, the graph's edge-based representation, and `INVESTMENT_INTELLIGENCE_MODEL.md`'s narrative lifecycle relate to one another as the *same* underlying object. Adding `KNOWLEDGE_GRAPH_ARCHITECTURE.md` did not reduce this fragmentation — it added a fifth vocabulary.

---

## 6. Committee Debate has no decision ownership

**Result: PASS, with one previously-flagged and still-open minor gap, and one naming ambiguity.**

This is the one check in this audit with a genuinely positive, well-evidenced finding. `SPRINT_18A_AUDIT.md` documents that `canonicalVerdict.js` structurally strips a denylist of decision-shaped keys (`action`, `decision`, `verdict`, `finalDecision`, `recommendation`) from committee output before it can reach any response, and that the committee's synthesis narrative has its `decision` field "deliberately removed" (`API_CONTRACTS.md` §3.8). `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2.19 correctly models the Analyst/Committee Member as a node that "produces Beliefs and participates in Recommendations" — never one that owns a Recommendation outright. This rule holds consistently everywhere it is addressed.

Two caveats, both already on record and neither newly broken:
- `SPRINT_18A_AUDIT.md` itself flags that the denylist omits the literal word **`rating`**, one of five terms a prior requirement explicitly named as forbidden. This gap has not been closed as of this audit.
- **Naming ambiguity, newly observed here:** `RESEARCH_ORGANIZATION.md` never uses the word "Committee" at all. Its closest analog, "Investment Council," is explicitly given final-verdict ownership (§13) — which is *consistent* with the real Committee's lack of verdict authority only if "Investment Council" and "Committee" are different bodies. No document states whether they are the same, different, or how they relate. Given check #1's finding above, this ambiguity is part of the same underlying problem, not a new one.

---

## 7. Knowledge Graph, World Memory, and DecisionTrace use compatible terminology

**Result: CONSISTENT WITH WARNINGS — the best-aligned pairing in this audit, but not fully reconciled.**

`KNOWLEDGE_GRAPH_ARCHITECTURE.md` is, on its own, the most disciplined document reviewed here with respect to citing its neighbors: it names `DecisionTrace` and `Outcome` with definitions that match `ARCHITECTURE.md`/`OUTCOME_INTELLIGENCE_ENGINE.md` exactly (§2.14–2.15), and it explicitly acknowledges World Memory's existence rather than ignoring it: *"Several correspond closely to structures already established elsewhere in this platform's design (`CanonicalEvent`, the World Memory model, `Recommendation`/`DecisionTrace`); this section names the concept, those other documents own the persistence detail."*

However, that acknowledgment stops short of an actual mapping. Nowhere does either document state, explicitly, that:
- `KNOWLEDGE_GRAPH_ARCHITECTURE.md`'s `Lesson` node (§2.16) *is* `WorldMemoryLesson` (`ARCHITECTURE.md` §6.7) — they describe the same "never edited, a revision is a new node pointing at the one it supersedes" behavior, in nearly identical language, without ever using each other's proper name.
- The graph's causal relationship types (`causes`, `increases_probability`, `influences`, §3.2) *are* what `WorldMemoryCausalLink` persists.
- The graph's `Sector`/`exposed_to` structures *are* what `WorldMemorySectorImpact` persists.

Both documents gesture at the other's existence and neither makes the connection concrete. This is a materially better state than checks #1–#5 (nothing here actively contradicts anything else), but it does not yet satisfy "compatible terminology" as a verified, cross-referenced fact — it is compatible by apparent coincidence of good design, not by demonstrated reconciliation.

---

## 8. API, backend, frontend, and architecture terminology are aligned

**Result: CONSISTENT, within the implementation-grounded document set — unchanged from the prior audit.**

`ARCHITECTURE.md` and `API_CONTRACTS.md` remain well cross-referenced (§6.5 ↔ §3.44/3.45, §6.7 ↔ the World Memory schema) and describe a single, versioned system. `KNOWLEDGE_GRAPH_ARCHITECTURE.md`'s node/relationship types have no corresponding API endpoints, routes, or Prisma models anywhere in `API_CONTRACTS.md` — but the document is explicit and honest about this from its own opening line ("A design document... no database, no API, no code follows from this document directly"), so this is a disclosed scope boundary, not a silent contradiction, and is not counted against this check.

---

## 9. No document silently preserves an incompatible definition

**Result: FAIL.**

This is where the audit's findings compound into their sharpest form. `RESEARCH_ORGANIZATION.md` and `INVESTMENT_INTELLIGENCE_MODEL.md` contain, as of this review, **zero citations** of `TRUTH.md`, `EVIDENCE_QUALITY_MODEL.md`, or `KNOWLEDGE_GRAPH_ARCHITECTURE.md` — despite covering the same ground (evidence quality, confidence, belief, thesis) with incompatible definitions, as detailed in checks #1–#5. `ARCHITECTURE_CONSISTENCY_AUDIT.md`, produced earlier today, already identified this exact condition and recommended a reconciliation pass before further implementation. **No document has changed since that audit was written** (confirmed: no new commits, no `CANONICAL_DOMAIN_MODEL.md`, no Sprint 22 activity of any kind). A finding that is identified, written down, and then left completely unaddressed by the next audit cycle is a process failure in its own right, independent of the original inconsistency.

---

## 10. The model is understandable enough for a new engineer, analyst, and product manager

**Result: FAIL.**

A new engineer today would need to read at least eight long-form documents and manually reconcile five competing Thesis representations, two competing evidence taxonomies, and two competing epistemic taxonomies (Fact/Belief vs. Fact/Inference/Judgment) to arrive at one mental model — which is precisely the work this audit had to perform to write itself. A product manager or analyst who read only `RESEARCH_ORGANIZATION.md` and `INVESTMENT_INTELLIGENCE_MODEL.md` would walk away believing the platform is organized around 100 human-like AI analysts, an Investment Council, and four evidence tiers. A product manager or analyst who read only `TRUTH.md`, `EVIDENCE_QUALITY_MODEL.md`, and `KNOWLEDGE_GRAPH_ARCHITECTURE.md` would walk away believing it is organized around Belief/Thesis/Recommendation/Outcome graph nodes, six evidence classes, and a confidence/uncertainty pair. **These two people would be describing what they believe is the same platform in mutually unrecognizable terms**, and no document in the repository would help either of them discover that the other description exists.

---

## Consolidated Contradictions — Exact Document Evidence

1. **Confidence model.** `TRUTH.md` §3: *"A system that only has one dial for 'how sure am I' cannot represent that state honestly, and is therefore epistemically inadequate by this document's standard."* vs. `RESEARCH_ORGANIZATION.md` §9 (a single five-band, 0–100% confidence dial, no uncertainty axis defined anywhere in the document).
2. **Epistemic taxonomy.** `TRUTH.md` §1: *"There are exactly two kinds of statement the platform is allowed to make: Fact... Belief."* vs. `RESEARCH_ORGANIZATION.md` §7.1: *"Every sentence... must be classifiable as exactly one of the following... Fact... Inference... Judgment"* — a ternary taxonomy that never uses the word "Belief."
3. **Evidence taxonomy.** `EVIDENCE_QUALITY_MODEL.md` §1: six classes, explicitly separating Crowd ("moderate... dependent entirely on sample size and independence") from Rumor ("low by default, regardless of plausibility") vs. `RESEARCH_ORGANIZATION.md` §8: a single "Crowd/Unverified" tier merging both.
4. **Thesis lifecycle (five incompatible representations).** `INTELLIGENCE_PLATFORM_BLUEPRINT.md` Engine 3 (`active/strengthening/weakening/invalidated/realized`) vs. `INVESTMENT_INTELLIGENCE_MODEL.md` §2 (`Forming→Testing→Strengthening/Weakening→Mature→Harvested/Dying`, a `mermaid` state diagram) vs. `EVIDENCE_QUALITY_MODEL.md` §6.2 (unnamed, append-only revision sequence) vs. `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §3.4 (`supersedes`/`strengthens`/`weakens`/`invalidates` edges, no status field) vs. `RESEARCH_ORGANIZATION.md` §6 (document stages, not a state machine at all).
5. **"Confidence" vs. "conviction."** `API_CONTRACTS.md` §3.44: *"these three are currently the same underlying number under three names."* vs. `INVESTMENT_INTELLIGENCE_MODEL.md` §6: builds a load-bearing philosophical distinction ("conviction sets the ceiling, timing sets the path") on an axis that is, in the running system, numerically identical to confidence.
6. **Naming of the decision-owning body.** `RESEARCH_ORGANIZATION.md` §13: "the Investment Council... owns the final verdict itself" vs. the real Committee (`ARCHITECTURE.md` §6.5, `SPRINT_18A_AUDIT.md`), which is structurally forbidden from owning a verdict — with no document stating whether these are the same body.
7. **Undefined but implied domain term.** No document defines "Hypothesis" as a class of statement, despite the term's presence being expected by the domain model this audit was asked to verify.
8. **World Memory / Knowledge Graph mapping gap.** `KNOWLEDGE_GRAPH_ARCHITECTURE.md` §2: *"this section names the concept, those other documents own the persistence detail"* — acknowledged but never actually mapped; `ARCHITECTURE.md` §6.7's `WorldMemoryLesson`, `WorldMemoryCausalLink`, and `WorldMemorySectorImpact` are never named in `KNOWLEDGE_GRAPH_ARCHITECTURE.md`, despite describing near-identical behavior to its `Lesson` node and causal relationship types.
9. **Unaddressed repeat finding.** `ARCHITECTURE_CONSISTENCY_AUDIT.md` (produced earlier today) already identified findings #1–#6 above and recommended a reconciliation document before further implementation. No document has changed since. This audit's findings are, in substantial part, a confirmation that a previously filed finding remains open.

---

## Verdict

# INCONSISTENT

`CANONICAL_DOMAIN_MODEL.md` does not exist, and no Sprint 22D documentation changes exist to review. In their place, the domain model remains exactly as fragmented as `ARCHITECTURE_CONSISTENCY_AUDIT.md` found it earlier today, with one new document (`KNOWLEDGE_GRAPH_ARCHITECTURE.md`) that is well-built and well-cited *within* the implementation-grounded document set, but that does not resolve — and in the case of Thesis lifecycle representations, mildly worsens — the fragmentation between that set and the philosophy-layer documents (`RESEARCH_ORGANIZATION.md`, `INVESTMENT_INTELLIGENCE_MODEL.md`). Of the ten requested checks, one passes cleanly (#6, Committee decision ownership), one is a disclosed and acceptable scope boundary (#8), one is a genuine but incomplete improvement (#7), and seven fail. A canonical domain model cannot be certified consistent when it has not yet been written.
