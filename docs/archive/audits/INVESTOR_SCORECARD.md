# INVESTOR_SCORECARD.md

**Phase G2 — Investor Readiness Review**
**Voice:** a seed investor evaluating ImpactOne after a proposed 5-user beta. Ignoring engineering, implementation, and technology entirely — the only lens here is: is there evidence of a business, not just a product.

---

## The Verification That Comes Before Any Scoring

Before scoring anything, I checked whether the 5-user beta this review is meant to evaluate has actually happened. It hasn't. `PRIVATE_BETA_GO_LIVE_CHECKLIST.md` — the document that itself defines what "ready to launch" means — has zero checked items across all four of its sections. No file anywhere in this repository contains real interview notes, real user names, or real beta feedback from an actual person. The most recent related work (`BETA_USER_ISOLATION_PLAN.md`) is a design document for how five users *could* eventually use the product with separate data — meaning the product, as of this review, cannot yet even technically support five distinct people without their data mixing together. **There is no beta to observe yet.**

This scorecard is therefore written the way a real seed investor writes one when a founder pitches "come see our beta results" and the beta hasn't run: it defines exactly what evidence would need to exist, scores what evidence exists *today* against that bar, and is explicit everywhere that a category is currently ungraded rather than quietly assumed to pass.

---

## What "Evidence," Not "Opinion," Means Here

An opinion is a founder or a reviewer saying the product is good, promising, or well-built. Evidence is a specific, independently-checkable fact: a named person's actual words, an actual dollar amount someone offered to pay, an actual usage pattern observed over time. Every score below is either backed by a specific checkable fact or marked **NOT YET AVAILABLE** — never filled in with a plausible-sounding guess.

---

## Scorecard

| Category | What evidence would prove this | Evidence that exists today | Score (0–5) |
|---|---|---|---|
| **Real demand** | At least one of five real people, unprompted, describing a specific moment in their actual life when they needed this and didn't have it. | None — no interviews have occurred. | **0 — NOT YET AVAILABLE** |
| **Willingness to pay** | A specific dollar figure a real user offered or agreed would be fair, in their own words. | None — no user has been asked. | **0 — NOT YET AVAILABLE** |
| **Retention behavior** | Actual, observed daily-open counts across two weeks for five real, named individuals. | None — no usage period has occurred with real, distinct users (the product cannot currently distinguish one user's usage from another's). | **0 — NOT YET AVAILABLE** |
| **Word of mouth** | A real instance of one beta user telling a specific other person about the product, independent of being asked to. | None. | **0 — NOT YET AVAILABLE** |
| **Trust under stress** | Evidence that trust survived (or didn't) after a real, disclosed mistake or a graded-incorrect recommendation shown to a real user. | None — this concept exists only as a planned measurement (`TRUST_SCORE_MODEL.md`'s "Resilience Trust"), never yet observed. | **0 — NOT YET AVAILABLE** |
| **Founder's ability to run a disciplined pilot** | A completed, documented, checklist-gated launch of even five real users, with real notes from real conversations. | The planning and measurement discipline that *would* govern this is unusually thorough (see below) — the execution of it has not started. | **2/5 — planning exists, execution doesn't** |
| **Product readiness to even hold five separate users' data** | The product mechanically capable of keeping five people's portfolios, profiles, and feedback distinct from one another. | Confirmed not yet true: every relevant table is a single global row today; a design to fix this exists on paper only, unimplemented. | **1/5 — a known gap, at least honestly diagnosed** |

**Overall investable-evidence score: 0.4 / 5.** Not because the underlying idea or team judgment is weak — because almost no real-world evidence exists yet to score.

---

## The One Genuinely Positive Signal in This Review

The planning discipline itself is real evidence of something, even in the absence of user data: the team has independently produced an unusually rigorous, self-critical body of pre-launch thinking — a four-component trust model that refuses single-number scores, an evidence-classification system for feedback that explicitly guards against a single loud voice steering decisions, and an honest, checklist-gated (not vibes-gated) launch criterion that hasn't been gamed or declared "close enough." **A team that builds this much intellectual honesty into its own measurement plan before it has a single user is a meaningfully better signal than most seed-stage pitches — but it is a signal about the team's judgment, not evidence about the market**, and a seed check is a bet on the latter being validated by the former, not a substitute for it.

---

## Final Verdict

# I would not invest

Not because the product concept, the market, or the team's judgment appear weak — the planning discipline evidenced across this company's own pre-launch work is genuinely above what most seed-stage companies show at this point. **I would not invest because the specific thing this review was asked to evaluate — an observed 5-user beta — has not happened.** There is no real user's words, no real willingness-to-pay figure, no real retention behavior, and no real test of trust under stress anywhere in this repository. Investing on the strength of a plan for evidence, rather than the evidence itself, is exactly the mistake `RED_FLAGS.md` and `DUE_DILIGENCE_CHECKLIST.md` are built to prevent — for this company as much as for any other.

This is a **"not yet," not a "no."** The path back to "I would invest" is short and specific, not vague: run the actual beta, with the founder personally having the three conversations in `USER_INTERVIEW_GUIDE.md` with five real people, fix the data-isolation gap first so the five results are genuinely distinct, and come back with real answers to the willingness-to-pay and retention questions in this scorecard. If those come back even modestly positive — a real number people would pay, at least a few of five opening it unprompted in week two, zero recurrence of a false personalized claim — the underlying planning quality already on display here would make this a genuinely attractive seed opportunity. The team has already done the hard part of knowing what good evidence looks like; it simply hasn't collected any yet.
