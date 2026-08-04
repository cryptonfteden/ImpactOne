# Confidence Migration Plan

**Phase:** CONFIDENCE-UNIFICATION-001. Companion to [UNIFIED_CONFIDENCE_ARCHITECTURE.md](UNIFIED_CONFIDENCE_ARCHITECTURE.md). Documentation only — a staged rollout plan, not an implementation. Every stage is designed to be independently shippable and reversible, consistent with this platform's own established "no big-bang migrations" discipline (`AGENT_SCALABILITY.md`'s own evolution-path sequencing, `NEXT_GEN_ARCHITECTURE.md`'s explicit rejection of migrating all 13 agents into the Claim Layer at once).

---

## Guiding constraint

**No stage changes any agent's actual computed confidence number.** Every stage is a labeling, extraction, or registration change. This is deliberate: the goal of this migration is *comparability and discoverability*, not *recalibration* — recalibration is explicitly deferred to `CALIBRATION_STRATEGY.md`, and requires real Outcome-grading data this platform does not yet have per-agent.

---

## Stage 0 — Register existing formulas (documentation only, zero code risk)

Add a new `scoringVocabulary.js` `SCORE_DEFINITIONS` entry for each of the 14 real agents' existing confidence formulas (e.g., `institutionalConfidence`, `macroConfidence`, `insiderConfidence`, `etfFlowConfidence`, `analystConsensusConfidence`, `newsConfidence`, and so on), documenting — not changing — each one's real formula/weights/fallback, exactly as `optionsAnomalyConfidence` already does today. This requires reading each agent's own `confidenceModel.js` (already done for 5 of them this session) and transcribing its real constants into the shared registry's documentation format.

**Risk: none.** This is pure documentation of already-shipped, already-tested behavior. **Value: immediate** — every one of the 14 formulas becomes discoverable in one place instead of requiring a source-code read of 14 separate files.

## Stage 1 — Add the `basis` field to each agent's confidence result (additive, one line per agent)

Each of the 14 `confidenceModel.js` files' `computeConfidence()` return value gains one new field: `basis: "AVAILABILITY_GATED_ADDITIVE"` (for the 4-of-5-reviewed pattern) or `basis: "PROPORTIONAL_AVAILABILITY"` (for Macro's pattern) or a newly-named third value for any agent whose actual shape doesn't cleanly match either (to be confirmed per-agent during implementation, not assumed from this session's 5-agent sample alone).

**Sequencing:** do this for **one agent first** (recommended: Insider, since its formula is the cleanest, most textbook instance of the `AVAILABILITY_GATED_ADDITIVE` pattern reviewed this session) — confirm the field is additive and non-breaking against its own real test suite, then roll out to the remaining 13.

**Risk: minimal.** Adding a field to a return object does not change any existing consumer that reads `.confidence` directly; only a new consumer reading `.basis` is affected, and no such consumer exists yet.

## Stage 2 — Extract `structuralPenalties` as a listable array (refactor, not a new formula)

For each agent that already applies a fixed structural penalty (Institutional, ETF Flow, Analyst Consensus, confirmed this session; others to be confirmed during implementation), refactor the single subtracted constant into the `structuralPenalties: [{ name, points, reason, permanent }]` array shape from `UNIFIED_CONFIDENCE_ARCHITECTURE.md` §9 — the *numeric result is identical*, only the shape describing it becomes richer/listable.

**Sequencing:** independent of Stage 1; can proceed in parallel, agent by agent, as time allows. **Risk: minimal** — each agent's own existing test suite already asserts the final `confidence` number; as long as that number is unchanged, this refactor is safe by construction (verifiable by re-running that agent's existing tests unmodified).

## Stage 3 — Extract the shared `clampedAdditiveScore()` utility (opt-in, not mandatory)

Create `backend/services/sharedConfidence/clampedAdditiveScore.js`, a pure function formalizing the base+capped-bonuses-minus-penalties+clamp pattern already independently written 4 times. **Migrate exactly one existing agent to use it** (recommended: Insider again, for the same reason as Stage 1) as a proof-of-concept, confirming its existing test suite passes unmodified against the refactored implementation (same inputs, same outputs, different internal code path).

**Do NOT migrate all 4 (or 14) agents to this utility in the same stage.** Validate one real conversion first; only then consider whether the remaining agents adopt it (some may reasonably choose not to, if their own formula's shape diverges enough that force-fitting it would reduce clarity — this is a legitimate, permitted outcome, not a failure of the migration).

## Stage 4 — Extract the shared `capAndRedistributeWeights()` utility (resolves the real, disclosed duplication from §0)

Create the same shared utility for the dominance-cap algorithm currently duplicated between `claimConfidence.js` and `marketSentimentRollup.js`. **Migrate one of the two existing call sites first** (recommended: the Market Sentiment Engine, since it is the older of the two and was the original the Claim Layer's own comment cites as the source it "reimplemented... not imported"), confirming its own real test suite passes unmodified. Only after that one migration is validated in production should the second call site (`claimConfidence.js`) be migrated.

**This directly, respectfully resolves the tension identified in §0** — the explicit "each engine owns its own weighting logic" precedent is preserved (each engine still chooses its own `rawWeights`/`maxWeight`), while the previously-duplicated *algorithm* becomes a single, once-tested implementation.

## Stage 5 — Wire freshness/source-quality reuse where a new vendor integration creates a natural opportunity (no forced retrofit)

Rather than retrofitting all 14 existing agents to consume `autonomousMarketService.recencyScore()`/`sourceQualityScore()` (real risk of unintended behavior change to already-shipped, already-tested formulas), **wait for the next natural touchpoint** — e.g., when Analyst Consensus's own disclosed future path to a second real ratings vendor is implemented (per this engagement's own prior research), that is the natural moment to introduce a real source-quality weighting, reusing the already-real function rather than each future integration inventing its own.

---

## Rollback plan

Every stage above is independently revertible:
- **Stage 0** (registry documentation): revert by deleting the new `SCORE_DEFINITIONS` entries — zero behavioral impact either way.
- **Stage 1** (`basis` field): revert by removing the field — no consumer depends on it yet at rollback time by construction (it is new).
- **Stage 2** (`structuralPenalties` array): revert to the single subtracted constant — the final `confidence` number is identical either way, so this is a zero-risk revert.
- **Stage 3/4** (shared utilities): revert the one migrated call site back to its own local implementation — since the utility is a pure, tested reimplementation of identical logic, this revert is mechanical, not a design change.

## What this plan explicitly does NOT do

- **Does not force all 14 agents onto one shared confidence formula** — `UNIFIED_CONFIDENCE_ARCHITECTURE.md` §1 explicitly preserves Macro's genuinely different `PROPORTIONAL_AVAILABILITY` shape as a first-class pattern, not a deviation to be corrected.
- **Does not attempt cross-agent numeric calibration** in any stage — see `CALIBRATION_STRATEGY.md`.
- **Does not touch `scoringVocabulary.js`'s existing 12 entries** — only additive new entries are proposed.
- **Does not migrate more than one agent/call-site per utility-extraction stage** without first validating that one conversion in isolation — directly following this platform's own established "validate one real path before wider adoption" discipline (`NEXT_GEN_ARCHITECTURE.md` §1's identical sequencing for the Claim Layer proof-of-concept).
