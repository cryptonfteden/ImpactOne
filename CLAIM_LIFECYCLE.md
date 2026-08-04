# Claim Intelligence Layer — Lifecycle (Phase AI-CORE-001)

**Status:** Implemented. Describes the real, deterministic state machine in `backend/services/claimIntelligence/claimLifecycle.js` — not a proposal.

## 1. The 11 statuses

| Status | Meaning | Accepts new evidence? |
|---|---|---|
| `DRAFT` | Created from the first real evidence entry; not yet promoted (mission §3: never converts one signal into certainty) | Yes |
| `ACTIVE` | Open, stable | Yes |
| `STRENGTHENING` | Open, confidence rose meaningfully since the last transition | Yes |
| `WEAKENING` | Open, confidence fell meaningfully | Yes |
| `CONTESTED` | Open, but real evidence agreement has dropped below the threshold — genuine disagreement, not just a confidence dip | Yes |
| `INVALIDATED` | A real, explicit invalidation condition was triggered | No (pre-grade-terminal) |
| `EXPIRED` | The claim's time horizon passed with neither confirmation nor invalidation | No (pre-grade-terminal) |
| `RESOLVED_CORRECT` | Graded: the predicted direction and a meaningful magnitude both occurred | No (fully terminal) |
| `RESOLVED_PARTIAL` | Graded: the predicted direction occurred, but the real magnitude was trivial | No (fully terminal) |
| `RESOLVED_INCORRECT` | Graded: the real outcome moved the opposite direction | No (fully terminal) |
| `INSUFFICIENT_DATA` | Graded: no real outcome could be determined (also reachable directly if a DRAFT claim never gathers enough evidence — same honest label either way) | No (fully terminal) |

## 2. Two terminal tiers

- **Pre-grade-terminal** (`INVALIDATED`, `EXPIRED`): the claim stopped accepting new evidence, but has not yet been graded against a real outcome. Only `claimResolutionService.resolveClaim()` can move it further.
- **Fully terminal** (`RESOLVED_CORRECT`/`RESOLVED_PARTIAL`/`RESOLVED_INCORRECT`/`INSUFFICIENT_DATA`): done. No further transition, ever — grading is not redone.

This two-tier split exists because "the claim stopped being live" (a real, time/fact-based event) and "we know whether it was right" (a separate, later grading step requiring real outcome data) are genuinely different moments, sometimes far apart in time.

## 3. Deterministic transition rules

`computeNextStatusAfterEvidence({ currentStatus, evidenceCount, confidenceDelta, evidenceAgreementPct, invalidationTriggered })` — a pure function, same inputs always produce the same output:

1. A terminal/pre-grade-terminal claim never reopens — checked first, unconditionally.
2. A real, explicit `invalidationTriggered` always wins over everything else — invalidation is a fact, not a matter of degree.
3. A `DRAFT` claim with fewer than `MIN_EVIDENCE_BREADTH_FOR_ACTIVE` (2) evidence entries stays `DRAFT` — mission §3's "never converts a single raw signal into unjustified certainty," enforced structurally, not just as a norm.
4. Real, structural disagreement (`evidenceAgreementPct < CONTESTED_AGREEMENT_THRESHOLD`, 55%) always resolves to `CONTESTED` — checked before the strengthening/weakening delta rules, since a claim can be `CONTESTED` even while its raw confidence number happens to be rising.
5. Otherwise: `confidenceDelta >= STRENGTHENING_DELTA_THRESHOLD` (8) → `STRENGTHENING`; `confidenceDelta <= -WEAKENING_DELTA_THRESHOLD` (8) → `WEAKENING`; else `ACTIVE`.

Every threshold above is a real, disclosed constant in `claimDimensions.js` — none is hidden inline.

## 4. Expiry — real, per-horizon durations

`claimFormationService.HORIZON_DURATION_MS` maps each reused `TimeWindow` value onto a real, disclosed duration (an honest approximation, stated as such — no engine integrated this phase supplies a precise, native expiry date):

| TimeWindow | Duration | Used by |
|---|---|---|
| `D1` | 2 days | Options-derived claims |
| `W1` | 9 days | Sentiment-derived claims |
| `M1` | 35 days | (future engines) |
| `M3` | 100 days | (future engines) |
| `M6` | 190 days | (future engines) |
| `Y1` | 380 days | (future engines) |

`computeExpiryTransition({ currentStatus, expiresAt, now })` recomputes `EXPIRED` at every read (never a value the caller must remember to invalidate), exactly the same "lifecycle status is a function of `now`, not a cached value" discipline the Intelligence Bus and Market Sentiment Engine already established.

## 5. Superseding — no dedicated status

The mission's approved status list has no `SUPERSEDED` entry (unlike `IntelligenceBusEvent`, which does). Superseding a claim is instead represented by `Claim.supersededByClaimId` (a loose link) plus a terminal-status transition (typically to `EXPIRED`, with a `ClaimTransition.reason` explaining the supersession) — this is a deliberate design choice to stay within the approved 11-status vocabulary rather than silently adding a 12th.

## 6. Auditability — every transition is a real, ordered row

`ClaimTransition` is append-only: `{ claimId, fromStatus, toStatus, reason, triggeringEvidenceId, transitionedAt }`. Every transition names its real trigger (a specific evidence entry, an invalidation event, or a grading decision) in `reason` — the full lifecycle of any claim can be replayed exactly from this log, in order, with no gaps.

## 7. Grading maps 1:1 onto reused `GradeLabel`

`statusForGradeLabel()` is a total, pure function: `CORRECT → RESOLVED_CORRECT`, `PARTIALLY_CORRECT → RESOLVED_PARTIAL`, `INCORRECT → RESOLVED_INCORRECT`, `UNGRADEABLE → INSUFFICIENT_DATA` — the existing `GradeLabel` enum (`Outcome`'s own vocabulary) is reused verbatim, never redefined.
