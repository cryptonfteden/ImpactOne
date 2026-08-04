# First 1,000 Users Plan
## Office of the Chief Product Officer — ImpactOne

**Mandate:** Design the road from the 25 private beta users (`PRIVATE_BETA_PLAYBOOK.md`) to 1,000 real users, in four deliberate stages. Each stage is a genuine gate, not a calendar milestone — the plan does not advance to the next stage until the current one's success metrics are actually met.

---

## Stage 1: 25 Users (Private Beta)

Fully specified in `PRIVATE_BETA_PLAYBOOK.md` and gated by `PRIVATE_BETA_GO_LIVE_CHECKLIST.md`. Summarized here for continuity:

- **Activation:** first real, sourced insight within the 90-second morning experience, on day one, for every participant.
- **Retention:** personal, individual check-ins at day 1, day 7, and day 30 — high-touch, deliberately unscalable, used precisely because it still can be at this size.
- **Feedback:** daily checklist, weekly structured reflection, dedicated bug and trust-reporting flows (`PRIVATE_BETA_PLAYBOOK.md` §6–9).
- **Trust:** tracked per-participant weekly (1–10 self-report); any single false, specific claim about a participant's own data is treated as a beta-pausing event, not a routine bug.
- **Referral:** none solicited yet — this stage exists to earn trust, not to spread it.
- **Success metrics:** ≥15 of 25 still opening 4+ days/week by week 4; ≥18 of 25 at trust rating 6+/10 by the end; zero unresolved Critical findings.

---

## Stage 2: 100 Users

**Who joins:** the 25 beta participants (retained), plus 75 more recruited the same deliberate, mixed way — personal network first, expanded slightly to include a small number of genuinely aligned referrals from Stage 1 participants who explicitly asked to invite someone.

- **Activation:** the 90-second morning experience and 7-tap onboarding bar (`MOBILE_PRODUCT_MASTERPLAN.md` §1) are now hard, instrumented gates, not just design targets — every new user's time-to-first-insight is measured, not assumed.
- **Retention:** personal check-ins shift from universal (all 100) to targeted — any user showing zero opens in 5 days receives a real, individual message; the Monthly Portfolio Review becomes the primary passive retention mechanism for everyone else.
- **Feedback:** the beta's daily/weekly/bug/trust flows continue, now supplemented by lightweight passive analytics (open frequency, screen reached, time-to-close) so not every signal depends on a user writing something down.
- **Trust:** the same 1–10 weekly self-report, now tracked as a cohort trend, not just individual scores — a declining average across the cohort is treated as an incident, not noise.
- **Referral:** the first gentle, trust-triggered referral prompt is introduced (tied to a graded-correct outcome or an explicit "this was helpful" action), still fully uncompensated.
- **Success metrics:** day-30 retention ≥70% cohort-wide; cohort average trust rating flat or rising versus Stage 1's exit value; at least 10 organic (non-solicited) referral actions.

---

## Stage 3: 250 Users

**Who joins:** the first true strangers with no personal connection to the team or to any existing participant — recruited through a small number of values-aligned content pieces and 1–2 university club partnerships, per `GROWTH_PLAYBOOK.md` Stage 3.

- **Activation:** onboarding must now succeed without any founder or team member in the room to explain confusion away — the first real test of whether the product's plain-language promise travels on its own.
- **Retention:** the Monthly Portfolio Review and honest track-record surface (if shipped by this stage) carry the majority of retention load; individual outreach narrows further to genuinely at-risk users identified by passive signals.
- **Feedback:** transition from "every user writes something down" to a structured sample — a rotating subset of users receives the detailed weekly reflection, while the full cohort's passive analytics and lightweight in-app feedback (thumbs, dismiss-with-reason) cover the rest.
- **Trust:** the weekly self-report question set is trimmed to the single most important item (trust rating, 1–10) for the full cohort, with the deeper reflection reserved for the sampled subset — trust measurement must scale without becoming a burden that itself damages trust.
- **Referral:** referral participation is tracked as a real, if still small, acquisition channel; any incentive introduced remains non-cash and tied strictly to a genuine trust event.
- **Success metrics:** day-30 retention for stranger-acquired users within 10 percentage points of the personal-network baseline from Stage 2 — a larger gap indicates the product's value isn't yet self-evident without personal vouching, and this stage does not advance until that gap closes.

---

## Stage 4: 500 Users

**Who joins:** broader organic and referral growth, plus the first small, deliberate content/university partnership expansion — still no paid acquisition at this stage.

- **Activation:** fully instrumented and A/B-tested onboarding, evaluated strictly against Weekly Trust-Confirmed Users (`GROWTH_PLAYBOOK.md`'s North Star) rather than raw signup conversion — a "better-converting" flow that produces less-trusting users is rejected regardless of its numbers.
- **Retention:** Family/Mentor Mode (if shipped by this stage) is tested with a deliberately recruited subset of parent/teen or mentor/mentee pairs, mirroring the same care used to recruit the original 25 beta users.
- **Feedback:** a lightweight, always-on in-app feedback channel (dismiss-with-reason, a simple thumbs-based reaction on recommendations) becomes the primary channel for the general cohort; the structured weekly reflection is reserved for a small, rotating "advisory" subset of the most engaged users.
- **Trust:** the annual and monthly honest-reporting cadence (`RETENTION_SYSTEM.md`) is now live and is the primary trust-measurement mechanism, supplementing rather than replacing direct self-report.
- **Referral:** referral becomes a meaningfully tracked, if still modest, contributor to new signups; the first look at family/group referral flows begins.
- **Success metrics:** ≥50% of active users have viewed the Monthly Review at least once; cohort trust rating still flat or rising since Stage 1; referral share of new signups measurably above Stage 3.

---

## Stage 5: 1,000 Users

**Who joins:** the natural continuation of Stage 4's channels, now including the first cohort of genuinely unprompted, organically-arrived users who found the product without any direct outreach at all.

- **Activation:** the onboarding and 90-second morning experience are now mature enough to be judged against `MOBILE_PRODUCT_MASTERPLAN.md`'s original design targets directly, with real data instead of estimates — this is the first stage where the product's actual performance against its own stated design can be honestly graded.
- **Retention:** the full four-cadence retention system (`RETENTION_SYSTEM.md`) — daily, weekly, monthly, yearly — is live and measured end to end for the first time across a cohort large enough to trust the resulting numbers.
- **Feedback:** a structured quarterly review of aggregated, anonymized feedback themes replaces most one-on-one outreach, reserving direct personal contact for genuinely at-risk or genuinely exceptional users only.
- **Trust:** the platform's first meaningful, cohort-wide calibration data exists — real evidence of whether stated confidence scores actually correspond to real-world accuracy at a scale large enough to mean something statistically.
- **Referral:** referral is evaluated as a real, ongoing acquisition channel with its own conversion and retention metrics, still governed by the same no-cash-incentive, trust-triggered design established at Stage 2.
- **Success metrics:** Weekly Trust-Confirmed Users (the platform's permanent North Star) trending upward as a share of total users; day-30 retention holding at or above the Stage 3 stranger-acquired baseline; zero unresolved Critical trust findings anywhere in the product, confirmed the same way `BETA_READINESS_AUDIT.md` confirms them today.

---

## What Never Changes Across All Five Stages

Every stage above scales the number of people. None of them ever relaxes: the Critical-findings-first discipline established in the beta, the no-manipulation retention principles in `RETENTION_SYSTEM.md`, the free evidence/confidence/uncertainty core, or the rule that trust measurement itself must never become a burden heavy enough to damage the trust it's trying to measure. A stage that hits its user-count target by loosening any of these has not actually reached 1,000 real users — it has reached 1,000 users of a different, worse product.
