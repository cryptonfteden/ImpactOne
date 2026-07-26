# Claim Intelligence Layer — Canonical Contract (Phase AI-CORE-001)

**Status:** Implemented. This is the real shape `claimContract.composeClaimView()` produces and `intelligenceEventContract`-style validation (`claimContract.validateContractShape`) checks against — not a proposal.

## 1. The one strict contract

Every Claim exposes exactly these fields, always:

```ts
{
  claimId: string,
  claimType: string,                 // "DIRECTIONAL_FORECAST" for every claim this phase (§7)
  subject: string,                   // e.g. a symbol, or a market code
  market: string | null,
  symbols: string[],
  sectors: string[],
  regions: string[],
  statement: string,                 // the precise, technical claim
  plainLanguageStatement: string,    // the same claim in plain English
  expectedDirection: "BULLISH" | "BEARISH" | "NEUTRAL",
  expectedMagnitude: { min, max, unit } | null,   // honestly null when no real estimate exists
  timeHorizon: "D1" | "W1" | "M1" | "M3" | "M6" | "Y1",  // reused TimeWindow enum
  probability: number | null,        // 0-100 — likelihood of the predicted outcome
  confidence: number | null,         // 0-100 — evidence quality (NOT the same thing, §5)
  uncertainty: number | null,        // 0-100 — 100 minus real evidence agreement
  evidence: ClaimEvidenceView[],      // SUPPORTS-stance entries
  counterEvidence: ClaimEvidenceView[], // CONTRADICTS/INVALIDATES-stance entries
  assumptions: string[],
  confirmationConditions: string[],
  invalidationConditions: string[],
  portfolioImpact: object | null,
  sourceAgents: string[],             // real engineIds that contributed
  provenance: object,
  firstObservedAt: string,
  lastUpdatedAt: string,
  expiresAt: string | null,
  status: ClaimStatus,                // see CLAIM_LIFECYCLE.md
  resolution: object | null,          // populated once terminal
  methodologyVersion: string,
  reasoning: {                        // §2's explicit 4-way separation
    observed: string[],
    inferred: string[],
    predicted: { statement, expectedDirection, probability },
    uncertainty: { score, assumptions, invalidationConditions },
  },
  label: "Claim — evidence and forecast, not a trade instruction",  // governance marker, always present
}
```

No `action`/`decision`/`verdict`/`finalDecision`/`recommendation` field can ever appear — `claimGovernance.assertNoGovernanceViolation()` throws at formation time (top-level and nested in evidence), and `sanitizeClaimView()` strips defensively at every read regardless of what was persisted.

## 2. Observed / inferred / predicted / uncertain — explicit, not implicit

The `reasoning` block makes the mission's required distinction unambiguous rather than leaving a consumer to infer it from the rest of the contract:

| Category | Contract source | Real precedent reused |
|---|---|---|
| Observed | `reasoning.observed` — every `ClaimEvidence.observedFact` | `WorldMemoryRecord` ("the spine — what happened"), `evidenceMatrixService`'s real per-category inputs |
| Inferred | `reasoning.inferred` — every `ClaimEvidence.inference` (real, engine-supplied, never fabricated when absent) | `WorldMemoryCausalLink` ("why it happened"), `evidenceMatrixService`'s `stance` |
| Predicted | `reasoning.predicted` — the claim's own `statement`/`expectedDirection`/`probability` | `WorldMemoryPrediction` ("what prediction did we make") |
| Uncertain | `reasoning.uncertainty` — the claim's `uncertainty` score + its real `assumptions`/`invalidationConditions` | `scoringVocabulary.uncertainty`'s existing definition |

## 3. `ClaimEvidenceView` shape (one evidence-ledger entry, as read)

```ts
{
  id: string,
  intelligenceBusEventId: string | null,
  sourceEngine: string,
  sourceProvider: string | null,
  stance: "SUPPORTS" | "CONTRADICTS" | "INVALIDATES",
  observedFact: string,
  inference: string | null,
  freshness: { ageMs: number | null },
  confidence: number | null,
  independenceGroup: string,
  contributionToClaim: number | null,
  addedAt: string,
}
```

## 4. Confidence vs. probability — never interchangeable (mission §5)

- **Confidence** answers *"how much real, fresh, independent, agreeing evidence backs this?"* — computed from `sourceReliability`, `freshness`, `independence`, `breadth`, and `agreement` (`claimConfidence.aggregateConfidence`).
- **Probability** answers *"how likely is the predicted direction to actually happen?"* — computed ONLY from real directional evidence agreement (and, when supplied, real historical calibration) (`claimConfidence.aggregateProbability`).

These two functions share zero inputs by design. A claim can have high confidence (lots of fresh, independent, agreeing evidence) and a probability that is nonetheless moderate, or vice versa — the contract never collapses them into one number, and neither is ever derived from the other.

## 5. Contract validation

`claimContract.validateContractShape(view)` checks every field in `REQUIRED_CONTRACT_FIELDS` is present — used in tests to assert every consumer-service read produces the full, strict shape, never a partial one.
