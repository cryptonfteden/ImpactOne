# News Experience Guide

**Phase:** NEWS-EXPERIENCE-001
**Purpose:** Define what makes an intelligence news experience fundamentally different from a traditional financial news feed — as a standing definition future implementation phases build against, not a review of any existing screen. This document defines *what should be true*; it does not redesign or critique any specific screen, and deliberately uses this platform's own already-established vocabulary (Confidence, Probability, Attention Score, Claim, evidence classes) rather than inventing a new one, since a prior audit this engagement ran ([PRODUCT_CONSISTENCY_REPORT.md](../archive/audits/PRODUCT_CONSISTENCY_REPORT.md)) found real cost in screens that each invent their own words for the same underlying concept.

**The one-sentence difference:** a traditional financial news feed shows you *what happened*, ranked by how recently it happened or how loudly it was reported. An intelligence news experience shows you *what the platform believes, how sure it is, why, and what would change its mind* — ranked by how much it actually affects you, specifically, right now.

---

## 1. Information hierarchy

A traditional feed's hierarchy is chronological or engagement-driven: newest first, or whatever generates the most clicks. Both are dishonest proxies for what actually matters to a specific reader.

An intelligence news experience's hierarchy is **claim-first, not article-first**. The unit the user reads is never "an article happened" — it is "the platform holds a belief, here is the evidence, here is how sure it is, here is what would prove it wrong." A single real-world event may produce one Claim or update several; a wire full of ten articles about the same earnings call should collapse to one Claim with a growing evidence list, never ten competing feed items saying almost the same thing. Hierarchy within a single Claim follows the same rule already established for Recommendation Cards elsewhere in this product: plain-language statement first, key metric (Confidence/Probability/Attention Score, each explicit about which it is) second, full evidence and counter-evidence held behind an explicit expansion — never all three visible at once, competing for the same glance.

## 2. Event prioritization

A traditional feed prioritizes by publish time or a single opaque "importance" score that all inputs get flattened into. Prioritization here is **decomposed into the platform's own already-real, separately-computed dials**, never a single re-invented number:

- **Attention Score** (already a real, dedicated engine elsewhere in this platform) — the honest answer to "how much should this interrupt the user's day," a prioritization signal, not a verdict.
- **Portfolio Relevance** (see §4) — does this touch something the user actually holds or watches.
- **Confidence** and, where a real statistical estimate exists, **Probability** — two independently-computed numbers, never collapsed into one.

An event with high Attention but no Portfolio Relevance (a macro story with no bearing on this user's holdings) and an event with high Portfolio Relevance but currently low Confidence (an early, thin-evidence claim about a held position) are both legitimately "important" — for different reasons that must stay visibly different, never merged into one ranking number that hides which reason applies.

## 3. AI explanation flow

A traditional feed either explains nothing (a headline and a snippet) or explains everything at once (a wall of "why this matters" text no one reads in full). The explanation flow here is **staged, in a fixed order, matching this platform's own established "explain before detail" discipline**:

1. **Plain-language statement** — one sentence, no jargon, the same three-part empty-state honesty standard (why / what's missing / what's next) applied here to presence, not absence: what does the platform believe, and about what.
2. **Why now** — what changed, specifically, to cause this Claim to form or update today, not a generic template restating the headline.
3. **Confidence and/or Probability**, explicitly labeled as to which.
4. **Evidence** — the real, named sources backing the claim, each carrying its own evidence-class weight (an established Primary/Secondary/Crowd/Speculation/Rumor spectrum elsewhere in this platform), never presented as uniformly authoritative.
5. **Counter-evidence**, when it exists — shown as a real, first-class citizen of the explanation, not buried or omitted. A claim with no counter-evidence honestly says so; a claim that omits known contradicting evidence is a trust failure, not a simplification.
6. **What would change this** — the invalidation condition, always present, always specific.

Nothing in this flow is ever skipped by fabricating a step — a Claim with genuinely no counter-evidence yet says exactly that, rather than either omitting the section or inventing a token contrary sentence to look balanced.

## 4. Portfolio relevance

A traditional feed either ignores the user's portfolio entirely or bolts on a generic "this affects your holdings" line that is often wrong. Portfolio relevance here must be **computed from the user's actual, current positions, every time, with zero tolerance for a stale or fabricated claim about what the user holds** — this is a Blocking-tier requirement (already codified in [IMPACTONE_RELEASE_CHECKLIST.md](../operations/IMPACTONE_RELEASE_CHECKLIST.md)'s Information Integrity section) precisely because this exact failure mode has real, historical precedent in this product: a feed item asserting portfolio overlap with symbols an account does not actually hold.

Relevance is presented in three honest tiers, never flattened to a single "affects you: yes/no" boolean:

- **Directly affects a held position** — named specifically (the symbol, the position size or weight), never a vague "this may be relevant to your portfolio."
- **Affects a theme or sector the user holds exposure to**, without naming a specific held symbol — labeled as such, not upgraded to sound like a direct hit.
- **No portfolio relevance** — stated plainly, not hidden. A user should be able to trust that "no portfolio relevance" genuinely means the platform checked and found none, not that it didn't check.

## 5. Time relevance

A traditional feed's only time signal is "how long ago was this published." That is a poor proxy for "how long does this matter." Time relevance here has two, separately-tracked dimensions:

- **Freshness** — how recently the underlying evidence was observed (already a real, distinct concept elsewhere in this platform, deliberately separate from confidence — a stale-but-still-true observation is not the same failure as a false one).
- **Urgency window** — a real, named horizon for why this matters *now* specifically: an earnings date, an expiring options position, a scheduled macro event, a claim's own real invalidation deadline. An item with no real urgency window is honestly presented as background context, not force-ranked to the top by recency alone.

A story from three days ago about a still-open, still-relevant thesis should outrank a five-minute-old story with no real bearing on anything the user holds — time relevance is about *duration of relevance*, not recency of publication.

## 6. Confidence presentation

A traditional feed has no concept of confidence at all — every headline is presented with equal, implicit authority. This platform's standing discipline (established well before this phase, and directly relevant here) is that **Confidence, Probability, and Attention are three distinct dials, never conflated, each with its own explicit label** — a rule this engagement has had to re-enforce more than once when a shared visual instrument slipped back into treating them as interchangeable.

For news specifically, confidence presentation must additionally:
- Show real variance. If every item in a feed clusters around the same one or two confidence values regardless of how different the underlying stories are, that is not confidence — it is decoration, and it must be treated as a defect with the same severity as a factual error, not a cosmetic one.
- Never assign a confidence value that isn't backed by real evidence-based computation for that specific item — a fixed value keyed off a category or sentiment label (rather than computed from the item's own actual evidence) is exactly the failure mode this guide exists to prevent.
- Be legible at a glance (one instrument, one color language, per the platform's existing scoring-primitive standard) but always inspectable in full — a user can always ask "why this number," and the answer must be a real, evidence-based explanation, not silence.

## 7. Contradictory evidence handling

A traditional feed does not handle contradiction at all — if two articles disagree, both simply appear, unreconciled, and the reader is left to sort it out. An intelligence news experience treats contradiction as **first-class information, not noise to be hidden or a single "confidence" number to quietly average away**.

Concretely:
- Every Claim honestly discloses its counter-evidence, if any exists, in the same explanation flow as its supporting evidence (§3) — never a separate, harder-to-find, or omitted section.
- When two real Claims about the same underlying subject genuinely conflict (e.g., one bullish, one bearish, both evidence-backed), both are shown, with their independent confidence levels, rather than silently resolved into one averaged or arbitrarily-chosen verdict. The user is told plainly that the platform's own evidence is mixed — this is a more honest and more valuable signal than false certainty.
- A Claim whose status changes because new evidence contradicted its prior thesis is disclosed as a real, visible transition (using the platform's existing plain-language lifecycle labels — "Getting more likely," "Getting less likely," "No longer holds up") — never silently replaced or deleted, since a user who saw the original claim deserves to see that it changed and why.

## 8. User attention rules

A traditional feed asks for attention indiscriminately — every item looks equally urgent, because volume and engagement are the business model. An intelligence news experience earns attention deliberately, following the Design Bible's own standing principle that "the interface never asks for attention it hasn't earned":

- An item only interrupts (a badge, a notification, a top-of-feed position) if its Attention Score, computed honestly from real portfolio relevance and real urgency, crosses a real threshold — never because it is new, sensational, or from a prominent source.
- The same underlying event should never generate multiple, separately-attention-worthy items — one real Claim, one attention signal, regardless of how many source articles fed into it.
- A user who dismisses or reads an item should see that acknowledged (it should not keep re-surfacing as if unread) — attention, once paid, is respected, not re-demanded.
- Silence is a valid, honest state. A day with nothing meeting the real threshold should say so plainly (per the platform's existing empty-state doctrine — why, what's missing, what's next) rather than manufacturing a "top story" to fill the space.

## 9. Emotional design

A traditional financial news feed is often deliberately anxiety-inducing — urgent red, alarming language, a sense that something is always happening and the reader is always behind. An intelligence news experience's emotional register is **calm competence, not urgency theater**. Concretely:

- Color carries real semantic meaning only (per the platform's established semantic-hue discipline) — never used to manufacture excitement or alarm beyond what the actual evidence supports. A Moderate-confidence claim should not be dressed in the same visual urgency as a genuine, high-Attention, high-confidence risk.
- Motion is restrained and purposeful (a claim strengthening earns a small, real, deliberate visual cue — never a constant stream of animated "breaking" badges designed to keep the reader's adrenaline up).
- The tone of every explanation is plain and even-handed, whether the news is good or bad for the user's position — the platform's job is to inform a decision, not to produce a reaction.
- The product should feel, at every touch, like a competent analyst who has already done the reading and is telling the user only what they need to know — not like a news ticker trying to hold their attention.

## 10. Success metrics

A traditional feed measures itself by engagement: time on page, click-through rate, scroll depth — metrics that reward volume and sensationalism, not accuracy or usefulness. An intelligence news experience must be measured by whether it was **right, and whether being right, translated into value for the user** — see [NEWS_SUCCESS_METRICS.md](NEWS_SUCCESS_METRICS.md) for the full, concrete metric set; the governing principle is stated here: no metric in this experience should reward showing the user *more*, only showing them *what was true and mattered*, and being provably right about it over time.

---

See [NEWS_PRIORITIZATION_RULES.md](NEWS_PRIORITIZATION_RULES.md) for the operational rulebook (how items are actually ranked, surfaced, and suppressed) and [NEWS_SUCCESS_METRICS.md](NEWS_SUCCESS_METRICS.md) for how this experience should be measured once built.
