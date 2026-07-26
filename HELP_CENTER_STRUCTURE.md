# Help Center Structure
## Office of the Chief Customer Officer — ImpactOne

**Mandate:** Design the complete in-app Help Center with one deliberate bias stated up front: **education before support.** A traditional help center answers "how do I fix this." This one answers that too, but its first and larger job is answering "help me understand this" — because a user who understands *why* a number or a recommendation looks the way it does rarely needs to file a support request about it at all. A well-built education layer is the cheapest, most scalable form of support this company will ever have.

---

## Design Principles

1. **Every piece of jargon in the product links to its own explanation** — the Help Center is reachable from inside the moment of confusion, not just from a separate menu a user has to remember exists.
2. **Explanations are written to the same standard as every other sentence in the product** (`COMMUNICATION_GUIDELINES.md`) — no exaggeration, no padding, no condescension.
3. **Search comes first.** A user arriving confused wants an answer to their specific question, not a browsing experience — the Help Center's primary entry point is a search bar, with categories available underneath for exploration.
4. **Nothing in the Help Center is written to keep a user engaged longer than necessary.** An article that answers the question in two sentences is better than one that answers it in ten, even though ten sentences look more "thorough."

---

## Top-Level Structure

### 1. Understand the Basics (Education, largest section)
The foundational layer — explains every core concept the product relies on, written for someone who has never seen it before:
- What is confidence, and how is it different from uncertainty?
- What does a quality score actually measure?
- What is a thesis, and how does it change over time?
- What does "advisory only" actually mean for me?
- What is risk, and how is it measured here?
- How does personalization work, and what does it never change?

### 2. Understand Your Recommendations
Deeper, recommendation-specific education, reachable directly from any recommendation screen:
- Why did I get this specific recommendation?
- What would prove this recommendation wrong?
- What does the committee debate section mean, and why does the platform show disagreement?
- How is a recommendation's quality score broken down?
- What happens when a recommendation is superseded?

### 3. Understand Your Portfolio
- How is my real exposure calculated?
- What do the portfolio rules (position limits, confidence thresholds) actually control?
- How is my performance measured, and against what benchmark?
- Why does a position show as a paper/simulated trade?

### 4. Understand the Track Record
- How are past recommendations graded?
- What does "ungradeable" mean, and why is it never hidden?
- How does the platform's calibration get checked over time?
- What happens when the platform is wrong?

### 5. Trust and Safety
- What data does ImpactOne collect, and why?
- How is my portfolio and personal information protected?
- What does ImpactOne never do with my data?
- Who reviews the platform's own recommendations for quality?
- How do I report something that felt wrong, confusing, or dishonest? (a direct link into the same trust-reporting spirit as `PRIVATE_BETA_PLAYBOOK.md` §9, generalized beyond the beta)

### 6. Using the App
The traditional support layer — smaller than the sections above, by design:
- How do I adjust my notification settings?
- How do I add or remove a watchlist item?
- How do I reset my portfolio, and what does that actually delete?
- How do I update my risk tolerance or investment horizon?
- How do I delete my account and data?

### 7. Contact Us
The last, smallest section — reached only once search and the education layers above haven't answered the question:
- A direct, monitored feedback channel, with an honest expected response time stated plainly, never a vague "we'll get back to you."
- A visibly separate path for reporting something that reduced trust specifically (mirroring `PRIVATE_BETA_PLAYBOOK.md`'s dedicated trust-reporting flow, made permanent for all users, not just beta participants).

---

## Contextual Help, Not Just a Destination

The Help Center's most important surface is not the Help Center screen itself — it's the small, inline "what does this mean" affordance available next to every confidence score, every jargon term, and every unfamiliar section header, everywhere in the product (`MOBILE_PRODUCT_MASTERPLAN.md` §9, `DESIGN_SYSTEM_V2.md`). These inline explanations fade automatically once a user has demonstrated understanding, and every one of them links back to the fuller Help Center article for a user who wants more depth than the inline version gives.

---

## What the Help Center Is Never Used For

- Upselling a premium tier.
- Soliciting a referral or a review.
- Collecting marketing-consent data disguised as a support interaction.
- Deflecting a legitimate trust concern into a generic FAQ answer that doesn't actually address what the user asked.

---

## Measuring Success

The Help Center is working when the number of users who need to contact a real person keeps falling even as the total user base grows — the opposite of a support system that scales linearly with users. The clearest sign of failure is not a lack of Help Center visits; it's a Help Center that gets visited often and still doesn't reduce how many people end up needing to ask a person the same question directly afterward.
