# News Prioritization Rules

**Phase:** NEWS-EXPERIENCE-001
**Purpose:** The operational rulebook a future implementation should follow to actually rank, surface, and suppress items in an intelligence news experience — the practical companion to [NEWS_EXPERIENCE_GUIDE.md](NEWS_EXPERIENCE_GUIDE.md)'s philosophy. This document defines rules, not code — no implementation is included or implied to exist yet.

---

## Rule 1 — Rank by Claim, never by article

Every real-world event that produces multiple source articles collapses into exactly one Claim before it enters the prioritization system. Prioritization rules below operate on Claims, never on raw articles — an event covered by ten wire stories must never occupy ten ranked slots.

## Rule 2 — Three independent inputs, never one blended score

A Claim's position in the feed is determined by three separately-computed values, each carried forward untouched into the presentation layer (never averaged, weighted-summed, or otherwise collapsed into a single opaque number before display):

1. **Attention Score** — the platform's existing dedicated prioritization signal.
2. **Portfolio Relevance tier** — Directly Affects Held Position / Affects Held Exposure / No Relevance (see Guide §4).
3. **Confidence** (and Probability, where a real statistical estimate exists) — how sure the platform is, independent of how much it matters.

A ranking algorithm may use all three as inputs to decide *order*, but the user-facing presentation must always show all three independently — the internal ranking logic is allowed to combine them; the display is not.

## Rule 3 — Portfolio-relevant, high-Attention items always outrank everything else

Within the three-input model, the following strict precedence governs the top of the feed:

1. Directly-held-position + High Attention + any Confidence level (including a thin-evidence, low-confidence early claim — a user should see an emerging risk to something they hold even before the platform is sure of it, clearly labeled as low-confidence).
2. Directly-held-position + Medium/Low Attention.
3. Held-exposure (theme/sector, no specific symbol) + High Attention.
4. Everything else, ranked by Attention Score alone.

No item without at least Medium Attention and some Portfolio Relevance may occupy a "top of feed" / interrupting position, regardless of how novel or large the underlying event is in the broader market.

## Rule 4 — One Claim, one attention signal, ever

A Claim may update (new evidence arrives, confidence shifts, status transitions) without generating a second, separate attention-worthy notification for the same underlying belief. An update to an existing Claim is surfaced as a visible change to that Claim (see Guide §7's transition-disclosure rule), not as a brand-new competing feed item.

## Rule 5 — Time relevance gates ranking, recency does not

An item's position is never boosted purely because it is recent. Instead:
- An item with a real, near-term urgency window (an earnings date, an expiring position, a scheduled macro event) is boosted specifically because that window is closing, and the boost decays once the window passes — not because the story is new.
- An item with no real urgency window and no change in Freshness is treated as background context regardless of age, and does not compete for a top-of-feed slot no matter how recently it was ingested.
- Freshness (how current the underlying evidence is) and Urgency (why it matters now) are tracked and can be surfaced separately; neither substitutes for the other.

## Rule 6 — A real threshold, not a fixed quota, decides what interrupts the user

The feed does not manufacture a "top story" to fill space on a quiet day. If nothing crosses the real Attention + Portfolio Relevance threshold defined in Rule 3, the top-of-feed position is empty and says so honestly (per the platform's existing empty-state doctrine), rather than promoting the least-unqualified remaining item to look equivalent to a real top story.

## Rule 7 — Contradiction is surfaced, never resolved by suppression

When two real, independently evidence-backed Claims about the same subject genuinely disagree, both remain in the ranking system on their own merits (their own Attention/Relevance/Confidence values) — neither is suppressed to "avoid confusing the user," and neither is silently merged into a single averaged verdict. The user encountering both is a correct outcome, not a defect to be engineered away.

## Rule 8 — Read/dismissed items step back, they don't disappear or reappear

Once a user has engaged with an item (read its full explanation, or explicitly dismissed it), its future re-ranking must reflect that — it should not continue occupying high-attention positions for content the user has already seen, but it also must not vanish entirely if the underlying Claim later meaningfully changes (a dismissed claim that later gets invalidated or sharply strengthens should be able to re-surface, because that is new information, not a repeat).

## Rule 9 — Evidence class weights the Confidence computation, but is always shown, never hidden inside it

Each piece of evidence backing a Claim carries its own evidence-class weight (the platform's existing Primary/Secondary/Crowd/Speculation/Rumor spectrum). That weighting is allowed to influence the Claim's computed Confidence, but the evidence list itself — with each item's class visible — must always be inspectable by the user, never compressed into "Confidence: 72" with no way to see what kind of evidence produced that number.

## Rule 10 — No fallback content is ever presented as if it were a ranked, evidence-backed item

If a real data source is unavailable, the honest response is an explicit, disclosed gap (per this platform's existing Demo Mode / honest-unavailability discipline) — never a lower-confidence, generic, or templated item quietly inserted into the ranked feed in its place. A feed position is either backed by a real Claim with real evidence, or it does not exist that cycle.

---

## What these rules are designed to prevent

These rules are written the way they are because this exact product has, at various points in its history, exhibited every failure mode they close off: confidence values clustering into 2-3 fixed numbers correlated with a category label rather than computed per item; the same explanation template applied verbatim across unrelated events; a specific, false claim about the user's own portfolio holdings; and unrelated "top stories" manufactured to fill a quiet day. This rulebook exists so a future implementation of the news experience is built against a standard that already accounts for these known failure patterns, rather than rediscovering them one audit at a time.
