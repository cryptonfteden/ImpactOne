# ImpactOne — Product DNA
## Vision, Principles, and Constitution

**Status:** This document defines what ImpactOne *is* and what it will never become. It does not describe current implementation state — see `PROJECT_STATUS.md`, `ARCHITECTURE.md`, and `INTELLIGENCE_PLATFORM_BLUEPRINT.md`/`FIVE_YEAR_ARCHITECTURE_ROADMAP.md` for that. This document describes what every future sprint, feature, and architectural decision must answer to. Where a future decision conflicts with a principle stated here, the principle wins — the code changes, not this document, and only after this document itself is deliberately amended.

**Terminology:** Every domain term this document's principles reference (Recommendation, Committee, DecisionTrace, Confidence, Uncertainty, and the rest) is defined exactly once in `CANONICAL_DOMAIN_MODEL.md`.

---

## Mission

Help an individual investor understand what is actually happening in the market, why it matters to *their* portfolio specifically, and what would prove that understanding wrong — so they can make their own decisions with real evidence instead of borrowed conviction.

ImpactOne does not tell people what to do with their money. It tells them, as clearly and honestly as the evidence allows, what it sees and how confident it genuinely is — and it shows its work.

---

## Vision

In five years, ImpactOne is not a wrapper around a language model that sounds confident. It is a platform with a real, defensible moat: a continuously growing corpus of evidence-backed recommendations, graded against what actually happened, that gets measurably better calibrated over time because it is honest about its own track record. The five engines and the Outcome Intelligence Engine described in `INTELLIGENCE_PLATFORM_BLUEPRINT.md` and `OUTCOME_INTELLIGENCE_ENGINE.md` are how that vision gets built — this document is why they are being built that way, and not some easier, shinier, less honest way.

---

## Product philosophy

- **Evidence over vibes.** Every claim traces to something — a filing, a price move, a documented score — never to "the model thinks so."
- **Reuse before rewrite.** New capability is built on top of what already works, not as a replacement for it, unless the existing thing is actually wrong. This engagement's own history (Sprint 16→17→18A→18B→19) is a working example of this discipline, not just a stated preference.
- **Deterministic and explainable before opaque and clever.** A rule-based system that can be audited beats a black-box model that can't, even when the black box scores marginally better on a benchmark nobody outside the company can see.
- **Small, tested, reversible steps.** Every sprint in this engagement's history shipped behind tests run before every commit, with flag-gated cutovers and documented rollback plans. That discipline is not incidental — it is the philosophy.
- **Say what you don't know.** A missing data source, a low-confidence score, an ungradeable outcome — all surfaced explicitly, never smoothed over or defaulted to something that looks cleaner than the truth.

---

## User journey

1. **Arrive** — a user opens ImpactOne wanting to understand a symbol, their portfolio, or what's happening in the market today.
2. **See the evidence, not just a verdict** — a recommendation, a committee debate, a daily brief item all show their sourcing and scoring before they show their conclusion.
3. **Challenge it** — every recommendation states what would prove it wrong (invalidation conditions), not just what would prove it right. The user is invited to disagree, not just to accept.
4. **Decide for themselves** — ImpactOne surfaces a suggestion and a position size; the user places the trade (today: paper; eventually, if it happens at all, real execution is a separate, explicitly-governed initiative — see "What ImpactOne will never become").
5. **See what happened** — over time, the Outcome Intelligence Engine shows whether that specific call was right, by how much, and how it compares to the platform's broader track record for similar calls.
6. **Trust grows from being right and honest, not from being persuasive.** A user who sees the platform admit a miscalibration and correct it (via a reviewed, git-committed recalibration, per `OUTCOME_INTELLIGENCE_ENGINE.md` §12) should trust it *more*, not less.

---

## Core principles

- **Advisory-only, structurally, not just by policy.** No engine in this platform gains the ability to place a real trade without an entirely separate, explicitly-scoped initiative and governance decision. This has been verified as a structural code invariant (no `placeOrder` import in any recommendation-generating path) since Sprint 16 and must remain literally, checkably true, not just documented.
- **One canonical verdict.** Two engines producing two disagreeing calls on the same decision is a trust failure, not a feature-richness win — this was true before Sprint 18A named and fixed it, and it stays true for every future engine that touches a decision.
- **Immutable audit trail.** A decision, once made, is never rewritten to look better in hindsight. `DecisionTrace` is create-and-read-only; a corrected methodology produces a new, versioned record, not an edited old one.
- **Contradiction is signal, not noise.** When evidence or expert opinion disagrees, that disagreement is shown, not averaged away for a cleaner UI.
- **Graceful degradation, always.** A missing API key, a down provider, a rate limit — none of these should ever produce a broken page. They produce an honest, labeled fallback.

---

## AI principles

- **AI explains and synthesizes; it does not replace evidence.** A model call's job is to make already-computed, real signals legible to a human — not to invent the signal itself from nothing.
- **The committee debates; it does not decide.** Multiple perspectives, real disagreement, and a synthesis narrative are valuable exactly because they are not collapsed into a single false certainty (Sprint 18A's core correction, permanent going forward).
- **Never claim certainty the system doesn't have.** Confidence, quality, and uncertainty scores are computed honestly, including when that means saying a call is a coin flip.
- **No single point of AI failure.** One provider's outage should degrade the product, never break it — and, per the platform's own roadmap, should eventually mean genuine multi-provider resilience, not just fallback text.
- **A model must be able to explain itself, or it doesn't ship.** This applies as much to a future proprietary, outcome-trained model as it does to today's OpenAI calls — sophistication is never an excuse for opacity.
- **Learning is earned from real outcomes, not assumed from prompt-engineering.** A scoring weight or credibility baseline changes because the Outcome Intelligence Engine's evidence says it should, backtested and reviewed — never because it "felt right."

---

## Investment principles

- **Advisory, not fiduciary — and honest about that distinction.** ImpactOne does not claim to give personalized financial advice it isn't licensed or built to give; it gives evidence, analysis, and a suggested action a user can accept, reject, or ignore.
- **Position sizing is a suggestion, never a mandate.** The user's own risk tolerance and situation govern the final decision, always.
- **Never optimize for trading frequency over user outcomes.** A recommendation exists because the evidence supports it, never because the product needs engagement. If the honest signal is "do nothing," the product says "do nothing."
- **Risk is disclosed, not buried.** Expected downside, risk labels, and concentration warnings get the same visual and structural weight as expected upside — never smaller, never later, never optional.
- **Complexity is introduced only when it earns its place.** No leverage, no derivatives, no exotic structures until the platform has demonstrated it can be trusted with the simple version first.

---

## Trust principles

- **Explainability by default, not by request.** Every recommendation ships with a structured explanation and a transparent, decomposed quality score — this is a product-trust commitment from Sprint 16 Phase D that outlives any specific implementation underneath it.
- **Show the track record, including the bad parts.** Once the Outcome Intelligence Engine is live, calibration and accuracy data are surfaced honestly — a platform that hides its own miss rate is not trustworthy, regardless of what its miss rate actually is.
- **No dark patterns.** No manufactured urgency, no engagement-optimized notification design, no confidence theater.
- **No undisclosed conflicts of interest.** A paid data-provider relationship, a sponsored source, a commercial partnership — none of it silently biases what gets shown or how it gets scored, ever.
- **Security and privacy are baseline, not aspirational.** User data, portfolio holdings, and API credentials are protected as a precondition of operating, not a feature to get to later — this document does not accept "we'll add auth eventually" as a permanent state, even though it correctly describes today.

---

## Learning principles

- **The platform grades itself against reality.** Every recommendation's real-world outcome is tracked across multiple time horizons — this is not optional instrumentation, it is the mechanism that makes every other claim about "trust" and "calibration" verifiable rather than asserted.
- **History is never rewritten.** A grading-methodology fix produces new, versioned outcome records; it never silently edits what the platform previously believed.
- **Recalibration is proposed, backtested, and reviewed — never silently applied.** A scoring constant changes via a normal, git-reviewed code change with a documented rationale and a passing backtest, not a live database toggle flipped by an automated process without a human in the loop, until the platform has earned the track record to justify loosening that gate.
- **Drift is surfaced, not hidden.** When the platform's calibration degrades, that is itself a finding to act on, not a metric to quietly stop reporting.
- **Attribution goes all the way down.** Which source, which committee member, which specific piece of evidence was right or wrong is knowable, not just "the recommendation was right or wrong" — because that is what actually lets the system get better, as opposed to just getting louder.

---

## Personalization principles

- **Relevance is earned from real context, not assumed.** A recommendation's relevance to a specific user is computed from their actual held positions and watchlist, not a generic popularity signal.
- **Personalization changes weighting, never truth.** A user's preferences can change how much emphasis a signal gets; they can never produce a different underlying verdict shown to different users as if it were a different reality — this is the same "one canonical verdict" principle from Core Principles, extended to the personalized case.
- **Preferences must be explicit, not inferred and hidden.** Risk tolerance, sector exclusions, and alert thresholds — once they exist as a real feature (currently a named gap; see `INTELLIGENCE_PLATFORM_REVIEW.md` §4's Personalization/Preference Engine) — are things the user sets and can see, not things silently guessed on their behalf.
- **Identity and tenancy are a hard prerequisite, not a nice-to-have.** Real personalization cannot be built correctly on a single-tenant assumption; this is named explicitly so it is never quietly worked around instead of properly solved.

---

## Long-term roadmap

This document states principles, not a timeline — the timeline lives in `FIVE_YEAR_ARCHITECTURE_ROADMAP.md` (100 → 1,000,000 users) and the six-engine platform architecture in `INTELLIGENCE_PLATFORM_BLUEPRINT.md` plus `OUTCOME_INTELLIGENCE_ENGINE.md`. In short: Research Intelligence → Knowledge Graph → Thesis Engine → Portfolio Intelligence → the existing Recommendation Engine/`DecisionTrace` synthesis layer → Outcome Intelligence closing the loop back into all of the above. Every one of those engines is required to comply with every principle in this document; none of them is a reason to relax one.

---

## What ImpactOne will never become

- **A brokerage or execution platform, without an entirely separate, explicit governance decision.** Not by accident, not by scope creep, not by "it would be a small addition." The advisory-only line is structural, and it stays structural.
- **An engagement-optimized trading app.** If maximizing time-in-app or trade frequency ever conflicts with a user's actual financial interest, the user's interest wins, every time, without exception.
- **A black box that happens to be right sometimes.** No recommendation ships without an explanation, regardless of how good the underlying model gets. Sophistication is never a substitute for transparency.
- **A platform that hides its own track record.** Bad calibration data does not get quietly deprioritized in the UI or left out of what gets built next.
- **A system with two conflicting verdicts for the same decision.** This was a real bug, it was fixed once at real cost, and it does not get reintroduced by a future engine that didn't get the memo.
- **A vehicle for undisclosed commercial bias.** No paid placement, no data-provider kickback, no sponsored signal that isn't labeled as exactly what it is.
- **A system that pretends certainty it doesn't have.** Confidence and uncertainty are reported honestly, even when honest means "we don't really know."
- **A silently self-modifying system.** Every constant that shapes a recommendation changes through a reviewable process with a name attached to the decision — never an opaque, automatic mutation with no audit trail.

---

## Success metrics

Primary — is the platform actually right, and does it know it:
- Calibration error (per `OUTCOME_INTELLIGENCE_ENGINE.md`'s `CalibrationBucket`) trending toward zero over time, per confidence bucket and per time window.
- The distribution of `gradeLabel` outcomes (`CORRECT`/`PARTIALLY_CORRECT`/`INCORRECT`) improving over successive recalibration cycles — a real, measurable claim, not a vibe.
- 100% of published recommendations carry a full explanation, quality-score breakdown, and immutable decision trace — zero exceptions, ever.
- Zero incidents, ever, of unauthorized or unintended trade execution.

Secondary — is the platform actually useful and trusted:
- User-reported understanding ("I know why this recommendation was made") and willingness to act on or explicitly reject a recommendation, rather than passively ignoring it.
- Retention and growth, read as a *lagging indicator* of the primary metrics above being true — never optimized for directly at the expense of them.

What is explicitly **not** a primary success metric: raw engagement time, notification click-through, or trade volume. A platform that is more addictive but no more accurate has failed by this document's definition, regardless of what its growth chart says.

---

## Product north star

**Every recommendation is explainable, challengeable, and — over time — provably calibrated against what actually happened.**

If a future decision cannot be checked against that sentence, it is not ready to ship, no matter how good it looks in a demo.
