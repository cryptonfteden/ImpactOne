# News Success Metrics

**Phase:** NEWS-EXPERIENCE-001
**Purpose:** Define how an intelligence news experience should be measured — expanding [NEWS_EXPERIENCE_GUIDE.md](NEWS_EXPERIENCE_GUIDE.md) §10's governing principle into concrete, checkable metrics. No metric here rewards showing the user *more* content, engagement, or time-on-page — every metric rewards being *right*, being *relevant*, and being *honest about uncertainty*, since those are the properties this whole guide exists to define.

---

## Why traditional news metrics are actively wrong for this product

Time-on-page, click-through rate, scroll depth, and daily-active-opens-of-the-feed are the standard metrics of a traditional financial news product, and every one of them rewards behavior this experience is explicitly designed *against*: a feed a user can trust to tell them only what matters should be quick to read, not sticky. A success metric that goes up when the user spends longer in the feed, or opens it more compulsively, is measuring the opposite of what this guide defines as success. None of the metrics below use engagement time or open frequency as a positive signal.

---

## Category 1 — Correctness (did the platform's beliefs turn out to be true)

- **Confidence calibration accuracy**: of all Claims issued at a given confidence level (e.g. "70-79% confidence"), the real-world outcome rate should land within that band over a large enough sample — this platform already has the scaffolding for this (Outcome grading, calibration reporting) and this metric is the news experience's specific application of it. A feed that is "80% confident" on everything and right 50% of the time has failed this metric regardless of how good it looks.
- **Directional accuracy by Attention tier**: high-Attention Claims should show measurably better real-world directional accuracy than low-Attention ones — if they don't, the Attention Score itself is not actually correlated with what matters, which is a deeper problem than any single wrong call.
- **Invalidation honesty rate**: of Claims that were later invalidated by contradicting evidence, the percentage that were disclosed as invalidated (status transition shown to the user) versus silently dropped or superseded with no visible trace — this should be as close to 100% as the underlying Claim lifecycle data allows.

## Category 2 — Relevance (did the platform show the right things to the right user)

- **Portfolio-relevance precision**: of items marked "directly affects a held position," the percentage that are verifiably correct against the user's real, current holdings at time of display — this must be effectively 100%; any confirmed false portfolio-relevance claim is a Blocking-tier failure per [IMPACTONE_RELEASE_CHECKLIST.md](../operations/IMPACTONE_RELEASE_CHECKLIST.md), not a metric to merely trend upward.
- **Attention-to-action correlation**: among items the user actually acted on (opened full reasoning, navigated to the affected position, adjusted a holding), what fraction were ranked in a top-of-feed / high-Attention position versus buried lower — a well-functioning prioritization system should show most real user action concentrated at the top, not scattered evenly regardless of rank.
- **Silence accuracy**: on days the feed reported nothing meeting the real attention threshold, a retrospective check for whether anything *should* have been surfaced and wasn't (a missed real event) — measuring false silence is just as important as measuring false alarms, since a system that hides genuinely important things by omission is a failure mode traditional engagement metrics would never catch.

## Category 3 — Honesty (did the platform accurately represent its own uncertainty and disagreement)

- **Confidence variance across items**: the real spread of confidence values issued per period — a healthy system shows meaningful variance driven by each item's actual evidence; a system whose confidence values cluster around one or two fixed numbers regardless of content is failing this metric even if every individual number happens to be "reasonable" in isolation (this exact clustering pattern has real historical precedent in this product and is the single most important honesty metric to track continuously).
- **Counter-evidence disclosure rate**: the percentage of Claims with genuinely known contradicting evidence that actually displayed it, versus omitted it — should be at or near 100%.
- **Contradiction surfacing rate**: when two real Claims about the same subject genuinely conflict, the percentage of cases where both were shown (rather than one suppressed or silently merged) — should be 100% by rule (Prioritization Rule 7), and this metric exists to catch any silent regression from that rule over time.

## Category 4 — Value (did being right and relevant translate into something useful for the user)

- **Decision-quality proxy**: among users who acted on a high-confidence, high-Attention, portfolio-relevant Claim, the real, later-graded outcome of that action (using the platform's existing Outcome grading, not a new mechanism) — this is the ultimate test of whether the whole pipeline (prioritization → explanation → confidence → user action) actually produces value, not just accurate-sounding content.
- **Unnecessary-attention rate**: the fraction of high-Attention items that, in retrospect, did not warrant the interruption they caused (low real-world materiality despite a high score) — a direct, measurable check against "crying wolf," tracked as a cost, not just correctness elsewhere as a benefit.
- **Time-to-understanding**: for a sampled set of real Claims, whether a user reviewing the explanation flow (Guide §3) can correctly state, in their own words, what the platform believes, why, and what would change it — a qualitative but essential check that the staged explanation flow is actually achieving comprehension, not just displaying information in a nicer order.

## Category 5 — Emotional design (did the experience feel calm and competent, not anxious)

- **Alarm-to-materiality ratio**: the proportion of visually "urgent" treatments (color, motion, top-of-feed placement) that correspond to genuinely high Attention + Confidence + Portfolio Relevance, versus urgent-looking treatments applied to lower-stakes items — should trend toward 1:1; any drift toward manufactured urgency is a direct violation of Guide §9.
- **Unprompted user sentiment** (from direct feedback channels already in this product, not a new survey instrument): whether users describe the news experience using words consistent with calm competence ("clear," "trustworthy," "efficient") versus words consistent with traditional financial-media anxiety ("overwhelming," "alarming," "too much") — tracked qualitatively, reviewed periodically, not gamed by prompting for a specific answer.

---

## What this metric set deliberately does not include, and why

- **No raw engagement metrics** (time on page, session length, opens per day) are included as positive success indicators anywhere in this document, for the reason stated at the top: this experience is designed to be trustworthy and efficient, not sticky, and optimizing for engagement would directly undermine that goal.
- **No single blended "quality score"** is defined here. Every metric above stays in its own category (Correctness / Relevance / Honesty / Value / Emotional design) deliberately, mirroring the Guide's own repeated rule that distinct concepts must never be collapsed into one number — a single composite "news quality index" would recreate, at the measurement layer, the exact conflation this whole guide exists to prevent at the product layer.
