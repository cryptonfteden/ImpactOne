# Beta Feedback Analysis
## Office of the Chief Learning Officer — ImpactOne

**Mandate:** Design how feedback from the first 25 beta users (`PRIVATE_BETA_PLAYBOOK.md`) will actually influence future product decisions. The central discipline is the same one this platform already applies to market evidence, applied here to feedback about itself: **not all feedback is equally trustworthy, and treating it as if it were is how a small, vocal minority ends up steering decisions that should have been based on a real pattern.**

---

## Four Kinds of Feedback, Never Treated as Equivalent

| Kind | Definition | Weight |
|---|---|---|
| **Noise** | A single, unrepresentative comment with no corroborating pattern from anyone else and no observed behavior backing it up | Logged, never acted on alone |
| **Opinion** | A stated preference or subjective judgment ("I wish," "I'd prefer," "I don't like") | Weighted by how many independent participants share it, never acted on from a single voice |
| **Evidence** | A specific, verifiable claim about the product's actual behavior — something that can be checked and confirmed true or false | Highest priority; treated the same way a Primary source is treated in `EVIDENCE_QUALITY_MODEL.md` |
| **Behavior** | What a participant actually did — opens, session length, screens visited, drop-off points, actions taken — independent of anything they said | Weighted highly, and specifically used to check whether stated Opinion matches revealed Behavior |

This is a direct, deliberate parallel to `EVIDENCE_QUALITY_MODEL.md`'s evidence classes, applied to product feedback instead of market claims — the same discipline that prevents a single unverified rumor from anchoring a market belief is used here to prevent a single loud complaint from anchoring a product decision.

---

## How to Tell Them Apart

**Is it Noise?** Ask: has anyone else, independently, said anything like this? Is there any observed behavior that corroborates it? If no to both, it's Noise — recorded for pattern-matching later, never actioned in isolation.

**Is it Opinion?** Ask: is this a preference, or a claim about what actually happened? "I think the app feels cluttered" is an opinion. "The app showed the same explanation on six different headlines" is not — it's checkable. Opinions are valuable in aggregate and dangerous in isolation; they are the input most vulnerable to a single articulate participant's phrasing carrying more weight than it deserves.

**Is it Evidence?** Ask: can this be independently verified by looking at the product itself? A report that a specific screen showed a specific false claim, or that a specific button produced no response, is Evidence — it does not need a second participant to corroborate it before being taken seriously, because it is independently checkable on its own.

**Is it Behavior?** Ask: is this something the participant *did*, not something they *said*? Behavior is the hardest signal to argue with and the easiest to misinterpret in isolation — a drop in opens could mean the product failed, or it could mean the participant went on vacation. Behavior is always read alongside the other three, never as a sole verdict.

---

## The Decision Weighting Rule

When multiple kinds of feedback point in different directions, they are resolved in this order, always:

1. **Evidence** (a verified, checkable claim about actual product behavior) wins over everything else, because it is the only category that doesn't depend on interpretation.
2. **Behavior**, especially when it contradicts stated Opinion — a participant who says "I love the daily brief" but hasn't opened it in a week is telling the product two different things, and the second one deserves real attention, not dismissal.
3. **Corroborated Opinion** — the same preference stated independently by multiple participants — is treated as a real signal worth planning around, though still not equivalent to verified Evidence.
4. **Single-source Opinion** is noted, tracked for future corroboration, and never alone justifies a product change.
5. **Noise** is archived, not discarded — a single strange comment today can become a corroborated pattern once a fifth or sixth participant says something similar weeks later.

---

## What This Looks Like Applied to the Beta's Own Findings

The single most damaging finding already on record — a false "portfolio overlap detected" claim shown against an empty account — is a clean example of **Evidence**: independently verifiable by checking any account with no holdings, requiring no corroboration from a second participant to be acted on immediately and fully. By contrast, a single beta participant saying "the colors feel a little cold" is **Opinion**, tracked but not actioned unless several other participants independently raise something similar. A participant who rates their trust highly in a weekly survey but stops opening the app for ten straight days is a **Behavior**/**stated-Opinion** mismatch that deserves a direct, individual follow-up before any dashboard-level number is trusted at face value.

---

## Turning Categorized Feedback Into Decisions

Every week, the categorized feedback (per `PRIVATE_BETA_PLAYBOOK.md`'s 10-category taxonomy, cross-cut by the four kinds above) is reduced to exactly three outputs, never more, to keep the process honest and fast:

1. **One confirmed Evidence-tier finding to fix**, ranked by severity, this week.
2. **One corroborated Opinion pattern to evaluate**, only once it has appeared independently across at least three participants.
3. **One Behavior anomaly to investigate directly with the specific participant it came from**, rather than generalized into a dashboard trend prematurely.

A weekly review that produces more than these three risks diluting attention across too many half-confirmed signals — exactly the discipline `MORNING_EXPERIENCE_BLUEPRINT.md` applies to a user's morning is applied here to the team's own weekly attention.

---

## The Standing Risk This Document Exists to Prevent

Twenty-five people is a small enough sample that a single, articulate, frequently-vocal participant can start to feel like "the voice of the beta" if this discipline isn't followed deliberately. The four-way classification above exists specifically so that one person's strongly-stated Opinion is never mistaken for the cohort's Evidence — the same protection this platform gives a single low-credibility source in the market, applied to its own most important, most trusted feedback channel.
