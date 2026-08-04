# Personalization Principles
## Office of the Chief Learning Officer — ImpactOne

**Mandate:** Define, precisely and without exception, what may be personalized and what must never be. The entire model is one sentence: **facts remain universal; relevance becomes personal.** Every rule below is a specific application of that sentence, not a separate idea.

---

## The One-Sentence Test

Before personalizing anything, ask: *does this change what is true, or does it change what is shown, in what order, and in what words?* If the answer touches what is true, it is forbidden. If the answer only touches what is shown, how it's ranked, or how it's explained, it is allowed — and often required, because a product that shows the same undifferentiated content to everyone isn't personalizing at all, it's just failing to be relevant.

---

## What May Be Personalized

| Dimension | What personalization is allowed to do |
|---|---|
| **Ordering and ranking** | Which real, honestly-scored items appear first in a feed, based on genuine relevance to this user's actual holdings, watchlist, and stated interests |
| **Tone and vocabulary depth** | Whether a concept is explained in plain, beginner-friendly language or in denser, more technical language, based on demonstrated understanding (`MOBILE_PRODUCT_MASTERPLAN.md` §9) |
| **Position sizing suggestions** | The suggested size of a position, because sizing is inherently a function of this specific user's stated risk tolerance and actual portfolio context — a suggestion, never a mandate, and always clearly distinguished from the underlying thesis about the security itself |
| **Notification cadence and timing** | When and how often a user is notified, based on their own preferences and observed engagement, always with a visible, one-tap override |
| **Educational pacing** | Which explanations appear inline and which have already faded because this specific user has demonstrated understanding |
| **Emphasis and framing of genuinely relevant content** | Highlighting that a piece of evidence is directly relevant to this user's specific holdings — never inventing relevance that isn't real |
| **Language and accessibility settings** | Translation, dynamic type, screen-reader behavior, and alternate complexity modes |

---

## What Must Never Be Personalized

| Dimension | Why it is universal |
|---|---|
| **The underlying fact or event itself** | A filing, a price move, a rate decision happened the same way for every user; personalization never alters what actually occurred |
| **Confidence and uncertainty scores** | These measure the objective strength and agreement of the evidence itself — they describe the world, not the reader, and must be identical for every user looking at the same claim |
| **Source credibility and evidence tier** | A source's reliability is a property of the source, not of who is asking |
| **The canonical recommendation verdict** | Two users with the same holdings and the same risk profile must see the same action recommended for the same reason — personalization may change *emphasis*, never the verdict itself, and never in a way that two otherwise-identical users would see different underlying advice |
| **Invalidation conditions** | What would prove a thesis or recommendation wrong is a property of the claim, not the reader |
| **The graded track record** | A past outcome was correct or incorrect; personalization never reframes history to make it feel better for a specific user |
| **Risk disclosure** | Downside is disclosed with the same weight as upside for every user, regardless of what a personalization model predicts they'd prefer to see |

---

## The Hardest Line to Draw, Drawn Precisely: Position Sizing

Position sizing is the one place personalization and universality sit closest together, and it is worth stating exactly where the line falls. **The thesis — is this a good idea, how confident are we, what would prove it wrong — is universal.** **The suggested size — how much of *this specific portfolio* should be exposed to it, given *this specific user's* stated risk tolerance — is personal.** A recommendation screen must always make this split visible: the same underlying call, shown identically to every user, paired with a sizing suggestion that is explicitly, visibly a function of *their* profile — never blended into one number that obscures which part is universal fact and which part is personal context.

---

## Why Commercial Pressure Is Named Explicitly

Per `TRUTH.md` §13.10, this principle extends to commercial and engagement pressure specifically, because that is where personalization most often quietly breaks: **no paid relationship, sponsorship, or engagement optimization goal is ever allowed to change which verdict a user sees, only its ordering or emphasis.** A personalization system that has learned "this user responds well to urgency" is never permitted to manufacture urgency for them specifically — the anti-manipulation commitment in `RETENTION_SYSTEM.md` applies with zero personalization-based exceptions.

---

## How to Audit This Ongoing

Before any new personalization feature ships, it must answer, in writing: which column of this document does it belong in, and can two users with identical holdings and identical risk profiles ever be shown a different underlying truth because of it? If the honest answer to the second question is yes, the feature does not ship in its current form, regardless of how well it tests, because it has crossed from relevance into fact — the one line this entire document exists to hold.
