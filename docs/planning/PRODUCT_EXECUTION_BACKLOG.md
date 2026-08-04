# Product Execution Backlog
## Office of the Head of Product Execution — ImpactOne

**Mandate:** Strategy is done. This document contains zero architecture tasks, zero research tasks, and zero documentation tasks — every line item below is a user-facing change that ships value a person can see, feel, or benefit from inside the product. The single objective is stated plainly: **get ImpactOne into daily personal use, as fast as possible, without compromising the trust principles the strategy layer already locked in.**

**Source review:** This backlog is the execution translation of `MOBILE_PRODUCT_MASTERPLAN.md` (screens, journeys, the ranked 50), `DESIGN_SYSTEM_V2.md` (visual/interaction rules every task below must satisfy), `FIRST_100_USERS_PLAYBOOK.md` (what the first real users need to stay), `GROWTH_PLAYBOOK.md` (what has to be true before referral/growth mechanics mean anything), and known, previously-documented product defects (dashboard load-time instability, absent onboarding, unreconciled rating displays). Nothing here contradicts those documents; this document exists to sequence them into something shippable.

**How to read a task:**

- **Priority:** P0 (blocks daily use entirely) · P1 (high-leverage, ship this release) · P2 (meaningful, can slip one release) · P3 (polish)
- **Effort:** XS (1–2 days) · S (3–5 days) · M (1–2 weeks) · L (3–4 weeks) · XL (4–6+ weeks)
- All estimates assume a small, focused product team already familiar with the codebase — not a from-scratch build.

**Release philosophy:** Each release has one job and one ship bar. A release does not open until the previous one's ship bar is met. This is deliberately conservative — this backlog optimizes for *reaching real daily use quickly*, not for shipping the most features fastest.

---

## Roadmap Overview

| Release | Theme | Goal | Ship bar to advance |
|---|---|---|---|
| **0** | Make It Not Break | A first-time user can complete onboarding and use the app without hitting a broken or confusing screen | Zero P0 defects reproducible on first open |
| **1** | One Honest Reason to Return | A user's first session produces at least one specific, verifiable trust moment | New users can explain, unprompted, what a confidence and an uncertainty score mean |
| **2** | The 90-Second Daily Habit | A user opens once a day and leaves satisfied in under two minutes | Median daily session under 2 minutes with self-reported satisfaction, not abandonment |
| **3** | Prove the Track Record | Users see the platform graded monthly, including its misses | ≥50% of active users view the Monthly Review or track-record screen at least once |
| **4** | Make It Personal | Returning users have persistent identity; families can use it together | Cross-device/reinstall retention of personal data with zero data loss |
| **5** | Earn the Referral | Trust converts into unprompted advocacy | Referral participation rate among users who've seen a graded-correct outcome is measurably above baseline |
| **6** | Daily Convenience & Polish | Friction removed for the already-retained daily user | Widget/lock-screen adoption among 30-day-retained users |

---

## Release 0 — Make It Not Break

**Goal:** Nothing below matters if the app is broken, confusing, or contradicts itself the first time someone opens it.

### R0.1 — Fix dashboard load-time layout instability
- **Priority:** P0
- **Effort:** M
- **Dependencies:** None — this is the single blocking item in the entire backlog
- **Expected user impact:** Eliminates the single worst first impression currently possible — a screen that visibly reflows and pushes content off-screen on open
- **Expected business impact:** Every other investment in acquisition or retention is wasted while this exists; this is the highest-leverage fix available
- **Acceptance criteria:**
  - Dashboard reaches a visually stable, interactive state within 2 seconds on a standard device
  - No layout element (sidebar, content) overtakes or displaces another after initial paint
  - Verified across at least 3 real device/browser combinations, not just one
- **Success metric:** Zero reflow-related session abandonments in the first 10 seconds of any session, measured over one week post-fix

### R0.2 — Ship real first-time onboarding
- **Priority:** P0
- **Effort:** L
- **Dependencies:** R0.1 (no point onboarding into an unstable shell)
- **Expected user impact:** Replaces the current "straight into a guest workspace with no explanation" experience with the guided journey defined in `MOBILE_PRODUCT_MASTERPLAN.md` §1 — a user reaches one real, sourced insight within 90 seconds
- **Expected business impact:** Onboarding completion and day-1 return rate are the two most predictive metrics for every later retention and revenue outcome; this is the second-highest-leverage item in the backlog
- **Acceptance criteria:**
  - New users see the "who is this for" branching, risk/horizon capture in plain language, and a first real sourced insight before any account-creation prompt
  - Maximum 7 taps from first open to first real insight
  - Account creation is deferred until after the first insight is shown
- **Success metric:** ≥80% onboarding completion rate; ≥60% day-1 return rate for users who complete it

### R0.3 — Reconcile all rating/verdict displays into one canonical view
- **Priority:** P0
- **Effort:** M
- **Dependencies:** None
- **Expected user impact:** Removes the specific, previously-observed failure where a screen shows multiple numbers that look like they disagree — the single fastest way a skeptical user loses trust in everything else on the page
- **Expected business impact:** Directly protects the trust moat the entire strategy layer depends on; a visible internal contradiction on day one undermines every later trust-building feature
- **Acceptance criteria:**
  - Every screen that shows a recommendation, rating, or verdict shows exactly one action/verdict, never two differently-labeled scores that could read as disagreeing
  - Any additional context (e.g., a debate or alternate view) is visually and structurally subordinate to the one canonical verdict, never presented as a second, competing answer
- **Success metric:** Zero user-reported "these two things don't match" confusion in support/feedback channels post-ship

### R0.4 — Graceful fallback states for every provider failure
- **Priority:** P0
- **Effort:** M
- **Dependencies:** None
- **Expected user impact:** No blank screens, raw errors, or silent failures anywhere in the app — every failure state explains what happened, in plain language, and what the user can still do
- **Expected business impact:** A silent failure during a first or early session is disproportionately costly to trust relative to its actual severity; this closes that gap cheaply
- **Acceptance criteria:**
  - Every screen that depends on external data has a defined, tested fallback state (cached data with staleness label, or an honest "temporarily unavailable" message with a retry action)
  - No screen ever renders a blank white page or an unhandled error to a user
- **Success metric:** Zero blank-screen or raw-error sessions recorded over a one-week observation window

---

## Release 1 — One Honest Reason to Return

**Goal:** A brand-new user's first session produces at least one specific, verifiable trust moment — not a promise of trust, an instance of it.

### R1.1 — Split confidence and uncertainty into two visible elements everywhere
- **Priority:** P0
- **Effort:** M
- **Dependencies:** R0.3
- **Expected user impact:** Users can see, plainly, when the platform is confident but genuinely divided, versus confident and settled — the core epistemic promise made real on screen, per `DESIGN_SYSTEM_V2.md` §12
- **Expected business impact:** This is the visual proof of the platform's central differentiator; without it, "we tell you when we don't know" is just marketing copy
- **Acceptance criteria:**
  - Every score of this kind shows a labeled confidence bar and a visually distinct, separately labeled uncertainty indicator
  - No screen presents a single blended number as a stand-in for both
- **Success metric:** In post-session surveys, ≥70% of new users can correctly describe the difference between the two in their own words

### R1.2 — Add evidence source badges everywhere a claim is cited
- **Priority:** P1
- **Effort:** S
- **Dependencies:** None
- **Expected user impact:** Users can see, at a glance, whether a claim comes from a filing, reputable reporting, aggregated sentiment, or an unverified claim — before they decide how much to trust it
- **Expected business impact:** Cheap to ship, high visible-trust return; this is one of the fastest wins available in the entire backlog
- **Acceptance criteria:**
  - Every cited piece of evidence displays a tappable badge indicating its source class
  - Badge is distinguishable without relying on color alone (shape/fill, per accessibility rules)
- **Success metric:** ≥40% of users tap at least one source badge within their first 3 sessions

### R1.3 — Add "what would prove this wrong" to every recommendation
- **Priority:** P1
- **Effort:** S
- **Dependencies:** R0.3
- **Expected user impact:** Users see the platform's own stated failure condition alongside every suggestion — the single clearest, cheapest demonstration of intellectual honesty available
- **Expected business impact:** Directly differentiates from every competitor that only ever shows the bull case
- **Acceptance criteria:**
  - Every recommendation surface includes a visible, specific invalidation condition, not a generic disclaimer
- **Success metric:** ≥25% of users viewing a recommendation also view its invalidation condition within the same session

### R1.4 — Add inline, fading glossary tooltips
- **Priority:** P1
- **Effort:** M
- **Dependencies:** None
- **Expected user impact:** Removes the single largest comprehension barrier for beginner users without forcing anyone through a forced tutorial; explanations appear the first three times a term is seen, then quietly stop
- **Expected business impact:** Directly protects the underserved-beginner audience the whole strategy is built around; a confused user churns silently, this prevents that
- **Acceptance criteria:**
  - Every jargon term (confidence, uncertainty, thesis, exposure, etc.) has a one-tap plain-language explanation
  - Explanation stops appearing automatically once a user has demonstrated understanding (has not needed to tap it in its last 3 appearances)
- **Success metric:** Support/feedback mentions of "I don't understand this term" drop to near zero within one month of ship

### R1.5 — Add a notification transparency log
- **Priority:** P2
- **Effort:** S
- **Dependencies:** None
- **Expected user impact:** Users can always answer "why did I get this" by reviewing a visible, editable history of everything the app has ever sent them
- **Expected business impact:** Removes one of the most common causes of notification distrust and opt-outs before it has a chance to compound
- **Acceptance criteria:**
  - Every notification sent is visible, with its reason, inside a persistent in-app log
  - Users can mute a specific category directly from the log
- **Success metric:** Notification opt-out rate stays below a defined threshold (baseline TBD at ship) over the following 60 days

---

## Release 2 — The 90-Second Daily Habit

**Goal:** A user opens the app once a day, gets a clear answer, and leaves satisfied in under two minutes — the actual daily-use objective this entire backlog exists to hit.

### R2.1 — Redesign Home around "do I need to do anything today"
- **Priority:** P0
- **Effort:** M
- **Dependencies:** R0.1, R0.3
- **Expected user impact:** One glance answers the single question every user opens the app to ask
- **Expected business impact:** This is the screen that decides whether tomorrow's open happens; it is the highest-leverage screen in the product
- **Acceptance criteria:**
  - Home shows exactly one primary headline item and a maximum of one secondary action, per `DESIGN_SYSTEM_V2.md` §20
  - Median time-to-first-meaningful-content under 2 seconds
- **Success metric:** Median session-to-satisfied-close time under 90 seconds

### R2.2 — Cap and rank the Daily Feed
- **Priority:** P1
- **Effort:** M
- **Dependencies:** R2.1
- **Expected user impact:** A short, high-quality, honestly-ranked feed instead of an unbounded scroll — quantity is never mistaken for value
- **Expected business impact:** Directly reduces cognitive load and abandonment; a shorter, better feed retains better than a longer, padded one in this category
- **Acceptance criteria:**
  - Feed never requires more than one and a half screen-heights of scrolling on a standard device
  - Items are ranked by real relevance to the user's own holdings/watchlist/stated interests, not recency alone
- **Success metric:** % of feed sessions that reach the end of the feed (rather than abandoning mid-scroll) increases measurably post-ship

### R2.3 — Ship a single, user-controlled daily notification
- **Priority:** P1
- **Effort:** S
- **Dependencies:** R1.5
- **Expected user impact:** One respectful, specific notification at a time the user picked, containing the actual headline, never a generic "come back" ping
- **Expected business impact:** This is the mechanical trigger for the entire daily habit loop; without it, the habit depends entirely on the user remembering to open the app unprompted
- **Acceptance criteria:**
  - User selects their preferred notification time during onboarding or settings
  - Notification content states the actual insight, not a teaser
- **Success metric:** ≥50% opt-in rate; ≥60% open rate on sent notifications within 30 days

### R2.4 — Ship the honest "nothing urgent today" state
- **Priority:** P1
- **Effort:** XS
- **Dependencies:** R2.1
- **Expected user impact:** On quiet days, users get a genuine, calm "nothing urgent" message plus one small piece of education — never a manufactured reason to open the app
- **Expected business impact:** This is a direct, visible proof point of the "no manufactured urgency" principle and a cheap, high-trust win
- **Acceptance criteria:**
  - On days with no material event for a given user, Home displays an explicit "nothing urgent" state, never a padded or invented headline
- **Success metric:** Zero user complaints of "clickbait" or manufactured urgency in feedback channels

### R2.5 — Add dismiss-with-reason on feed items
- **Priority:** P2
- **Effort:** S
- **Dependencies:** R2.2
- **Expected user impact:** Users can tell the app what wasn't useful, and feel heard doing it, instead of just scrolling past
- **Expected business impact:** Cheap, direct signal that improves feed relevance over time and gives users a sense of agency
- **Acceptance criteria:**
  - Every feed item can be dismissed with one of a small set of plain-language reasons ("not relevant to me," "already knew this," "too confusing")
- **Success metric:** ≥15% of feed items receive a dismiss action with a reason within 60 days

### R2.6 — Add weekend mode
- **Priority:** P2
- **Effort:** S
- **Dependencies:** R2.1
- **Expected user impact:** Weekends shift entirely to calm, educational content — no market-urgency framing when there's no live market to justify it
- **Expected business impact:** Protects the one guaranteed calm window in the week, reinforcing the platform's core promise rather than contradicting it two days out of seven
- **Acceptance criteria:**
  - Saturday/Sunday content never uses urgency language or implies a live market event
- **Success metric:** Weekend session satisfaction (self-reported or inferred from non-abandonment) at parity with weekday sessions

---

## Release 3 — Prove the Track Record

**Goal:** Users see the platform graded on a predictable, honest, monthly cadence — including its misses.

### R3.1 — Ship the Monthly Portfolio Review
- **Priority:** P0
- **Effort:** L
- **Dependencies:** R2.1
- **Expected user impact:** A dedicated, unhurried monthly surface showing what changed, what the platform got right and wrong, and an honest nudge to revisit goals if needed
- **Expected business impact:** Per `MOBILE_PRODUCT_MASTERPLAN.md` §8, this is the single most important trust-building surface in the product — it is where the platform is graded by its own past claims, in front of the user, on a fixed cadence
- **Acceptance criteria:**
  - Surfaces monthly, automatically, without requiring the user to seek it out
  - Includes at least one honestly-labeled incorrect or pending call whenever one exists, never only the correct ones
- **Success metric:** ≥50% of active users view the Monthly Review within the first 3 days of it becoming available each month

### R3.2 — Ship a visible calibration/track-record screen
- **Priority:** P1
- **Effort:** M
- **Dependencies:** R3.1
- **Expected user impact:** Users can see the platform's overall accuracy history at any time, not just once a month — including the misses, presented with the same visual weight as the wins
- **Expected business impact:** The single highest-leverage trust-building feature available per `MOBILE_PRODUCT_MASTERPLAN.md`'s ranked improvements; a durable differentiator no confidence-first competitor can easily copy without changing their own incentives
- **Acceptance criteria:**
  - A permanent, always-accessible screen shows historical accuracy, including incorrect calls, with no filtering toward only favorable results
- **Success metric:** Track-record screen is among the top 5 most-visited non-Home screens within 60 days of launch

### R3.3 — Add real portfolio exposure view
- **Priority:** P1
- **Effort:** M
- **Dependencies:** None
- **Expected user impact:** Users see their actual sector/concentration exposure, not a generic or placeholder breakdown — the honest risk picture promised in onboarding
- **Expected business impact:** Directly supports the "risk disclosed with the same weight as upside" principle; a portfolio screen that quietly understates real risk is a trust liability waiting to surface at the worst possible moment (a downturn)
- **Acceptance criteria:**
  - Exposure view reflects each holding's actual sector/theme relationships, not a fixed lookup table
  - Concentration risk crosses a visibly distinct threshold when a single position or correlated cluster exceeds a defined share of the portfolio
- **Success metric:** ≥30% of portfolio-screen visits include viewing the exposure breakdown, not just the price/return view

### R3.4 — Add theme-to-holdings mapping on the Themes screen
- **Priority:** P2
- **Effort:** S
- **Dependencies:** R3.3
- **Expected user impact:** Users following a theme (AI, Energy, etc.) can immediately see which of their own holdings are actually exposed to it
- **Expected business impact:** Converts an abstract, browsing-only screen into a personally relevant one, increasing the odds a Themes visit ends in a useful action
- **Acceptance criteria:**
  - Every followed theme shows a list of the user's own holdings/watchlist items exposed to it, with the degree of exposure
- **Success metric:** % of Themes-screen sessions that end with a watchlist or portfolio action increases measurably post-ship

### R3.5 — Add portfolio stress-test / scenario view
- **Priority:** P2
- **Effort:** M
- **Dependencies:** R3.3
- **Expected user impact:** Users can see, concretely, what a stated bear-case scenario would mean for their actual holdings, before it happens
- **Expected business impact:** A meaningful differentiator for the more experienced/self-directed user segment, and a genuine risk-education tool for beginners
- **Acceptance criteria:**
  - Users can run at least one scenario (a stated bear case for a theme or holding) and see its estimated portfolio-level impact
- **Success metric:** ≥10% of portfolio-screen users try the stress-test feature at least once within 90 days

---

## Release 4 — Make It Personal

**Goal:** Returning users have persistent, personal identity across devices and sessions, and families can use the product together.

### R4.1 — Add account creation / sign-in
- **Priority:** P0
- **Effort:** L
- **Dependencies:** R0.2 (must remain deferred until after first value, per onboarding design)
- **Expected user impact:** A user's watchlist, portfolio, and profile persist across devices and reinstalls instead of living in a single anonymous session
- **Expected business impact:** Nothing past this release (referral, family mode, cross-device continuity) is possible without this; it is the gating item for the entire second half of the roadmap
- **Acceptance criteria:**
  - Account creation happens after first value is shown (per R0.2), never before
  - A user's data survives a reinstall or new-device login with zero loss
- **Success metric:** ≥90% of onboarded users who reach day 7 have created a persistent account

### R4.2 — Add risk-tolerance/horizon drift check-ins
- **Priority:** P2
- **Effort:** S
- **Dependencies:** R4.1
- **Expected user impact:** Users are gently asked to confirm their risk/horizon profile still matches how they feel, triggered by real behavior signals, never on an arbitrary schedule
- **Expected business impact:** Keeps sizing and tone genuinely aligned to the user over time, preventing a slow drift into irrelevance that erodes trust quietly
- **Acceptance criteria:**
  - A check-in triggers when observed behavior (dismissals, watchlist changes) suggests a mismatch with the stated profile
  - Framed as a check-in, never a correction or criticism
- **Success metric:** ≥70% of triggered check-ins result in an explicit confirm-or-update action rather than being dismissed unanswered

### R4.3 — Add Family/Mentor Mode
- **Priority:** P1
- **Effort:** L
- **Dependencies:** R4.1
- **Expected user impact:** A parent or mentor can see a simplified, permissioned view of a teen's learning progress — never their raw financial data by default
- **Expected business impact:** Directly serves the underserved family/teen audience identified as the core long-term differentiator; a genuinely unique feature versus every competitor
- **Acceptance criteria:**
  - Mentor view requires explicit, mutual permission from both accounts
  - Shows learning/engagement progress, not raw portfolio data, unless the teen explicitly shares it
- **Success metric:** ≥25% of teen accounts created also link a mentor account within 30 days

### R4.4 — Add alternate tone/complexity modes
- **Priority:** P2
- **Effort:** M
- **Dependencies:** R1.4
- **Expected user impact:** A genuinely new investor and a lifelong self-directed investor can each get the depth and vocabulary that fits them, without either one feeling talked down to or lost
- **Expected business impact:** Widens the addressable audience (teens through retirees) without fragmenting the underlying evidence/confidence model, per the personalization principle
- **Acceptance criteria:**
  - Users can select a complexity/tone preference that changes vocabulary and explanation depth, never the underlying facts or confidence shown
- **Success metric:** ≥20% of users outside the default demographic (very new or very experienced) adopt an alternate mode when offered

### R4.5 — Add self-tuning notification cadence
- **Priority:** P3
- **Effort:** S
- **Dependencies:** R2.3, R4.1
- **Expected user impact:** Notification frequency adapts to how a specific user actually engages, always overridable by the user directly
- **Expected business impact:** Reduces the single biggest cause of notification fatigue and opt-out over the long run
- **Acceptance criteria:**
  - Cadence adjusts based on observed open/ignore patterns, with a visible, one-tap manual override at all times
- **Success metric:** Notification opt-out rate decreases relative to the fixed-cadence baseline from Release 2

---

## Release 5 — Earn the Referral

**Goal:** Trust that has already been earned converts into unprompted advocacy — never manufactured, never incentivized with cash.

### R5.1 — Add a trust-triggered referral moment
- **Priority:** P1
- **Effort:** S
- **Dependencies:** R3.1, R4.1
- **Expected user impact:** A referral prompt appears only after a real trust event (a graded-correct outcome, an explicit "this was helpful" action) — never a generic day-30 banner
- **Expected business impact:** The cheapest, highest-quality acquisition channel available, and the clearest real-world test of whether the trust strategy actually worked
- **Acceptance criteria:**
  - Referral prompt is never shown outside of a defined trust-trigger event
  - No cash or trade-related incentive is offered
- **Success metric:** Referral participation rate among users who've seen a triggering event is measurably higher than among users who haven't

### R5.2 — Add the annual "what we got right and wrong" report
- **Priority:** P2
- **Effort:** M
- **Dependencies:** R3.2
- **Expected user impact:** A yearly, anticipated, honest summary of the platform's own performance, misses included
- **Expected business impact:** A durable, shareable trust artifact and a natural, non-manufactured moment for organic word-of-mouth
- **Acceptance criteria:**
  - Report is generated automatically on a fixed annual cadence and is shareable by the user
- **Success metric:** Share rate of the annual report among users who view it

### R5.3 — Add a shared, anonymized community learning surface
- **Priority:** P2
- **Effort:** L
- **Dependencies:** R4.1
- **Expected user impact:** Users can see common questions/concepts other users found confusing, explained plainly — never a social feed, never comparative performance bragging
- **Expected business impact:** Builds community-driven retention without introducing the engagement-chasing dynamics the product explicitly rejects
- **Acceptance criteria:**
  - No individual portfolio, performance, or holding is ever shown to another user, under any setting
- **Success metric:** ≥15% of active users engage with the community surface at least once within 60 days

### R5.4 — Add a "why we disagree" collapsed affordance under recommendations
- **Priority:** P3
- **Effort:** M
- **Dependencies:** R0.3
- **Expected user impact:** Users who want it can see a brief, honest view of internal disagreement behind a recommendation — collapsed by default, never presented as a competing verdict
- **Expected business impact:** A small, earned-trust differentiator that never undermines the one-canonical-verdict rule established in Release 0
- **Acceptance criteria:**
  - Always collapsed by default; expanding it never changes or contradicts the one visible recommendation
- **Success metric:** ≥10% of recommendation views expand this affordance at least once

---

## Release 6 — Daily Convenience & Polish

**Goal:** Remove remaining friction for the user who has already built the daily habit — the reward for having earned their trust.

### R6.1 — Add a home-screen widget with one honest daily line
- **Priority:** P1
- **Effort:** S
- **Dependencies:** R2.1
- **Expected user impact:** The daily answer is visible without even opening the app
- **Expected business impact:** Reinforces the daily habit at essentially zero ongoing engagement cost, the opposite of a ticking-price widget designed to provoke anxiety
- **Acceptance criteria:**
  - Widget shows one plain-language line, never a raw, unexplained number
- **Success metric:** Widget-adopting users show higher day-30 retention than non-adopters

### R6.2 — Add lock-screen / glanceable summary
- **Priority:** P2
- **Effort:** S
- **Dependencies:** R6.1
- **Expected user impact:** The same daily answer, glanceable without unlocking the phone
- **Expected business impact:** Small, cheap convenience win that deepens the habit for already-retained users
- **Acceptance criteria:**
  - Content matches the widget's honesty and plain-language standard exactly
- **Success metric:** Adoption rate among users who already use the widget

### R6.3 — Ship dark mode
- **Priority:** P2
- **Effort:** M
- **Dependencies:** None
- **Expected user impact:** A genuinely designed dark mode (true semantic tokens, per `DESIGN_SYSTEM_V2.md` §9), not an inverted palette, for evening/bedtime use — a real use case per the daily habit loop
- **Expected business impact:** A frequently-requested, low-controversy polish item with direct daily-use relevance
- **Acceptance criteria:**
  - All screens and states (including evidence badges, confidence/uncertainty visualizations) are fully supported in dark mode, not just base UI chrome
- **Success metric:** % of evening sessions (post-8pm local time) using dark mode once available

### R6.4 — Ship the accessibility pass
- **Priority:** P1
- **Effort:** M
- **Dependencies:** None
- **Expected user impact:** Dynamic type, screen reader labels on every evidence/confidence element, and full color-independent legibility — directly serves the older-user segment core to the strategy
- **Expected business impact:** Expands the addressable audience and is a direct, measurable trust signal to an audience competitors routinely ignore
- **Acceptance criteria:**
  - Passes a standard accessibility audit (contrast, dynamic type reflow, screen-reader labeling) with zero critical failures
- **Success metric:** Session completion rate for users with accessibility settings enabled reaches parity with the general user base

### R6.5 — Add "what changed since I last looked" portfolio diff view
- **Priority:** P2
- **Effort:** S
- **Dependencies:** R3.3
- **Expected user impact:** Returning after any gap, users see exactly what changed since their last visit, not a wall of undifferentiated current-state data
- **Expected business impact:** Reduces re-orientation friction for less-frequent users, protecting retention for anyone who misses a few days
- **Acceptance criteria:**
  - Portfolio screen highlights specifically what changed since the user's last session, distinct from the current-state view
- **Success metric:** Returning-after-gap sessions (3+ days absent) show reduced time-to-first-action versus the undifferentiated baseline

### R6.6 — Add "second opinion" transparency mode
- **Priority:** P3
- **Effort:** M
- **Dependencies:** R1.1
- **Expected user impact:** Curious users can see how confident the platform would be with one fewer piece of evidence — a genuinely novel transparency feature
- **Expected business impact:** A distinctive, hard-to-copy trust feature for the most engaged, most skeptical user segment — exactly the users most likely to become long-term advocates
- **Acceptance criteria:**
  - Feature is opt-in, discoverable but never forced into the primary flow
- **Success metric:** Engagement rate among users who discover the feature, and downstream retention of that cohort versus the general base

---

## Explicitly Out of Scope for This Backlog

International expansion, multi-language support, public API/data export, and B2B2C/institutional partnerships are real, valuable ideas (see `GROWTH_PLAYBOOK.md`) but each depends on market research, localization decisions, or partnership groundwork that is not a pure user-facing execution task — they belong to a later growth-stage backlog, not this one. Nothing in Releases 0–6 depends on any of them, and none of them will meaningfully move daily-use adoption before the seven releases above do.
