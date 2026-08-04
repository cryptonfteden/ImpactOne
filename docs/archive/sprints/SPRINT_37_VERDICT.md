# Sprint 37 Verdict
## Head of Market Intelligence & Source Integrity — ImpactOne

---

## Top Five Source Priorities

1. **Fix the "Recommendation" / "Analyst posture" labeling on AI Analysis** so a third-party analyst tally can never be mistaken for the platform's own canonical verdict.
2. **Add real, per-item source links across the Daily Feed and AI Analysis news**, not just the single instance currently observed — a user must be able to reach the original article for any claim shown.
3. **Add an explicit freshness/staleness label to CFTC COT data**, distinguishing live government data from the fallback path, both of which currently look identical to a user.
4. **Either connect the options-flow provider or remove options-flow-sounding headlines from the scenario catalog** — a headline like "Unusual options activity in semiconductors" should not exist while the underlying provider is honestly disclosed elsewhere as disconnected.
5. **Visually distinguish AI-synthesized explanation from sourced factual evidence everywhere in the product** — this is the root cause most likely responsible for the still-open false portfolio-overlap claim.

---

## Sources to Defer

X/Twitter, Reddit, Telegram, Polymarket, options flow, CoinGlass, Finviz, TipRanks, Zacks, SPDR sector-flow data, and technical-analysis indicators. None of these are needed for the first five users; several (CoinGlass, options flow, X) carry misinterpretation risk disproportionate to a beginner-and-family-first cohort; Finviz/TipRanks/Zacks specifically risk re-creating a second, competing verdict this platform has already had to fix once before. The Fed/ECB/FOMC/Treasury/FDA/NASA/SEC/Congress/Earnings/Patent provider stubs should be activated individually, one at a time, each independently audited before going live — never as a batch.

---

## Must-Fix Trust Issues

- The false, specific "Portfolio overlap detected in AAPL, NVDA" claim, reconfirmed live in this review against a verified zero-holdings account.
- The undisclosed provenance gap for specialized-sounding scenario headlines ("Unusual options activity...," "Congress trading rotation...") that trace to a hardcoded catalog, not a real data feed.
- The ambiguous "Recommendation" heading on AI Analysis actually displaying an unlabeled third-party analyst consensus.
- The CFTC COT fallback path returning fabricated, static numbers with no confirmed user-facing disclosure of live-vs-fallback status.

---

## Onboarding Verdict

**Inconclusive — not independently re-testable this session.** The available account carries existing history and no in-app path to a genuinely fresh first-run state was found. This finding is reported honestly rather than fabricated; a dedicated fresh-account onboarding walkthrough is required before a real verdict can be issued.

---

## Current Source Transparency Score: 3 / 10

Genuine strengths exist and are counted: the engineering discipline behind `honestStubFetch` (an empty array, never a fabricated placeholder, for disabled providers) and the honestly-disclosed options-flow placeholder are both real, good-faith transparency practices. The score is held down by three confirmed, user-facing failures: a false personalized claim, unexplained specialized-sounding headlines with no real source behind them, and a third-party statistic displayed under a heading that invites confusion with the platform's own verdict.

---

## Is the New Architecture Safe to Expose to Five Beta Users?

**Not yet, using only what exists today.** The provider framework itself is well-engineered and honestly self-disclosing at the code level — that is a real asset. But the specific, user-visible consequence of the gap between what's registered and what's actually live is a reproducible false claim about a user's own account, and an unexplained provenance gap on headlines that sound like they come from specialized sources they don't actually come from. Neither requires activating a single new source to fix — both are corrections to what's already shown. Once those two are closed and verified live, the minimal source set recommended here (Finnhub plus the existing news pipeline, nothing new) is safe for a first cohort of five.
