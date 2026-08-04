# Trust Score Model
## Office of the Chief Learning Officer — ImpactOne

**Mandate:** Define how ImpactOne objectively measures user trust over time. "Objectively" is the operative word — a trust score built from vibes and a single self-reported number is exactly the kind of single-dial, unearned-confidence measurement this platform refuses to accept from its own market reasoning, and it is held to the identical standard here, applied to itself.

---

## The Governing Principle: Trust Is Measured the Same Way Confidence Is

This platform never allows a single blended number to stand in for a genuinely multi-dimensional truth about the market. Trust in the platform, held by its own users, is exactly as multi-dimensional, and is measured the same way: **multiple independent components, never collapsed into one score without also showing where they disagree.**

---

## The Four Components

| Component | What it measures | How it's collected |
|---|---|---|
| **Stated Trust** | What a user says they believe, in their own words and numbers | Weekly self-report, 1–10 (`PRIVATE_BETA_PLAYBOOK.md` §11) |
| **Behavioral Trust** | What a user's actual actions reveal, independent of what they say | Passive observation: does the user act on recommendations, view evidence chains, return after seeing a graded miss |
| **Resilience Trust** | Whether trust holds, recovers, or breaks after an honest disclosed mistake | Retention and engagement specifically in the period immediately following a graded-incorrect outcome or a disclosed data/provider failure |
| **Advocacy Trust** | Whether trust has compounded into a willingness to vouch for the platform to someone else | Stated "would recommend" likelihood *and* actual referral actions taken, tracked separately since the two frequently diverge |

**No single number replaces these four.** A Trust Score presented without its component breakdown fails this document's standard the same way a confidence score without uncertainty fails `TRUTH.md`'s.

---

## The Most Important Signal: Say vs. Do

The single most valuable check this model performs is comparing Stated Trust against Behavioral Trust for the same user in the same period. A user who reports high stated trust while their behavior shows declining engagement is not a trust success — they are a warning the self-report alone would have hidden. A gap between the two is treated as more informative than either number alone, and is the first place investigated whenever the two disagree.

---

## Resilience Trust — the Component Unique to This Platform

Most products only measure whether trust is high. This platform specifically measures whether trust *survives being tested* — because per `TRUST_RECOVERY_PLAYBOOK.md`, a disclosed mistake handled honestly should make trust more durable, not less. Resilience Trust is tracked as a before/after comparison: Stated and Behavioral Trust in the two weeks before a graded-incorrect outcome or disclosed failure, versus the two weeks after. A resilience score that holds flat or rises after an honest disclosure is the clearest possible proof the platform's honesty commitment is real, not theoretical — and a resilience score that consistently falls after every disclosure is the clearest possible sign the disclosure isn't being handled the way `TRUST_RECOVERY_PLAYBOOK.md` requires, regardless of how good the underlying policy reads on paper.

---

## Calibrating the Trust Score Against Itself

A Trust Score that is never checked against a real outcome is exactly the kind of unearned number this platform's own epistemology forbids elsewhere. The model is only trustworthy once it has been checked, the same way a confidence score is checked: **does a rising Trust Score actually predict higher retention and more referrals, out of sample, not just in the period it was measured?** If a cohort's Trust Score rose but retention and referral did not follow within a reasonable window, the score's own methodology is treated as miscalibrated and is revised — through the same reviewed, attributed, never-silent process `EVIDENCE_QUALITY_MODEL.md` §5 requires for any other recalibration in this platform.

---

## What This Model Explicitly Refuses to Do

- It never reduces trust to a single number without its four components visible alongside it.
- It never treats a rising Stated Trust score as sufficient on its own if Behavioral Trust is declining in the same period.
- It never assumes its own formula is correct without checking it against real retention and referral outcomes.
- It never uses the Trust Score to justify relaxing any principle in `TRUST_RECOVERY_PLAYBOOK.md` or `PERSONALIZATION_PRINCIPLES.md` — the score exists to measure the effect of those commitments, never to argue for loosening them.

---

## Minimum Sample Discipline

At 25 beta users, every Trust Score component is read as an early, low-confidence signal, explicitly labeled as such — the same `EVIDENCE_QUALITY_MODEL.md` discipline that refuses to over-trust a thin sample applies here. The score becomes genuinely statistically meaningful only once enough users and enough graded-outcome cycles have accumulated to check it against real retention and referral behavior out of sample — realistically, not before the 500–1,000 user range described in `FIRST_1000_USERS_PLAN.md`. Before that point, the Trust Score is used to guide attention and prioritize investigation, never to declare a verdict on whether trust has been "achieved."
