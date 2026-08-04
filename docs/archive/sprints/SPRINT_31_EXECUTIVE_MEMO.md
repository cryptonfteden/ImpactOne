# Sprint 31 Executive Memo
## Office of the Chief Product Strategist — ImpactOne

---

## What Is the Single Biggest Bottleneck Preventing ImpactOne From Becoming the Default Investing App?

**Time itself, applied to an honest track record — not any single feature, bug, or growth tactic.** "Default app" status in this category is not won by a better interface, a cleverer feature, or a faster growth loop. It is won the same way Bloomberg became the default for institutions and TradingView became the default for chart-focused traders: by years of demonstrated, checkable reliability that no amount of marketing or funding can substitute for or accelerate. Every competitor in `COMPETITIVE_POSITIONING.md` that currently beats this platform on trust does so because they have had years, in some cases decades, of accumulated behavior to be judged by. ImpactOne has, as of today, zero years of a real, publicly gradable track record.

This reframes every other finding in this project's history correctly. The layout defect, the templated Daily Feed content, the false portfolio-overlap claim — these are not the bottleneck. They are preconditions that must be true before the actual bottleneck's clock can even start ticking. A platform that is unreachable or dishonest on a given day doesn't just lose that day — it delays the start of the multi-year accumulation that "default" status actually depends on. **The single biggest bottleneck is that this platform cannot yet point to years of honestly-graded history, and no decision available in the next twelve months can shortcut that — it can only be started sooner or later.** Every fix, every feature, every growth stage in every document this office has produced this year exists, ultimately, in service of starting that clock as early and as honestly as possible.

---

## What Should the Company Refuse to Build During the Next Year?

1. **Any real brokerage or trade-execution integration.** The advisory-only, structurally-enforced boundary is one of this platform's most durable trust assets precisely because it has never been crossed. There is no version of "just for users who ask for it" that doesn't put the entire trust model at risk a year before it has earned the track record to survive that risk.

2. **Any engagement-optimized gamification** — streaks tied to raw days-in-a-row rather than genuine learning milestones, badges, leaderboards, or anything that rewards checking the app more rather than understanding more. `RETENTION_SYSTEM.md` already names this category explicitly, and it remains the single most tempting shortcut available to any growth-pressured team.

3. **Any paid placement, sponsored content, or commercial relationship that could plausibly influence a ranking or a score**, even subtly, even for a well-intentioned partnership. A single instance of this discovered by a skeptical user would cost more trust than a year of otherwise-perfect execution could rebuild.

4. **Any unbounded, freeform "ask me anything" AI chat feature not tightly scoped to the platform's own evidence-grounded reasoning.** This is a specific, non-obvious refusal worth naming: an open-ended conversational feature is one of the most tempting things to build for engagement, and one of the easiest ways to accidentally let a model generate a fluent-sounding answer that isn't actually grounded in real evidence — a direct violation of `TRUTH.md`'s core rule that AI explains and synthesizes, never invents.

5. **Any institutional or professional-tier feature set.** `COMPETITIVE_POSITIONING.md` is explicit that Bloomberg's market is not this platform's market — building toward it now would dilute the beginner-and-family focus that is this platform's actual differentiated audience, a year before that focus has even had time to compound into the trust it depends on.

6. **International expansion.** Real localization means real, locally relevant evidence sources, not translated UI over the same US-only data — attempting it before the core product is trustworthy in its first market would spread a still-unproven foundation even thinner.

7. **Any second core scoring dial that competes with confidence and uncertainty for the user's attention.** Every future feature must fit inside the existing epistemic model (`TRUTH.md`, `EVIDENCE_QUALITY_MODEL.md`), never introduce a parallel one — a second "how sure are we" number, however well-intentioned, recreates the exact single-dial confusion this platform has spent its whole history trying to eliminate.

**The unifying principle behind this entire refusal list:** every item on it would trade a small amount of near-term growth, engagement, or revenue for a real risk to the one asset this company cannot rebuild quickly if damaged — the slowly-accumulating, honestly-earned track record that is the actual answer to the bottleneck named above.
