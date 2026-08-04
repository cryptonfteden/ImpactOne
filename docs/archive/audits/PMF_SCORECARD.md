# Product-Market Fit Scorecard — Phase G2

CEO framing, not an engineering document. The question isn't "does the software work" — Phases D–F already answered that. The question is: what evidence, at each user-count stage, earns the right to go to the next one. Each stage is a gate, not a milestone to celebrate on its own.

## Stage: 5 → 50 users

1. **Required user behavior:** unprompted return visits — users open the app on their own, without a founder WhatsApp nudge. At 5 users this can be manually observed; at 50 it must be visible in the data, not anecdote.
2. **Required engagement:** at least a third of active users touch more than one core screen (Recommendations + Portfolio, or Recommendations + AI Analysis) in the same week — proof the product is a workflow, not a single feature people peek at once.
3. **Required trust:** zero unresolved trust-breaking incidents (per `SUCCESS_METRICS.md`'s definition) carried over from the 5-user beta, and no new one introduced in the first 50-user cohort.
4. **Required recommendation quality:** the per-recommendation feedback mechanism (already shipped) shows a real, non-trivial positive-to-negative ratio — not zero negative feedback (that would suggest no one is reading closely enough to disagree), but a ratio a reasonable person would call "mostly useful."
5. **Required retention:** Day-7 retention holds at roughly the same rate observed in the 5-user beta, or better — if it drops materially just from adding 45 strangers instead of personally-onboarded friends, that's the real signal, not the raw number.
6. **Required willingness-to-pay:** none required yet. At this stage, willingness-to-pay is measured as a *stated* signal only — would users be upset if it went away, would they recommend it unprompted — not an actual transaction.

## Stage: 50 → 500 users

1. **Required user behavior:** a visible portion of new users arrive via referral, not founder-sourced invites — the first real evidence the product sells itself rather than the founder's relationships.
2. **Required engagement:** a stable daily/weekly active ratio that doesn't require manual per-user attention to sustain (the 5-user founder-WhatsApp model does not scale to 500; if engagement was propped up by personal outreach, it will collapse here).
3. **Required trust:** the product survives strangers, not just people who trust the founder personally — meaningfully lower tolerance for ambiguity, honest empty states, or "beta" framing softening a rough edge.
4. **Required recommendation quality:** quality signal must hold or improve at 10x the user count and 10x the diversity of portfolios/watchlists — a model that only looked good against 5 hand-picked friends' portfolios is not yet proven.
5. **Required retention:** a real Day-30 retention number exists and is defensible — Day-7 alone stops being sufficient evidence at this scale.
6. **Required willingness-to-pay:** first real signal — a waitlist for a paid tier, or a direct ask ("would you pay $X/month") with a genuine yes rate, even if no money has changed hands yet.

## Stage: 500 → 5,000 users

1. **Required user behavior:** the product has a repeatable, describable "why people come back" — not five different idiosyncratic reasons, one coherent story a stranger could explain to another stranger.
2. **Required engagement:** engagement segments cleanly by user type (e.g. new investors vs. experienced) — proof the product serves a real, definable market, not a lucky cluster of early adopters who all happened to like the same thing.
3. **Required trust:** third-party evidence of trust — reviews, testimonials, unsolicited social mentions — not just internal retention numbers, which can be gamed by habit loops without real conviction behind them.
4. **Required recommendation quality:** calibration data (already partially instrumented — `calibrationReportApi`, Phase 31/D1) shows real, statistically meaningful accuracy by recommendation family, not just "users like it."
5. **Required retention:** cohort retention curves flatten at a real, non-zero floor — the classic PMF signature — rather than decaying toward zero, at this scale and across multiple monthly cohorts.
6. **Required willingness-to-pay:** actual revenue. At 5,000 users, "would pay" is no longer sufficient evidence — some real, non-trivial fraction must actually be paying, or converting from a genuine paid trial.

## What This Scorecard Deliberately Refuses to Do

It does not treat user-count growth itself as evidence of anything. Five thousand people can sign up for something free that few of them use. Every stage gate above is about *behavior after the free trial-and-forget instinct has had time to wear off*, not acquisition. See `SCALING_GATES.md` for the hard go/no-go thresholds this scorecard implies, and `ONE_METRIC_THAT_MATTERS.md` for the single number that overrides all of the above if it disagrees.
