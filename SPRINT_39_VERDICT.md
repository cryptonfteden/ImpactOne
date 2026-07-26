# Sprint 39 Verdict
## Explainability Red Team — ImpactOne

---

## Explainability Score: 4 / 10

Strong on invalidation conditions and change history; broken on the CIO-to-committee-to-evidence chain, on disclosing missing evidence, and on explaining the methodology behind several confident-sounding numbers (historical similarity, scenario probabilities, quality-score weighting).

## Trust Score: 4 / 10

A recommendation that shows five expert votes, none of which say "Buy," directly under a headline that says "Buy" — with nothing reconciling the two — is the single most trust-damaging pattern found, because it is not a vague concern but a specific, reproducible contradiction any attentive reader will find.

## Traceability Score: 3 / 10

The chain breaks at three of four links tested: CIO-to-committee (no synthesis statement exists), committee-to-evidence (no vote is tied to a specific fact), and evidence-to-source (only about one in thirty items carries a real, clickable source). Only "why now" and "what changed" trace cleanly.

## Most Confusing Recommendation

**TSLA — Buy**, where all five committee members voted Reduce or Hold, the aggregate committee sentiment was explicitly cautious, and the headline verdict directly above it read "Buy" with no visible explanation for the discrepancy.

## Most Trustworthy Recommendation

Also **TSLA**, specifically for its "Would prove it wrong" and "What changed" sections — genuinely dated, specific, and honest, and the strongest single component found anywhere in this review. The same recommendation is simultaneously this review's most confusing and, in isolated parts, its most trustworthy — a real illustration of how unevenly explainability is currently distributed within one card.

## Top 10 Explainability Defects

1. No visible statement anywhere connects the final "Buy" verdict to the committee's own votes when they disagree with it.
2. Committee members voted Reduce/Reduce/Hold/Hold/Hold on two different tickers reviewed — zero Buy votes — while both cards recommended Buy.
3. No committee vote is linked to a specific piece of evidence — a name, a label, and a number, with no visible "because of X."
4. Fewer than one in thirty evidence items reviewed carries an actual clickable link to its original source.
5. No recommendation states what evidence is missing or was not checked.
6. "Data completeness: 100/100" is shown with no explanation of what completeness is measured against.
7. Bull/base/bear scenario probabilities are stated with no disclosed methodology.
8. "Historical similarity" percentages (e.g., 88%) are stated with no explanation of how similarity is computed.
9. The six components of the quality-score breakdown are shown with no visible formula for how they combine into the final score.
10. The same backend failure produced an honest, staged disclosure on AI Analysis ("temporarily unavailable," stage by stage) but a silent, unexplained empty screen on Recommendations — the same failure, disclosed inconsistently depending on which screen a user happens to be on.

## Would You Trust This Product With Your Own Portfolio?

**Not yet, and not until the committee-verdict contradiction is resolved and evidence sources are made consistently clickable.** The individual pieces this product does well — honest change history, real invalidation conditions, plain language — are good enough that I would want to keep using it once those two specific, fixable gaps are closed. Today, reading closely enough to actually check its reasoning is what surfaces the reasons not to trust it yet, which is exactly backwards from what a product this transparent should produce in a careful reader.
