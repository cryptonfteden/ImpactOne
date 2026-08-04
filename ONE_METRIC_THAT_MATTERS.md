# The One Metric That Matters — Phase G2

## The Metric

**Unprompted Week-4 retention: the percentage of a signup cohort still opening ImpactOne on their own, with zero founder/support outreach, four weeks after they joined.**

Not a snapshot number. A cohort curve, tracked over time, at every stage from 5 to 5,000 users.

## Why This One, Not Ten

A daily-habit financial product lives or dies on one question: *does a person, left completely alone, choose to come back a month later?* Every other candidate metric either measures something upstream of that question (acquisition, onboarding completion) or something that can be true while the real answer is still no.

**Rejected candidates, and why each is noise by comparison:**

- **Daily Active Users (raw count)** — trivially inflated by adding more users; says nothing about whether any individual user still wants the product. A company can grow DAU while every single cohort is quietly churning, simply by acquiring faster than it loses people. That's not health, it's a treadmill.
- **Revenue** — the mission's own staged framework (`PMF_SCORECARD.md`) correctly treats willingness-to-pay as a *late*-stage signal, not an early one. Chasing revenue before Week-4 retention is real would mean charging people for a habit that doesn't yet exist, which teaches nothing except how to extract money from novelty.
- **NPS / satisfaction surveys** — measures what people *say*, not what they *do*. This whole engagement's own recurring lesson (D1's "never fabricate," E1–E3's repeated finding that stated intent and real behavior diverge) argues directly against trusting a survey number over a behavior number.
- **Feature-usage counts** (recommendations viewed, AI Analysis opens) — real signal, but partial and gameable by UI nudges. A product can train users to click a button without the button delivering value that survives a month of real life getting in the way.
- **Onboarding completion rate** — necessary, not sufficient. Every one of the 5 beta users completing onboarding on Day 0 says nothing about Day 28.
- **Recommendation accuracy (calibration)** — genuinely important, tracked seriously elsewhere (`PMF_SCORECARD.md` Stage 3, D1's calibration infrastructure) — but accuracy that no one sticks around long enough to benefit from is an academic result, not a business result.

Unprompted Week-4 retention is the one number that fails honestly and unambiguously the moment the product stops earning its place in someone's morning — no averaging, no vanity inflation, no way to fake it by trying harder in week one.

## The Rule

**If unprompted Week-4 retention is flat or growing, cohort over cohort, the company should continue** — even if every other metric looks mediocre, because a product people keep choosing on their own is a product with a real, ownable reason to exist, and every other metric (revenue, referral, accuracy) is a lever that can be pulled once that foundation is real.

**If unprompted Week-4 retention is flat or declining, cohort over cohort, nothing else matters** — not DAU growth, not positive feedback, not a great demo, not even good recommendation accuracy. A product that's technically correct but that no one returns to on their own is not a company yet. It's a well-built prototype.

## How This Ties Back to the Beta

The 5-user closed beta (`BETA_EXECUTION_PLAN.md`) is the first, smallest possible measurement of exactly this number — Day 14's exit debrief and the founder's own daily silence-tracking (`FOUNDER_DAILY_CHECKLIST.md`) are the earliest, most manual version of the unprompted-return signal this metric formalizes. The discipline doesn't change as the company scales — only the tooling around measuring it does.
