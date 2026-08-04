# Sprint 38 — Investment Intelligence Committee — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 2 · **Date:** 2026-07-20

## Mission

Transform ImpactOne from a Recommendation Engine into an Investment Intelligence Committee: multiple independent specialists evaluate the exact same evidence from different professional perspectives and debate — the committee never votes, and the final recommendation still comes from the existing Recommendation Engine.

## Architecture

```
Providers → Evidence Matrix (evidenceMatrixService) → Committee → CIO
                                                          │
                                       (never feeds the canonical
                                        Recommendation Engine)
```

- **`intelligenceCommitteeService.js`** is the ONLY file allowed to call `evidenceMatrixService.buildEvidenceMatrix(symbol)`. It builds the matrix once and hands the same object to all 8 members — proven by a safety test that greps every member file for a direct `evidenceMatrixService` or provider-registry import.
- **8 member modules** (`backend/services/intelligenceCommittee/members/`) are pure functions `evaluate(evidenceMatrix) → standardOutput`. Each reads only its designated category row(s) via `evidenceMatrixLookup.findCategory`.
- **`committeeCoordinator.js`** collects the 8 outputs and computes agreement/disagreement/strongest supporting/strongest contradictory/missing/stale evidence — using a "strongest single member's own confidence," never an average across members.
- **`chiefInvestmentOfficerService.js`** reads only the coordinator's summary (never raw evidence) and produces a qualitative (not numeric-blended) confidence label plus the mission's required narrative fields.
- **`GET /v2/committee-intelligence/:symbol`** (new, distinct from the legacy `/committee/*` debate routes) returns `{ committee, cio, isVerdict: false }`.

## Member Responsibilities

| Member | Evidence-matrix row(s) consumed | Notes |
|---|---|---|
| Macro Economist | NEWS, COT | Rates/inflation/employment/bonds/dollar are honestly reported as missing — not yet wired into the matrix. |
| Technical Analyst | TECHNICAL | Never references analyst ratings; flags `STALE` when the underlying bar is >5 days old. |
| Institutional Specialist | INSTITUTIONS | Currently always UNAVAILABLE (SEC/SPDR adapters UNCONFIGURED) — reported honestly, never fabricated. |
| Derivatives Specialist | OPTIONS | Never calls a trade bullish from calls alone — inherits the upstream rule that directional bias requires a confirmed sweep/block. |
| Social Intelligence Specialist | SOCIAL | Never upgrades post activity into a directional stance; labels fixture data. |
| Equity Research Specialist | ANALYSTS, FUNDAMENTALS | Surfaces `disagreement: true` explicitly rather than smoothing it. |
| Market Sentiment Specialist | SENTIMENT | Explicitly reports "Fear & Greed Index: no provider integration exists yet" — no such integration exists anywhere in the codebase. |
| Research Specialist | RESEARCH (fixed this sprint — was a hardcoded stub) | Never says "this strategy works"; reports registry principle count and defers to `researchAgentService.describeTestStatus`'s own honest regime-scoped language. |

## Standard Output

Every member returns exactly: `memberId, memberName, headline, reasoning, supportingEvidence, counterEvidence, confidence, uncertainty, freshness, missingEvidence, isRecommendation: false` (`standardMemberOutput.js`, enforced by a constructor that throws if a required field is missing or non-numeric).

## Interaction Diagram

```
symbol
  │
  ▼
evidenceMatrixService.buildEvidenceMatrix(symbol)   ← only orchestrator calls this
  │
  ├──► macroEconomistMember.evaluate(matrix)      ─┐
  ├──► technicalAnalystMember.evaluate(matrix)     │
  ├──► institutionalSpecialistMember.evaluate(...) │
  ├──► derivativesSpecialistMember.evaluate(...)   ├─► 8 independent standard outputs
  ├──► socialIntelligenceMember.evaluate(...)      │   (no member sees another's output)
  ├──► equityResearchMember.evaluate(...)          │
  ├──► marketSentimentMember.evaluate(...)         │
  └──► researchSpecialistMember.evaluate(...)     ─┘
  │
  ▼
committeeCoordinator.summarizeCommittee(outputs)  → agreement/disagreement/strongest evidence/missing/stale
  │
  ▼
chiefInvestmentOfficerService.summarizeForCio(summary) → overallThesis/confidence/largestDisagreement/highestRisk/
                                                          missingInformation/whyExists/whyMayBeWrong
```

## Safety (proven, not asserted)

9 tests in `services/intelligenceCommittee/safety.test.js`:
- No member `require()`s `autonomousRecommendationEngine`, `canonicalVerdict`, `portfolioEngineService`, `orderService`, or `tradeExecutionService`.
- No member `require()`s `evidenceMatrixService`, `providerRegistry`, or `providerIngestionService` directly — grep-verified.
- Only the orchestrator file imports `evidenceMatrixService`.
- The coordinator and CIO output objects never contain `averageConfidence`/`blendedConfidence`/`score` fields — asserted directly.
- Disagreement is surfaced explicitly (`disagreement.status === "DISAGREEMENT"` with named supportive/contrary members), never smoothed away.
- Stale evidence (`freshness: "STALE"`) survives from a member's output through to the coordinator's `staleEvidence` list.
- A member given an `UNAVAILABLE` evidence-matrix row reports `confidence: 0` and non-empty `missingEvidence`, never fabricating a stance.
- Every standard output is grep/assert-confirmed to carry `isRecommendation: false` and no `action`/`verdict` field.
- `convene()` end-to-end never sets `isVerdict: true` anywhere in its output tree.

## Live vs. Fixture Status

Real end-to-end run (`GET /api/v2/committee-intelligence/AAPL` against the live backend) showed genuinely mixed results, not a canned demo: Technical Analyst reported `CONTRADICTORY` (RSI overbought against an uptrend), Derivatives Specialist explicitly labeled itself `FIXTURE` (options-flow provider UNCONFIGURED), Institutional Specialist and Macro Economist both reported `UNAVAILABLE`/missing inputs honestly rather than inventing a read.

## Testing

- **Backend:** 473/473 tests passing (462 pre-existing + 5 evidence-matrix RESEARCH-row tests + 9 committee safety/regression tests, minus the 3 already-fixed provider-count tests carried over from Sprint 37).
- **Frontend:** 148/148 tests passing (10 in `IntelligenceConsoleScreen.test.jsx`, including a new Sprint 38 test asserting the panel renders each specialist and the CIO's largest disagreement).
- **Production build:** clean, 99.66 KB gzip JS — unchanged, since the new panel reuses existing UI primitives.
- **Committee regression:** the 9 safety tests above.
- **Browser walkthrough (desktop, 1280px):** started both dev servers with `VITE_DEV_CONSOLE=true`, navigated to Intelligence Console, entered AAPL, clicked "Convene committee," and confirmed the real CIO summary ("4 of 8 committee members lean contrary... Confidence: MODERATE_MAJORITY") and all 8 specialist rows rendered with real confidence/uncertainty/freshness/counter-evidence/missing-evidence — screenshotted.
- **Mobile walkthrough (390px):** reached the same screen via Profile → More → Intelligence Console (the mission's own established mobile pattern for dev-console screens), confirmed `document.body.scrollWidth === window.innerWidth` (390 === 390, no horizontal overflow) and zero browser console errors — screenshotted.
- **No public/external API contract changed** — `/v2/committee-intelligence/*` is additive, matching every prior sprint's precedent for new internal/console-facing endpoints.

## Remaining Blockers

- **Macro inputs** (rates, inflation, employment, bonds, dollar): no provider integration exists; the Macro Economist honestly reports each as missing evidence rather than fabricating a read.
- **Institutional evidence**: still UNCONFIGURED (inherited from Sprint 37 — SPDR/SEC adapters need real credentials or the free SPDR CSV work Sprint 37's report recommended).
- **Fear & Greed Index**: no integration anywhere in the codebase; the Market Sentiment Specialist reports this explicitly every time it runs.
- **Live options-flow / CoinGlass data**: both remain FIXTURE (same external blockers documented in Sprint 37).

## Future Committee Members

Candidates named implicitly by the evidence matrix's still-`UNAVAILABLE` rows once their underlying providers activate: a dedicated **Fixed Income / Rates Specialist** (once real rates/bonds data is wired), a **Regulatory/Legal Specialist** (SEC filings once parsed beyond raw feed), and a **Fear & Greed / Cross-Asset Sentiment Specialist** once a real index integration exists — each would slot into the existing pattern (one evidence-matrix category, one pure `evaluate()` function, zero new coupling) without touching the coordinator or CIO layer.

## Recommendation

The committee framework is real, not decorative: every member is a pure function of the evidence matrix, disagreement is surfaced structurally rather than smoothed, and 9 executable safety tests prove independence rather than asserting it in a comment. The one genuine gap fixed this sprint (RESEARCH row was a hardcoded stub) means all 8 members now have a real, if sometimes honestly-empty, evidence source. The next sprint building on this should prioritize activating SPDR's free CSV data (Sprint 37's own recommendation) — it would immediately upgrade the Institutional Specialist from permanently UNAVAILABLE to a genuinely useful voice.
