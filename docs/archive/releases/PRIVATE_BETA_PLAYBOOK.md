# Private Beta Playbook
## Office of the Chief Beta Director — ImpactOne

**Mandate:** Prepare the first 25 real users, end to end — who they are, what they receive, how they give feedback, and how that feedback becomes a decision. This document is process and validation, not implementation. It does not launch anything by itself — launch is gated by `PRIVATE_BETA_GO_LIVE_CHECKLIST.md`, whose measurable criteria include the Critical findings already on record in `BETA_READINESS_AUDIT.md`. This playbook is the plan to execute the moment that checklist passes, not a signal that it has.

---

## 1. Who Should Receive Invites

Twenty-five invites, deliberately composed as a mixed cohort — never twenty-five similar people, because a private beta that only hears from one kind of user only finds one kind of problem.

| Segment | Count | Why |
|---|---:|---|
| Complete beginners (16–25, at least 2 paired with a parent/mentor) | 5 | Stress-tests jargon, onboarding, and comprehension — the hardest audience to satisfy and the one the whole product exists for |
| Young professionals / long-term investors (28–40) | 5 | Represents the core early-adopter profile most likely to use the product daily and refer others |
| Parents (35–55) evaluating it to teach a teenager | 5 | Tests the family use case directly, even ahead of a dedicated feature, and reads every explanation more carefully than most |
| Retired or near-retired investors (60+), new to finance apps generally | 5 | Stress-tests accessibility, pacing, and whether confidence/trust language actually lands without prior app fluency |
| Experienced or semi-professional investors, deliberately skeptical by disposition | 5 | Most likely to notice templated content, inconsistent scoring, or false claims quickly — the fastest, cheapest way to catch exactly the failure modes already found in prior review cycles |

**Who should not receive invites:**
- Anyone unwilling or unable to commit roughly 10 minutes a day for 30 days.
- Press, public influencers, or anyone with a large public platform — reputational risk during a private, unfinished beta outweighs any early buzz.
- Anyone professionally employed by a direct competitor in a role with a conflict of interest.
- A minor without a paired adult/mentor account — family mode does not yet exist as a shipped feature, so an unaccompanied minor has no appropriate account structure to use.
- Anyone screened, in a short pre-invite conversation, as unlikely to report a negative finding honestly — a beta built on polite silence finds nothing worth finding.
- Anyone personally close to the engineering team in a way likely to produce reflexively positive, non-critical feedback — the sample must be biased toward honesty, never toward loyalty.

---

## 2. What Success Looks Like

- At least 15 of 25 participants are still opening the app, unprompted, at least 4 days a week by the end of week 4.
- At least 18 of 25 participants report a trust rating of 6/10 or higher by the end of the beta, with the *trend* over the 4 weeks flat or rising, never declining.
- At least one graded, honestly-reported outcome (correct or incorrect) is seen and acknowledged by at least half of participants before the beta ends.
- Every Critical and High finding surfaced during the beta is triaged within 48 hours and either fixed or explicitly scheduled, visibly, to the participant who raised it.
- At least 10 of 25 participants say, unprompted or when asked, that they would recommend it to a specific named person in their life.

## What Failure Looks Like

- A majority of participants stop opening the app by week 2 without a clear, addressed reason.
- Any participant reports a specific, factual claim about their own portfolio or watchlist that turns out to be false, mirroring the exact failure already found and logged (`BETA_READINESS_AUDIT.md`) — a single live recurrence of this specific failure mode during the beta is treated as a beta-pausing event, not a routine bug.
- Trust ratings trend downward over the four weeks for a meaningful share of participants, rather than flat or rising.
- More than a handful of participants describe the product as "confusing" or "generic" in their own words, unprompted, in weekly feedback.
- The team cannot clearly answer, at the end of the beta, what changed and improved as a direct result of participant feedback.

---

## 3. Beta Onboarding Flow

1. **Invite sent** — a personal, named invitation (never a mass blast), explaining why this specific person was chosen and what's being asked of them.
2. **Beta agreement & expectations** — a short, plain-language document (see §5) covering time commitment, confidentiality (no public screenshots or sharing during the beta), and what they get in return.
3. **Account setup** — real account creation, with an explicit "Beta — Cohort 1" label visible to the participant at all times, so they always know they're in a test, not the finished product.
4. **Guided first session** — the standard product onboarding (`MOBILE_PRODUCT_MASTERPLAN.md` §1), with one addition: a persistent, dismissible beta banner linking directly to the feedback and bug-reporting channels from the very first screen.
5. **Day-1 personal check-in** — a real, individual message from the team within 24 hours of first use, asking one specific, open question: "What was confusing or didn't make sense?" — never "how was it?", which invites politeness instead of specifics.
6. **Weekly rhythm begins** — see §7.

---

## 4. Beta Welcome Message

> **Subject: You're one of the first 25 people to see ImpactOne**
>
> Hi [Name],
>
> You're one of 25 people we've personally invited to try ImpactOne before anyone else. We picked you because [specific, honest reason — e.g., "you told me you've never felt confident reading financial news" / "you're exactly the kind of careful, skeptical reader who catches things we miss"].
>
> This is early. Things will be rough in places, and some of what you see may be wrong, confusing, or half-finished. That's exactly what we need you to find. We are not looking for encouragement — we're looking for the truth about what it's actually like to use this, including the parts that don't work.
>
> What we're asking: about 10 minutes a day for the next 30 days, and honesty every time something feels off, confusing, or wrong — especially the small things. What we're offering in return: a direct line to the people building this, real influence over what we fix and build next, and permanent credit as one of the first 25 people who helped make it trustworthy.
>
> One request: please don't share screenshots or details publicly during this beta — this is a private, unfinished look, and we want your honest reaction, not a performance for an audience.
>
> Thank you for doing this with us.
>
> — The ImpactOne team

---

## 5. Beta Expectations

**What we ask of participants:**
- Open the app most days for about 10 minutes, for 4 weeks.
- Use it with real or realistically representative goals and information — not a deliberately empty or fake test account, unless specifically testing an empty-state scenario.
- Report anything confusing, wrong, or that reduced trust, even if it feels minor or embarrassing to mention.
- Complete a short weekly reflection (see §7).
- Keep the experience private — no public sharing during the beta window.

**What participants get:**
- Early, direct access before general availability.
- A real, responsive line to the team — feedback is read by a person, not a form that disappears.
- Visible influence: participants are told, specifically, when something they reported changed a decision.
- Recognition as a founding beta participant once the product launches publicly.

---

## 6. Daily Testing Checklist (for participants)

A short, informal checklist — not a rigid test script, since a beta that feels like unpaid QA work stops feeling honest:

- [ ] Open the app once today, as you naturally would.
- [ ] Read whatever the app shows you first — did it make sense without help?
- [ ] Check one other screen you haven't looked at in a few days.
- [ ] Note anything — even one sentence — that felt confusing, wrong, templated, or surprising.
- [ ] If genuinely nothing stood out today, say so — "nothing to report" is a valid and useful daily entry, not a skipped one.

---

## 7. Weekly Feedback Flow

Every week, each participant completes a short, structured reflection (5 minutes, not a long survey), covering the nine tracked scores (§9) plus three open questions:

1. What's one thing that made you trust the app more this week?
2. What's one thing that made you trust it less, or feel confused?
3. What would you tell a friend if they asked whether it's worth trying?

Responses are reviewed by the team within 48 hours, every week, without exception — a beta program that lets feedback pile up unread teaches participants that honesty doesn't matter, which is the single fastest way to lose a beta cohort's engagement.

---

## 8. Bug Reporting Flow

A lightweight, always-visible in-app path (reachable from the persistent beta banner):

1. **What happened** — one or two plain sentences, no technical detail required.
2. **What you expected instead** — equally plain.
3. **How much it bothered you** — a simple three-point scale (barely noticed / annoying / made me stop trusting or using it).
4. **Screenshot, if easy** — optional, never required.

Every bug report is acknowledged within 24 hours with a real, specific response — even if the response is "we've seen this and are working on it" — never silence.

---

## 9. Trust Reporting Flow — deliberately separate from bug reporting

Not every trust problem is a bug, and conflating the two loses the signal that matters most to this product's mission. A dedicated, equally lightweight path, framed with one specific question:

> **"Did anything today make you trust ImpactOne less — even a little, even if nothing was technically broken?"**

This exists because the single most damaging finding in this product's history so far (a specific, false claim about a user's own empty portfolio) would not necessarily have been reported as a "bug" by a casual user — it would have registered as a vague, hard-to-articulate loss of confidence. This flow exists to catch exactly that feeling, in the participant's own words, before they simply stop trusting silently and disengage.

Every trust report is treated as high-priority regardless of how minor it sounds, and is reviewed same-day, not batched into the weekly cycle.

---

## 10. Feedback Categorization

Every piece of feedback — from the daily checklist, weekly reflection, bug reports, or trust reports — is tagged into exactly one primary category (a second, secondary tag is allowed where genuinely relevant):

| Category | What belongs here | Example |
|---|---|---|
| **Trust** | Anything that made a claim feel false, generic, templated, or overconfident | "It said something about my portfolio that isn't true" |
| **Clarity** | Anything confusing, jargon-heavy, or unclear regardless of accuracy | "I didn't understand what 'uncertainty' meant" |
| **Performance** | Anything slow, broken, or unresponsive | "The screen didn't load, or froze" |
| **Education** | Anything about how well the product taught a concept | "I finally understood what a risk score means" |
| **Navigation** | Anything about finding or moving between screens | "I couldn't find where my watchlist was" |
| **Portfolio** | Anything specific to the Portfolio screen | "My return numbers seemed off" |
| **Recommendations** | Anything specific to the Recommendations screen | "I didn't understand why it said Buy" |
| **Daily Feed** | Anything specific to the Daily Feed screen | "Every headline felt the same" |
| **Bugs** | Anything that is clearly broken behavior, not a design opinion | "The reset button didn't ask me to confirm" |
| **Feature Requests** | Anything the participant wants that doesn't exist yet | "I wish I could see last month's calls" |

---

## 11. Scoring Framework

Tracked per participant, weekly, combining passive observation where available with a short self-report:

| Metric | How it's tracked | Why it matters |
|---|---|---|
| **Daily opens** | Observed session count per day | Direct measure of the habit loop actually forming |
| **Session length** | Observed time per session | Short, satisfied sessions are the target — not longer is better |
| **Features used** | Observed distinct screens/actions touched per week | Reveals whether the product is being explored or narrowly used |
| **Trust rating** | Self-reported, 1–10, weekly | The single most important tracked number in this entire program |
| **Recommendation usefulness** | Self-reported, 1–5, weekly | Direct read on whether the Recommendations screen justifies its own existence |
| **Portfolio usefulness** | Self-reported, 1–5, weekly | Same, for Portfolio |
| **Daily Feed usefulness** | Self-reported, 1–5, weekly | Same, for the screen the whole daily-habit mission depends on most |
| **Education value** | Self-reported, 1–5, weekly | Measures whether the product is making the participant more capable over time, not just more informed today |
| **Would recommend to a friend** | Self-reported Yes/No/Maybe plus a 0–10 likelihood, weekly | The clearest single proxy for whether trust has actually compounded into advocacy |

---

## 12. The CEO Dashboard

A single view, updated weekly (daily where the underlying data supports it), that answers exactly these questions, and no others — a dashboard that tries to show everything ends up making leaders track nothing carefully:

| Question | How it's answered |
|---|---|
| **How many users returned today?** | Count of the 25 participants with at least one session today, and the same count trended over the full beta period |
| **How many trusted the recommendations?** | Count of participants whose most recent Recommendation-usefulness and Trust-rating scores are both at or above a stated threshold |
| **How many lost trust?** | Count of participants whose Trust rating declined week-over-week, plus anyone who filed a Trust Report (§9) in the period |
| **Which screen caused the most frustration?** | The feedback category (§10) with the highest combined volume and severity this week, broken down by screen where applicable |
| **Which feature created the most delight?** | The most frequent positively-tagged theme in weekly open-question responses, with representative direct quotes, not just a count |
| **What should Sprint 28 improve?** | The single highest-volume, highest-severity recurring theme across all feedback channels this period — stated as one clear, specific sentence, not a list |

The dashboard exists to force one honest weekly conversation, not to replace it — every number on it must be traceable back to a specific participant's actual words, never presented as an anonymous aggregate divorced from what was actually said.

---

## 13. Standing Discipline

This playbook assumes, and requires, that the beta does not begin until `PRIVATE_BETA_GO_LIVE_CHECKLIST.md` passes in full. Preparing a beta program and being ready to run one are different things — this document is the former. The latter is a measurable, evidence-based gate, not a judgment call, and it is not this document's place to declare it met.
