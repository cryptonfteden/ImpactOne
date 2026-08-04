# Sprint 39 — Explainability Engine — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 2 · **Date:** 2026-07-20

## Mission

Make every ImpactOne recommendation traceable from final verdict all the way back to its original evidence — no fabricated reasoning, no hidden weighting, no unexplained overrides.

## Architecture

```
Recommendation Engine (unchanged)
        │  writes an immutable DecisionTrace (Sprint 16/18A, unchanged)
        ▼
DecisionTrace  ──────────────────────────────┐
        │  (historical, immutable snapshot)   │
        │                                     │
decisionTraceExplainabilityService            │  re-convenes, live
        │                                     ▼
        └──────────────► Sprint 38 Committee (evidence-matrix-driven)
                                  │
                                  ▼
                          Evidence Matrix → Providers
```

This sprint deliberately does **not** modify `autonomousRecommendationEngine.js` or the live recommendation path — that would risk exactly the "hidden weighting" the mission forbids. Instead, `decisionTraceExplainabilityService.explainRecommendationById(id)` reads the real, immutable `DecisionTrace` row written at recommendation time, and separately re-convenes the Sprint 38 evidence-matrix committee live, for the same symbol, honestly labeled as a **current** re-evaluation rather than a replay of the original moment (evidence changes over time; the two are never conflated).

## Decision Trace Flow

1. `autonomousRecommendationRepository.getById(recommendationId)` — real recommendation, or a 404, never a fabricated stand-in.
2. `autonomousRecommendationRepository.getDecisionTraceByRecommendationId(id)` — the existing immutable trace (`inputEvidence`, `rankingResult`, `confidenceCalculation`, `finalOutput`, legacy `committeeDebate`, `evidenceReferences`). If missing, the service throws rather than inventing one — proven by a test ("no orphan recommendation").
3. `intelligenceCommitteeService.convene(symbol)` — the Sprint 38 committee, run fresh.
4. `disagreementEngine.classifyDisagreement(committee)` — AGREEMENT / PARTIAL_AGREEMENT / STRONG_DISAGREEMENT / CONFLICTING_EVIDENCE / INSUFFICIENT_EVIDENCE, with real pairwise reasons (FRESHNESS / MISSING_PROVIDER / UNCERTAINTY / CATEGORY).
5. `consistencyCheckService.checkConsistency(...)` — compares the recommendation's real action against the live committee's lean; if they don't match, it returns an explicit, named explanation (never silence).
6. `recommendationExplanationService.explainRecommendation(...)` — answers the mission's exact required questions from real fields only.
7. `provenanceService.buildProvenance(evidenceMatrix)` — one record per category: `evidenceId, providerTimestamp, retrievalTimestamp, freshness, status (LIVE/FIXTURE/UNAVAILABLE), sourceCount`.

## Recommendation Explanation

`recommendationExplanationService.js` answers, from real data only:
- **Why this action** — the recommendation's own stored `reasoning`/`explanation`, never a generated sentence.
- **Why not the others** — for BUY, explains why not REDUCE/EXIT (real risk score/expected downside) and why not HOLD (real conviction score crossed the threshold).
- **What evidence mattered most/least** — the committee's `strongestSupportingEvidence` (most) and the available member with the lowest confidence (least).
- **What contradicted this** — `strongestContradictoryEvidence`.
- **What was missing** — the committee's real `missingEvidence` list.
- **What single new fact would most likely change this** — derived from the strongest real counter-evidence, or the first real missing-evidence item if there's no counter-evidence; never a generic "more data would help."

## CIO Explanation

Reuses Sprint 38's `chiefInvestmentOfficerService.summarizeForCio` unchanged — it already never invents evidence and every field it returns already traces to a real committee output.

## Committee Transparency

Each specialist card (Sprint 38's standard output, unchanged) already exposes `reasoning, supportingEvidence, counterEvidence, freshness, confidence, uncertainty, missingEvidence` — this sprint's Evidence Tree section in the UI renders all of them, plus a dedicated `unavailableEvidence` list (categories whose evidence-matrix row is `UNAVAILABLE`) and `staleEvidence` (members whose `freshness === "STALE"`), both read straight off real committee/matrix data.

## Disagreement Engine

`disagreementEngine.js` classifies:
- **AGREEMENT** — every available member leans the same direction.
- **PARTIAL_AGREEMENT** — a small minority (≤1, and outnumbered ≥3:1) disagrees.
- **STRONG_DISAGREEMENT** — a real, non-trivial split.
- **CONFLICTING_EVIDENCE** — at least one member's own evidence contains both supporting and counter items.
- **INSUFFICIENT_EVIDENCE** — no member has any directional evidence at all.

For each supportive/contrary pair, it names a real reason: `FRESHNESS` (one side stale), `MISSING_PROVIDER` (one side has real missing evidence), `UNCERTAINTY` (≥30-point uncertainty gap), or `CATEGORY` (different specialist domains, no other explanation available).

## Recommendation Consistency

`consistencyCheckService.js` maps BUY → expects a SUPPORTIVE live committee lean, REDUCE/EXIT → expects CONTRARY. When the live committee's lean doesn't match, it returns `consistent: false` and names the real supportive/contrary members (or the real "no clear lean" state) — the UI renders this in red, directly under the recommendation's action, so a bearish-committee/Buy-recommendation mismatch is surfaced, never hidden.

## What-If Engine

`intelligenceCommitteeService.convene(symbol, { excludeCategory })` swaps exactly one evidence-matrix category for an honest `UNAVAILABLE` row before any member evaluates it — every other row passes through completely unchanged. `whatIfService.runWhatIf(symbol, category)` runs both the baseline and the excluded-category committee and reports whether the overall lean (SUPPORTIVE/CONTRARY/SPLIT/NO_CLEAR_LEAN) changed. No numeric weight is ever exposed — only a before/after structural comparison, internal-only (dev console).

## Source Provenance

Every category in a live committee run now exposes `evidenceId` (deterministic: `symbol:category:generatedAt`), `providerTimestamp` (the row's `newestSource`), `retrievalTimestamp` (`evidenceMatrix.generatedAt`), `freshness` (`LIVE`/`STALE`/`UNKNOWN`), and `status` (`LIVE`/`FIXTURE`/`UNAVAILABLE`) — proven never to mislabel stale evidence as current, or fixture data as live, by dedicated tests.

## UI

`IntelligenceConsoleScreen.jsx` gained two new sections:
- **Recommendation explainability** — look up a recommendation id; expandable sections for Decision Trace, Committee Debate (historical, immutable), Evidence Tree, Recommendation Explanation, What Could Change My Mind, Counter Evidence, and Missing Evidence, plus a top-line consistency-check banner.
- **What-If Engine (internal)** — symbol + category dropdown, shows baseline vs. excluded-category lean and whether the verdict direction changed.

## Regression (proven, not asserted)

16 tests in `services/explainability/explainability.test.js`:
- Provenance never invents a provider — every field is read directly off the matrix row; stale evidence is never reported as live/current; fixture status is preserved.
- Disagreement classification tested for all 5 levels, including that a single mixed-evidence member alone forces `CONFLICTING_EVIDENCE`.
- Consistency check tested for a matching case, a flat mismatch, and a split-committee mismatch that names the real member ids (never a vague message).
- Recommendation explanation traces every field back to a real input and refuses to run against a null recommendation.
- What-if requires a real `excludeCategory` (no silent no-op) and runs end-to-end against a real evidence matrix.
- **No orphan recommendation**: explaining an unknown recommendation id, or a real recommendation with no DecisionTrace row, throws a 404 rather than fabricating a trace — both cases are explicit tests.
- A full end-to-end bundle assembly test confirms all 8 committee members, the disagreement classification, consistency check, explanation, and 10-row provenance list are all present and real.

The existing Sprint 38 safety suite (9 tests) and evidence-matrix suite (5 tests) were re-run unmodified after this sprint's changes to `intelligenceCommitteeService.convene` and pass unchanged — the new `excludeCategory` parameter is additive and optional, so every existing caller's behavior is unaffected.

## Bugs Found

During browser verification, a pre-existing (not introduced this sprint) React key-uniqueness console warning surfaced in `Header.jsx`'s search-suggestion dropdown under specific focus/typing sequences. It does not affect functionality (confirmed no broken renders) and is unrelated to the Explainability Layer — left unfixed as out of this sprint's scope, flagged here rather than silently ignored.

## Testing

- **Backend:** 489/489 tests passing (473 pre-existing + 16 new explainability tests).
- **Frontend:** 150/150 tests passing (12 in `IntelligenceConsoleScreen.test.jsx`, including 2 new Sprint 39 tests for the explainability lookup and the what-if tool).
- **Production build:** clean, 99.66 KB gzip JS — unchanged.
- **Browser walkthrough (desktop, 1280px):** seeded a real recommendation + DecisionTrace directly in the dev database, started both dev servers with `VITE_DEV_CONSOLE=true`, looked it up in the Explainability panel, expanded Decision Trace / Recommendation Explanation / What Could Change My Mind, confirmed real data rendered (not placeholders), then ran the What-If tool (excluding TECHNICAL for NVDA) and confirmed a real baseline-vs-excluded lean comparison — verified against the live backend, not mocked. Seeded test data was cleaned up from the dev database afterward.
- **Mobile walkthrough (390px):** reached the same panel via Profile → More → Intelligence Console; confirmed `document.body.scrollWidth === window.innerWidth` (390 === 390, no horizontal overflow).
- **Decision trace tests, committee consistency tests, what-if tests:** all included in the 16 new backend tests above.
- **No public/external API contract changed** — `/v2/explainability/*` is additive, matching every prior sprint's precedent.

## Remaining Explainability Gaps

- **Legacy vs. live committee divergence**: the historical `committeeDebate` stored on a `DecisionTrace` comes from the legacy (Sprint 16/18A) `investmentCommitteeService`, while the live re-convened committee shown alongside it is the Sprint 38 evidence-matrix committee — they are two different systems evaluating the same symbol, honestly labeled as such, but not yet unified. A future sprint should decide whether the live recommendation engine should be rewired onto the Sprint 38 committee so both views become the same system over time.
- **What-if is symbol-scoped, not recommendation-scoped**: it recomputes the current live committee with a category removed, not the historical committee at the exact moment a specific past recommendation was made (evidence has since changed) — this is honestly reflected in the UI/API (it's under the What-If Engine's own symbol lookup, not the recommendation-lookup panel) but is worth calling out explicitly.
- **Consistency check only covers BUY/REDUCE/EXIT**: no rule exists yet for a HOLD-equivalent action, since this codebase's recommendation vocabulary doesn't currently produce one.

## Future Improvements

- Extend the What-If Engine to accept multiple simultaneous exclusions (e.g., "without Technical AND Social") to explore compound sensitivity, still without exposing a numeric weight.
- Add a recommendation-scoped what-if that replays the exact `inputEvidence` stored on a historical `DecisionTrace` rather than live data, once/if the recommendation engine is rewired onto the Sprint 38 committee.
- Surface the consistency-check banner and Evidence Tree directly on the (currently separate, not-dev-console-gated) public Recommendations screen, not just the internal console, once product decides how much of this to expose to end users.

## Recommendation

The explainability layer is real and additive: it never touches the live recommendation path, every field it returns traces to a stored or freshly-computed value, and 16 new tests plus the full existing suite (505 backend + frontend tests total) prove the mission's explicit "no orphan recommendation / no fabricated reasoning / no hidden evidence" constraints structurally rather than by comment. The next sprint's highest-leverage move is deciding whether to unify the legacy committee-debate system with the Sprint 38/39 evidence-matrix committee, since that divergence is this sprint's most honest, most consequential remaining gap.
