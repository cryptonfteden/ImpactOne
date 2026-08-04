# Beta Success Metrics
## Office of the Private Beta Readiness Board — ImpactOne

**Mandate:** Define the metrics reviewed every day during the private beta, separated into five categories that are never blended into one score.

---

## Product
- Daily opens per participant.
- Time-to-first-insight on each session (target: ≤90 seconds).
- Screens reached per session.
- Taps-to-action for core daily tasks (target: ≤2 from Home).

## Trust
- Trust Score, all four components tracked separately (`TRUST_SCORE_MODEL.md`): Stated, Behavioral, Resilience, Advocacy.
- Number of open Critical/High findings from `MOBILE_TRUST_AUDIT.md`'s ten-check framework, re-run daily.
- Source-verifiability rate: share of claims shown with a real, checkable source.
- Any confirmed instance of a false personalized claim — tracked as a standalone, zero-tolerance count, not folded into a general trust average.

## Learning
- Graded outcome count accumulated so far.
- Recalibration proposals reviewed (even if none yet apply — the count of zero is itself meaningful this early).
- World Memory lessons recorded.
- Evidence-quality distribution trend (share of Primary/Secondary vs. lower-tier evidence).

## Retention
- Day-1, Day-3, Day-7 retention for the current cohort.
- Say-vs-do gap: divergence between stated trust and actual opens/session behavior for the same participant.
- Referral or "would recommend" signals, tracked separately from stated trust.

## Stability
- Crash count and crash-free session rate.
- Recovery time after a forced failure (network loss, backgrounding).
- Layout-stability incidents (any unintended shift, overlap, or unreachable content) per session.
- Offline-state correctness rate (percentage of forced-offline trials that show an honest offline indicator rather than presenting stale data as live).

---

## The Rule Governing All Five Categories

No category is ever used to explain away a weakness in another. Strong Product and Stability numbers alongside an open Critical Trust finding is not a healthy day — it is a beta that is functioning smoothly while actively telling a user something false, which is a worse state than a beta that is slow but honest. Every daily review reads all five categories side by side, in this exact order, every day, for the duration of the beta.
