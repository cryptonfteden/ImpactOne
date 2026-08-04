# ImpactOne — EVIDENCE_QUALITY_MODEL.md
## The Evidence Evaluation System

**Status:** A design document, not an implementation. It specifies how every piece of evidence ImpactOne ever collects — across every provider, every decade, every future engine — must be classified, scored, aged, and eventually re-scored against reality. It sits directly beneath `TRUTH.md` §2 ("What is evidence?") and operationalizes it: `TRUTH.md` states that evidence must answer *where did this come from, when was it true, how reliable is the source, what does it actually claim* — this document is the system that answers those four questions the same way, every time, for the life of the platform. Where this document conflicts with a faster or simpler scheme, this document wins, for the same reason `TRUTH.md` gives priority to itself over convenience.

This document contains no code, no schema, no formulas meant to be copy-pasted into an implementation. It is a specification of *behavior*, for a human or a future engine to build against. Time horizons here are deliberately long — this model is written to still be correct after ten, twenty, thirty years of accumulated evidence, not just for the next sprint.

**Terminology:** The six evidence classes below are mapped to `RESEARCH_ORGANIZATION.md`'s four source tiers in `CANONICAL_DOMAIN_MODEL.md` §1.2, which governs that mapping. Every other domain term is defined exactly once in `CANONICAL_DOMAIN_MODEL.md`.

---

## 1. Evidence Classes

Every piece of evidence ImpactOne ever collects belongs to exactly one of six classes at the moment it is ingested. Class is assigned from the nature of the source, never from whether its content is convenient — assigning class based on content would be the exact confirmation-bias failure `TRUTH.md` §10 forbids.

### 1.1 Primary evidence
The fact itself, from the party or instrument it directly concerns. A company's own SEC filing, a central bank's own rate decision, a court's own ruling, a government agency's own dataset, a directly observed price. Primary evidence is not an account of what happened — it *is* what happened, or the closest thing to it the platform can ever ingest. It can still be incomplete, delayed, or later restated, but it cannot be "wrong" in the way a report about it can be wrong.

### 1.2 Secondary evidence
A credible, accountable third party's report about a primary fact or about its own independent reporting — wire journalism (Reuters, Bloomberg), an analyst report, a regulator's public commentary on a filing it did not itself produce. Secondary evidence is an *account*, subject to the reporting party's own process, editorial standards, and error rate. It is the backbone of the platform's day-to-day feed, and it is never treated as equivalent to primary evidence, no matter how reputable the outlet.

### 1.3 Crowd evidence
Aggregated, low-individual-authority signal from many independent participants — prediction-market pricing (Polymarket), broad social sentiment volume (Reddit, X aggregated, not a single post), trading volume anomalies. Crowd evidence is not any one person's claim; its value comes entirely from aggregation across independent actors with real or informational stakes. A single voice inside a crowd signal is not evidence on its own — the *distribution* is the evidence.

### 1.4 Speculation
An identified individual or party's stated opinion, forecast, or interpretation, disclosed as such — an analyst's price target, a single social post's take, a pundit's prediction. Speculation may be well-reasoned and may come from a credible party, but it is a claim about the future or about interpretation, not a claim about a fact that has already occurred. It is never conflated with reporting, even when it appears inside the same article as reporting.

### 1.5 Rumor
An unattributed, unconfirmed, or anonymously sourced claim about something that may or may not have happened — "sources say," an unverified leak, an anonymous account with no track record. Rumor is the class the platform is most tempted to treat as a scoop and must instead treat as its most heavily discounted, most explicitly labeled category. Rumor is included in the corpus — excluding it entirely would itself be a form of information suppression — but it is never allowed to anchor a belief on its own.

### 1.6 Unknown
Evidence that cannot yet be classified — a new provider type not yet mapped to a class, a source with no established identity or track record, or content whose provenance genuinely cannot be determined at ingestion time. Unknown is not a failure state to be hidden; it is an honest, temporary label. Evidence never silently defaults into a more favorable class than it has earned. It stays Unknown, discounted accordingly, until it earns reclassification through the mechanisms in §3.

---

## 2. The Ten Dimensions, Per Class

Every piece of evidence, regardless of class, is evaluated on the same ten dimensions. What differs by class is not which dimensions apply, but their starting weight, their ceiling, and how quickly they move.

### 2.1 Reliability
*How likely is this claim, on its own, to be an accurate account of reality?*

| Class | Starting reliability posture |
|---|---|
| Primary | Highest attainable ceiling — the source and the fact are the same thing. Reliability concerns shift from "is this true" to "is this complete/final" (a preliminary filing later amended). |
| Secondary | High, bounded by the reporting party's own process and correction rate — reliability is inherited, not assumed, and is capped below primary regardless of outlet prestige. |
| Crowd | Moderate, and dependent entirely on sample size and independence of the contributing signals — a thin or coordinated crowd is not reliable crowd evidence, it is manipulated crowd evidence (see §2.9). |
| Speculation | Low-to-moderate, scaled by the speculator's own demonstrated track record (see §2.6), never by their confidence of tone. |
| Rumor | Low by default, regardless of plausibility. Plausibility is not reliability. |
| Unknown | Floor reliability until classified — treated as the least reliable non-rumor class by default, since an unverifiable source is strictly worse than a verifiable weak one. |

### 2.2 Freshness
*How recent is this claim relative to when it would matter?*

Freshness is measured from the event's own timestamp, not from ingestion time (a rumor ingested today about something six months old is not "fresh"). All classes decay — see §3 — but the *shape* of decay differs: Primary evidence decays slowly (a filing is still the filing a year later); Crowd evidence decays fastest (a prediction-market price from last week says almost nothing about this week's).

### 2.3 Decay
*How does this evidence's relevance fall off over time, distinct from freshness itself?*

Decay is the *rate function*, freshness is the *current reading*. Every class has its own decay curve (detailed in §4). Decay is never uniform across classes and must never be implemented as a single global half-life — that would silently misprice every class except the one it was tuned for.

### 2.4 Cross-confirmation
*Has this claim been independently corroborated by evidence of a different class or a different, unrelated source?*

Cross-confirmation is the single strongest quality multiplier in this model, and the only one capable of moving evidence upward across class boundaries in practical effect (a rumor confirmed by a subsequent primary filing is still labeled Rumor at its origin, but the *belief* it supported is now backed by primary evidence, and that is what should be tracked — see §6). Confirmation only counts when the corroborating source is genuinely independent — two outlets both re-reporting the same wire story is one piece of secondary evidence with an echo, not two.

### 2.5 Conflict handling
*What happens when this evidence disagrees with other evidence about the same claim?*

Per `TRUTH.md` §6, conflict is never averaged away. Each class carries its own conflict posture:
- **Primary vs. Primary** (e.g., two regulators' data disagreeing) is the rarest and most serious conflict — both are preserved, both are shown, and the conflict itself becomes a tracked fact.
- **Secondary vs. Secondary** is common and expected; it is resolved by comparing source reputation and cross-confirmation, never by which arrived first or which is more recent unless recency is the actual substance of the disagreement (an update, not a contradiction).
- **Crowd vs. Secondary/Primary** disagreement (the market pricing something the reporting doesn't yet reflect, or vice versa) is not a conflict to resolve at all — it is itself a signal, often the most interesting one, and must be surfaced as such, not suppressed into a single number.
- **Speculation/Rumor vs. anything higher-class** never wins a conflict by default. It may motivate further investigation; it may never override.

### 2.6 Historical accuracy
*How often has this specific source been right in the past, measured, not assumed?*

Every source (an outlet, a filer, a named analyst, a specific prediction-market) accumulates a real, graded track record over time, fed by the Outcome Engine (§7) and World Memory's evidence-linking. A source's historical accuracy is a *belief about the source*, held with its own confidence, and is itself subject to revision under the same rules as any other belief. A source with ten years of accuracy is trusted more than one with ten days, at equal apparent quality — track record length is itself part of the score, not just its average.

### 2.7 Source reputation
*What is this source's standing, independent of any single claim?*

Reputation is the slow-moving prior; historical accuracy (§2.6) is the fast-moving, evidence-driven correction to it. A source's reputation should converge toward its measured historical accuracy over a long enough window — and must never be allowed to permanently diverge from it. A famous name with a poor measured track record is downgraded regardless of fame; an obscure source with a long, clean measured track record is upgraded regardless of obscurity. Fame and reputation are not the same variable, and this model refuses to conflate them.

### 2.8 Bias adjustment
*Does this source have a structural incentive to report a particular way, independent of accuracy?*

Every source is evaluated for known structural incentives — a company's own filing has an incentive to present itself favorably (still primary evidence, but management commentary within it is speculation, not primary, and must be separated at the sentence level, not the document level); a sell-side analyst has an incentive tied to their firm's business relationships; a social account may have an undisclosed financial position. Bias adjustment does not discard biased evidence — almost all evidence has *some* structural bias — it discounts the specific dimensions the bias would distort while leaving the rest of the evidence's value intact. A biased source's account of a fact it has no incentive to misstate is still useful; the same source's interpretation of that fact is discounted accordingly.

### 2.9 Manipulation resistance
*How hard would it be for a bad actor to fabricate or coordinate this specific piece of evidence?*

This is the dimension most classes are weakest on and must be evaluated the most conservatively:
- Primary evidence from a regulated filer is the hardest class to fabricate (legal consequence) and the easiest to verify independently.
- Crowd evidence is the *most* vulnerable to coordinated manipulation (a small, coordinated group can move a thin prediction market or manufacture social volume) and must always be weighted by real diversity of participation, not raw volume.
- Rumor is trivially fabricable and must always be treated as such by default, regardless of how specific or plausible it sounds — specificity is not evidence of authenticity.

Manipulation resistance is re-evaluated whenever a source or evidence type is later confirmed to have been manipulated (a since-exposed pump scheme, a bot-driven sentiment spike) — and that finding propagates backward, as a new, dated finding (per `TRUTH.md` §9, never as a silent retroactive rewrite of the original evidence record).

### 2.10 Missing-data handling
*What does the platform do when a dimension above genuinely cannot be computed?*

Per `TRUTH.md` §7 and §8: a missing dimension is never defaulted to a favorable value, never silently dropped from the aggregate, and never hidden from what's shown. A missing dimension is recorded as missing, contributes a documented neutral-or-penalized fallback (never an optimistic one), and the overall evidence-quality output is itself labeled as partially unknown rather than presented with the same confidence as a fully-scored piece of evidence. Absence of a score is not itself evidence of anything, and must never be quietly interpreted as such.

---

## 3. Reclassification

Evidence class is assigned at ingestion but is not eternally fixed to that label in how the *belief* it supports is treated — only in how the *original record* is described. Two honest mechanisms:

1. **Corroboration promotes the belief, not the record.** A Rumor that is later confirmed by Primary evidence does not retroactively become "Primary" in the historical log (that would violate `TRUTH.md` §9's immutability principle) — the original Rumor record stays exactly as it was, labeled Rumor, timestamped as it occurred. What changes is the *belief* it once weakly supported, which now inherits the quality of the new, corroborating Primary evidence. The record of what was known, and when, is preserved exactly.
2. **Unknown resolves forward only.** Evidence sitting in the Unknown class is reclassified only when its actual provenance becomes knowable (a provider's source type is properly mapped, an anonymous source is later identified) — never guessed into a more favorable class to reduce administrative untidiness.

---

## 4. How Evidence Quality Changes Over Time

Quality is not a single score frozen at ingestion. It is a function of time, and the function differs by class — this is the section written explicitly to hold up across decades, not sprints.

- **Primary evidence** decays slowly in freshness but never decays in reliability — a ten-year-old 10-K is still exactly as reliable an account of what the company reported that year as it was the day it was filed. What decays is *relevance* to current decisions, not trustworthiness of the historical fact.
- **Secondary evidence** decays on both freshness and, over long enough horizons, on reliability itself — an outlet's editorial standards, ownership, and process can and do change over years; a source's reliability at year twenty must be re-earned against its own recent track record, not grandfathered in from its reputation at year one.
- **Crowd evidence** decays fastest and almost completely — a prediction-market price or sentiment reading from months ago is close to irrelevant to a current decision, because the thing it measured (aggregated present belief) has, by construction, already moved on. Crowd evidence's historical value is not in its freshness but in what it reveals, after the fact, about how accurately aggregated belief predicted real outcomes over time (a long-run calibration question, not a short-run signal question).
- **Speculation** decays with the forecast horizon it targeted — a one-quarter price target has fully decayed by the following quarter regardless of whether it was right; its *lasting* value is entirely in what it contributes to the speculator's long-run historical-accuracy record (§2.6), not in the specific number itself remaining live.
- **Rumor** decays almost immediately in its own right unless corroborated (§3) — an unconfirmed rumor that stays unconfirmed for a meaningful period should decay toward irrelevance, not persist as an open, unresolved shadow influence on a belief indefinitely.
- **Unknown** carries no default decay assumption at all — it is discounted flatly until classified, because assuming a decay curve for a source whose nature isn't even known yet would itself be an unearned assumption.

Over a multi-decade horizon, the platform should expect entire source *types* to rise and fall in aggregate reliability as media, regulatory, and social landscapes shift — this model deliberately scores sources and evidence, not fixed institutions, so that a historically excellent outlet that degrades over a decade is downgraded on its own measured merits, and a new, currently-unproven source type is not permanently locked out of eventually earning a strong track record.

---

## 5. How Confidence Is Recalculated

Confidence (`TRUTH.md` §4) attached to any belief, thesis, or recommendation is never a static number assigned once and left alone. It is recalculated whenever any of the following occurs, and only then — recalculation on a fixed timer with no new information would itself be a form of manufactured precision:

1. **New evidence arrives** that bears on the belief — the new evidence's own quality score (per the ten dimensions above) determines how much it is allowed to move confidence. Rumor-class evidence, even in volume, may move confidence only slightly; corroborated Primary evidence may move it substantially.
2. **A conflict resolves or deepens** — new corroboration for one side of a prior disagreement raises confidence; new corroboration for the *other* side lowers it, symmetrically, with no asymmetric bias toward whichever side the platform had already leaned.
3. **A source's historical accuracy is updated** by the Outcome Engine — every belief still resting on evidence from that source is subject to reweighting, not just newly ingested evidence going forward. A source that is later shown to have been unreliable during a specific historical period should lower confidence in beliefs that leaned on it during that period, applied as a new, dated adjustment, never as a silent rewrite of the original confidence value that was honestly held at the time (`TRUTH.md` §9 again: the historical confidence figure stays exactly as it was recorded; a new figure is appended).
4. **A stated invalidation condition is checked and either triggers or is explicitly confirmed not to have triggered** — the latter is itself a (mild) confidence-supporting event, since the belief survived a real test.
5. **Evidence decays past a materiality threshold** for its class (§4) — confidence in a belief resting predominantly on now-stale evidence should fall over time even with no new contradicting information, since the *absence* of fresh confirmation for a time-sensitive claim is itself informative.

Recalculation always moves toward the evidence, never toward a target the platform would prefer to reach. A recalculation that happens to always land near where confidence already was is not evidence the model is well-calibrated — it may be evidence the recalculation isn't actually sensitive to new evidence, and that possibility must itself be checked periodically against real outcomes (§7).

---

## 6. How Evidence Affects Beliefs, Theses, Recommendations, and the Outcome Engine

Evidence never affects these four things directly and uniformly — it affects each one through a different mechanism, appropriate to what each one actually is.

### 6.1 Beliefs
A belief is the most granular unit — a single claim about a single thing, held with a confidence and an uncertainty. Evidence affects a belief directly and continuously: every new piece of evidence bearing on a belief is a candidate input to the recalculation in §5. A belief's entire audit trail — every piece of evidence that ever moved it, in which direction, by how much — must remain reconstructable indefinitely. This is the natural shape of a `WorldMemoryStateChange` row: a before/after ledger entry, dated, attributed to the evidence and methodology that produced it, never overwritten.

### 6.2 Theses
A thesis is a belief about a broader, longer-running narrative (a sector, a theme, a structural trend) rather than a single discrete claim, and it changes more slowly and more deliberately than a single belief — a thesis should not swing on a single day's evidence the way a narrow belief about one filing might. A thesis is revised only when the accumulated weight of new evidence, across time and across independent sources, crosses a real threshold — and every revision is a new, dated, fully-reasoned record that preserves exactly what the thesis said before and why it changed, never a live-edited document that erases its own history. This is the natural shape of a thesis-revision record: an append-only sequence, each entry pointing to what triggered it, none of them ever deleted or silently altered.

### 6.3 Recommendations
A recommendation is a decision built on top of one or more beliefs and, where relevant, a thesis, combined with portfolio-specific context. Evidence affects a recommendation only *through* the beliefs and thesis it rests on — a recommendation is never allowed to weigh a raw piece of evidence directly, bypassing the belief layer, because that would mean two recommendations resting on the "same" evidence could end up justified by inconsistent reasoning. Every recommendation must be able to show its full chain: this evidence, supporting this belief, contributing to this thesis (where applicable), producing this action at this confidence — the exact chain `TRUTH.md` §12 requires a recommendation to justify itself with, made mechanically traceable rather than merely asserted.

### 6.4 The Outcome Engine
The Outcome Engine is the one place evidence quality itself gets checked against reality, closing the loop the rest of this model depends on. It does not evaluate evidence quality directly — it evaluates whether beliefs and recommendations built on a given quality of evidence actually turned out to be right, at what rate, and it feeds that finding back into §2.6 (historical accuracy) and, over a longer horizon, §2.7 (source reputation). This is the mechanism that keeps the entire quality model honest over decades: a scoring assumption in this document that turns out not to predict real outcomes is itself a finding the Outcome Engine should surface (per `TRUTH.md` §14, this document is included in what must always be challenged) — and any correction to the model itself follows the same reviewed, dated, non-silent process every other correction in this platform requires.

---

## Mandatory reading

This document is mandatory reading alongside `TRUTH.md` for every future subsystem that ingests, scores, or reasons over evidence — every provider, every AI Analyst, the Research Intelligence Engine, the Knowledge Graph, the Thesis Engine, Portfolio Intelligence, the Recommendation Engine, the Outcome Intelligence Engine, and World Memory. A subsystem that assigns evidence quality by any scheme other than the one described here is not compliant, regardless of how accurate its outputs happen to look in the short run — short-run accuracy achieved by an unprincipled scoring scheme is exactly the kind of result this model exists to distinguish from the real thing.
