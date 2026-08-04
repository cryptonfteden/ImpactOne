# First 100 Users Playbook
## Office of the Chief Customer Officer & Chief Growth Officer — ImpactOne

**Mandate:** Design the journey from zero users to the first loyal community. This document does not discuss acquisition channels at scale (see `GROWTH_PLAYBOOK.md`) — it discusses the first 100 specific human beings, who they are, and what has to be true for them to become the platform's first believers.

---

## Who Is User #1?

User #1 is not a random early adopter — they are chosen deliberately: **someone inside the founding team's real personal network who is a genuine beginner and genuinely intimidated by investing** — plausibly a parent wanting to teach a teenager, or the teenager themselves. Not a finance professional (professionals will forgive rough edges and won't tell the team the truth about confusion; beginners won't forgive rough edges and will tell the truth immediately). User #1's real job is not to validate the product — it is to **find the first place the product's plain-language promise breaks down**, before anyone else does.

## Who Is User #10?

A small, deliberately mixed cohort of 9 more people recruited the same way — personal network, explicitly told this is early and rough — spanning: 2–3 more true beginners (including at least one over 60, to stress-test the accessibility and jargon assumptions from day one, not as an afterthought), 2–3 people with some investing experience but no professional background, and 2–3 people who are naturally skeptical of finance apps in general (this cohort exists specifically to surface trust objections early, while they're still cheap to fix).

## Who Is User #100?

The first **true stranger** — someone with zero personal connection to the team, who found ImpactOne through early content, a small community post, or a referral from User #10's own network. User #100 is the first real signal that the product's honesty and plain-language promise travels *without* a founder in the room to explain it. If User #100 churns within a week, that is a more important finding than anything from Users #1–10, because it means the product's value isn't yet self-evident without personal vouching.

---

## Why Do They Install?

- A specific, painful moment of not understanding something about their own money (a stock they hold moved and they don't know why; a parent wants a safe way to teach a teen).
- A recommendation from someone they trust who described it as "the one that actually explains things instead of just giving you a number."
- Curiosity about a claim that sounds almost too honest for a finance product: *"it tells you when it doesn't know."*

## Why Do They Stay?

- The first time the app admits uncertainty instead of bluffing, and the user notices and respects it.
- The first time a graded outcome comes back — right or wrong — and the app doesn't hide the wrong ones.
- The first time they successfully explain something to someone else using ImpactOne's own plain language, and it clicks for both of them.
- A daily routine that takes less time than they feared and leaves them calmer, not more anxious, than before they opened it.

## Why Do They Leave?

- The product asked them to understand jargon before it earned the right to (see `MOBILE_PRODUCT_MASTERPLAN.md`'s onboarding discipline — this is the single largest predictable churn cause).
- A confusing screen with two numbers that seem to disagree (the exact "unreconciled rating pills" failure mode already identified in prior product review work) — a beginner who notices this loses trust in everything else on the screen instantly, disproportionate to the size of the bug.
- The product felt like it wanted them to trade more, check more, or feel more urgency — the opposite of what was promised at install.
- A silent failure (blank screen, generic error) at the exact moment they were building trust.

## What Frustrates Them?

Being shown a number with no explanation. Being asked the same "what does this mean" question twice because the product didn't remember they already learned it. Notifications that don't clearly say what they're about before being opened. Any moment where the product seems to know something but won't just say it plainly.

## What Creates Trust?

Seeing the platform be specifically, verifiably right about something small before being asked to trust it on something large. Seeing a "we don't know" answer delivered as confidently and calmly as a confident answer — this, counter to intuition, is one of the strongest trust signals available, because it proves the confident answers are earned rather than default. Seeing the same honest tone whether the news is good or bad for their specific position.

## What Destroys Trust?

Any instance of the platform sounding more certain than it has a right to. Any two numbers on one screen that appear to disagree without explanation. Any moment where a past claim quietly disappears rather than being graded. Any dark pattern — even a small one, like a slightly-too-eager referral prompt right after a win — reads, to this specific early, skeptical audience, as proof the whole thing was a trick.

## What Surprises Them?

That the app sometimes says nothing urgent is happening — and means it, rather than manufacturing a reason to open the app. That a recommendation actively tells them what would prove it wrong, unprompted. That the monthly review shows a call that didn't work out, presented with the same calm tone as the ones that did. That a genuinely confusing concept gets explained in a sentence they could repeat to a friend.

---

## The First 30 Days

### Week 1 — Prove the promise
- **Day 1:** Onboarding → first real, sourced insight (see `MOBILE_PRODUCT_MASTERPLAN.md` §1). One welcome notification, only if the user opted in during onboarding, containing the actual next day's headline — never a generic "welcome back" ping.
- **Days 2–3:** First daily brief habit forms. Education is inline and contextual only — no separate "lesson" screens yet, since a brand-new user hasn't earned the attention span for a curriculum before they've seen the product work.
- **Days 4–7:** First watchlist or portfolio connection. First moment the user sees their own specific exposure to something they read about.

### Week 2 — Build the habit
- First **trust milestone**: a graded outcome (correct or incorrect) surfaces for the first time, tied to something the user actually saw in week 1. This is deliberately not rushed or manufactured — if no real outcome has matured yet, the app says so honestly rather than faking a milestone.
- First **feature discovery** nudge: a single, contextual (never a tour) prompt introducing Themes or Recommendations, triggered by relevant content, not a fixed day-count.

### Week 3 — Deepen understanding
- **Portfolio evolution:** the user's risk/horizon profile is gently revisited if their behavior (dismissals, watchlist changes) suggests a mismatch with what they stated at onboarding — framed as a check-in, never a correction.
- **Community/education touch:** an optional, low-pressure invitation to a shared (anonymized) learning surface — "here's a concept 40% of new users found confusing this week, here's the plain-language version" — never a social feed, never comparative performance bragging.

### Week 4 — Earn the referral
- **Referral moment:** triggered only by a genuine, graded-correct outcome or a real "aha" moment the user has already expressed (via a dismiss-with-reason or an explicit "this was helpful" tap) — never a generic day-30 "invite your friends" banner disconnected from any real trust event.
- **First monthly portfolio review**, on schedule regardless of day-30 timing, cementing the review habit for month 2 onward.

---

## Notifications (First 30 Days)

Deliberately sparse: a maximum of one notification per day in week 1, rising only if the user demonstrates engagement (opens, doesn't mute) by week 2. Every notification in the first 30 days is manually reviewable in a visible log (`MOBILE_PRODUCT_MASTERPLAN.md`'s Notifications screen) so an early, skeptical user can audit exactly what the app has sent them and why.

## Education (First 30 Days)

No separate onboarding curriculum. All education is contextual, inline, and fades once demonstrated-understood (see `MOBILE_PRODUCT_MASTERPLAN.md` §9). A user who never taps "what does this mean" twice in the same context has, functionally, graduated past that explanation for good.

## Feature Discovery (First 30 Days)

One new surface introduced per week, maximum, always contextually triggered by real content rather than a fixed tour — Recommendations in week 1 (already present from day one, in fact), Themes in week 2, Monthly Review in week 4. Never more than one "new thing to learn" active at a time.

## Portfolio Evolution (First 30 Days)

Starts with a watchlist for most users (lower commitment); a real portfolio connection is never forced before day 4, and never framed as more "serious" or "real" than watchlist-only use — both are legitimate, permanent modes, not a funnel toward the other.

## Trust Milestones (First 30 Days)

1. First sourced, evidence-backed insight (Day 1).
2. First honest "nothing urgent" day (whenever it naturally occurs — proves restraint, not just activity).
3. First graded outcome shown, including if it was wrong (Week 2, whenever real).
4. First disclosed limitation ("we don't have enough data on this yet") — proves honesty under pressure, not just when convenient.

## Referral Moments (First 30 Days)

Never generic. Always tied to one of: a graded-correct outcome, an explicit "this was helpful" user action, or a moment where the user has just successfully explained something to someone else inside a family/mentor context (see `MOBILE_PRODUCT_MASTERPLAN.md` §10's "Mentor" stage, arriving early for a naturally curious or teaching-oriented user).

## Habit Formation (First 30 Days)

Built entirely on the daily brief's 60–90 second loop (`MOBILE_PRODUCT_MASTERPLAN.md` §4), reinforced by a single user-chosen notification time, never a push-notification-frequency ramp designed to maximize opens rather than satisfaction.

## Retention Strategy (First 30 Days → First 100 Users)

Retention in this cohort is measured qualitatively as much as quantitatively: a direct, personal check-in (a real message, not an in-app survey) with every one of the first 100 users at day 7 and day 30. At this scale, a phone call or a personal message from the team is a legitimate, high-leverage retention tool that will never scale past a few hundred users — and is used precisely because it won't, while it still can be.

## Community Building (First 100 Users)

No public community yet — a private, small, opt-in channel (not in-app) where the first 100 users can talk directly to the team and, eventually, to each other. The goal is not scale; it is depth: a handful of users who feel like early collaborators, not customers, because several of them will become the platform's first organic referrers once User #100-style strangers start arriving.

## Success Metrics (First 100 Users)

- **Day-30 retention among Users #1–10:** target near 100% — if the founding team's own trusted network doesn't stick, nothing downstream will.
- **Day-30 retention among Users #11–100:** the first real signal; a meaningful drop-off here versus Users #1–10 indicates the product's value doesn't yet travel without personal vouching.
- **% of users who experience at least one graded outcome (right or wrong) within 30 days:** a proxy for whether the trust loop is actually completing, not just promised.
- **% of users who never contact support asking "what does this number mean":** a direct measure of whether the plain-language design is working.
- **Number of unprompted "this was helpful" or referral actions:** the earliest, cheapest signal that trust has actually compounded into advocacy, ahead of any formal referral program.
