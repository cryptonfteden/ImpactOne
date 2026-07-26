# Source Intelligence Critic Report
## Office of the Head of Market Intelligence & Source Integrity — ImpactOne

**Method:** A repository-level source-code audit (reading actual provider implementations, the provider registry, and the alt-data service directly — not inferring from documentation or naming) combined with a fresh live walkthrough tracing specific user-facing claims back to their code path. Per this review's own governing rule, **a source's name appearing in the repository was never treated as evidence that source is active.** Every claim below is either a direct code citation or a directly observed live behavior.

---

## 1. Verified Current Source Map

| Source (as registered in `providerRegistry.js`) | Actual Status | Evidence |
|---|---|---|
| Reuters/Bloomberg Wire | **Simulated / repurposed** — has a real `fetchImpl`, but it does not call any Reuters or Bloomberg API. It filters the *existing* news feed (`autonomousMarketService.getAutonomousOverview`) for items whose `sourceName` contains "reuters" or "bloomberg." | `reutersBloombergWireProvider.js`, code comment: "The one provider with a real fetchImpl this sprint... delegates to the existing news pipeline" |
| SEC | **Stub — disabled.** Returns `[]` always. | `secProvider.js` uses `honestStubFetch` |
| Reddit | **Stub — disabled.** Returns `[]` always. | `redditProvider.js` uses `honestStubFetch` |
| X (Twitter) | **Stub — disabled.** Returns `[]` always, despite being fully registered, rate-limited, and structurally valid. | `xProvider.js` uses `honestStubFetch` |
| Telegram | **Stub — disabled.** | `telegramProvider.js` |
| Polymarket | **Stub — disabled.** | `polymarketProvider.js` |
| Fed | **Stub — disabled.** | `fedProvider.js` |
| ECB | **Stub — disabled.** | `ecbProvider.js` |
| FOMC | **Stub — disabled.** | `fomcProvider.js` |
| FDA | **Stub — disabled.** | `fdaProvider.js` |
| NASA | **Stub — disabled.** | `nasaProvider.js` |
| Treasury | **Stub — disabled.** | `treasuryProvider.js` |
| Congress (trading) | **Stub — disabled.** | `congressProvider.js` |
| Earnings | **Stub — disabled.** | `earningsProvider.js` |
| Patent | **Stub — disabled.** | `patentProvider.js` |

**Fourteen of the fifteen registered providers return an empty array on every call, unconditionally.** This is disclosed honestly in the code itself (`honestStubFetch`'s comment: "Returns an empty array rather than fabricating placeholder events presented as real") — the engineering discipline here is genuinely good. But the practical result is that the "Continuous Intelligence Platform" provider framework, as registered today, produces real data from exactly **one** source, and even that one is a relabeling of an existing feed rather than a dedicated wire integration.

### Sources Outside the Provider Framework

| Source | Actual Status | Evidence |
|---|---|---|
| CFTC COT (Commitments of Traders) | **Genuinely live**, with a caveat. Makes a real HTTP call to `publicreporting.cftc.gov`, a real public government dataset, cached for 6 hours. | `altDataService.js: getCotData()` |
| CFTC COT fallback | **Fabricated, static numbers** activate silently on any fetch failure — specific-looking but hardcoded constants (e.g., `nonCommercialLong: 198533`), tagged `source: "fallback"` internally and cached for 45 minutes as if fresh. **Not confirmed whether this tag ever reaches the user-facing UI.** | `altDataService.js: fallbackCot()` |
| Equity options flow | **Honestly disclosed as not connected.** `buildOptionsPlaceholder()` returns the literal message "Options flow provider is not connected yet." | `altDataService.js` |
| Finviz | **Does not exist anywhere in this repository**, in any form — no stub, no reference, no mention. | Repository-wide search, zero matches |
| TipRanks | **Does not exist anywhere in this repository.** | Repository-wide search, zero matches |
| Zacks | **Does not exist anywhere in this repository.** | Repository-wide search, zero matches |
| SPDR (ETF flow data) | **Does not exist anywhere in this repository.** | Repository-wide search, zero matches |
| CoinGlass | **Does not exist anywhere in this repository.** | Repository-wide search, zero matches |
| Technical-analysis indicators | **Does not exist as a distinct source.** Only a raw 30-day price series is shown; no RSI/MACD/pattern-recognition signal was found anywhere in the backend. | Repository-wide search |
| Finnhub (quotes, analyst consensus, company profile) | **Genuinely live**, confirmed via a live walkthrough (real NVDA quote, market cap, P/E, 52-week range, and a real analyst buy/hold/sell tally that updated between two states — "40 Buy / 4 Hold / 1 Sell vs prior 39 Buy / 4 Hold / 1 Sell"). | Live walkthrough, AI Analysis screen |

### The Single Most Important Architectural Finding

The Daily Feed's headline catalog — including titles that sound alt-data-specific, such as **"COT positioning inflection," "Congress trading rotation," "Insider buying cluster,"** and **"Unusual options activity in semiconductors"** — are not derived from any live congressional-trading, insider-filing, or options-flow feed. They are **fixed, hardcoded strings** in a static scenario catalog (`autonomousMarketService.js`'s `AUTONOMOUS_SCAN_UNIVERSE` object) used to structure a generic market scan. A user reading "Unusual options activity in semiconductors" has no way to know this headline exists independent of any actual options data — especially since the options-flow provider is, elsewhere in the same codebase, honestly disclosed as "not connected yet." **This is a direct, reproducible provenance gap: a specific, specialized-sounding claim whose apparent source cannot be demonstrated.**

---

## 2. Source-by-Source Critique

### X / Twitter
- **Unique evidence:** Real-time reaction and breaking sentiment from specific accounts — genuinely unique if implemented.
- **Duplicates:** Overlaps entirely with the equally-stubbed Reddit provider today; conceptually overlaps with general news sentiment.
- **How it can mislead:** High — unverified claims, sarcasm, jokes, coordinated manipulation, and impersonation are endemic to this source class; per `EVIDENCE_QUALITY_MODEL.md`'s own six-class model this belongs at best in Crowd or Rumor tier, never treated as Primary.
- **Freshness:** Zero today (stub). Would be seconds-fresh if implemented.
- **Access/licensing:** Real and significant — API access at meaningful volume now carries substantial commercial cost.
- **First-five-user beta:** No — not functional today, and high misinterpretation risk for a beginner-first audience even if it were.
- **Should users see the provider name:** Yes, explicitly, with its tier disclosed, if ever activated.
- **Confidence influence:** Should only ever apply after heavy discounting and multi-account corroboration.
- **Verdict influence:** Must never move a canonical verdict independently.
- **Counter-evidence required:** Independent confirmation from a Primary or Secondary source before any X-derived claim contributes to a score.

### Finviz
- **Unique evidence:** Aggregated screener views, technical snapshots, ownership summaries — none of which exist in this codebase today.
- **Duplicates:** Would substantially overlap with the already-live Finnhub quote and analyst-consensus data.
- **How it can mislead:** Aggregates other analysts' opinions without transparent methodology; risks importing crowd consensus dressed as independent analysis.
- **Freshness:** Near-real-time for quotes, typically daily for aggregated ratings.
- **Licensing:** Finviz's terms restrict redistribution of its aggregated data; a real licensing risk if scraped rather than licensed.
- **First-five-user beta:** No — does not exist, and duplicates existing coverage.
- **Should users see the provider name:** Yes, if any specific Finviz-derived statistic is ever shown.
- **Confidence/verdict influence:** Should never independently move the canonical verdict — it is one level removed from primary evidence.

### TipRanks
- **Unique evidence:** An analyst-accuracy-weighted "Smart Score," insider/institutional tracking.
- **Duplicates:** Conceptually overlaps with Finnhub's already-live analyst-consensus data.
- **How it can mislead:** TipRanks' own scoring methodology is proprietary and opaque — importing it wholesale would import a second, black-box verdict alongside this platform's own, which directly conflicts with this platform's "no black-box confidence" standard.
- **Freshness:** Typically daily/weekly refresh, not real-time.
- **Licensing:** Commercial API, real per-call cost.
- **First-five-user beta:** No — structurally risky (a second verdict-shaped number) before it's even useful.
- **Should users see the provider name:** Yes, mandatorily, given its proprietary nature.
- **Confidence/verdict influence:** Corroborating only, never verdict-driving.

### Zacks
- **Unique evidence:** The Zacks Rank (a proprietary 1–5 quant ranking) and earnings-estimate-revision tracking.
- **Duplicates:** Conceptually overlaps with Finnhub's analyst data.
- **How it can mislead:** The Zacks Rank is itself a confident-sounding, single-number verdict — importing it risks recreating the exact two-verdict problem this platform has already had to fix once, in a new place.
- **Freshness:** Typically daily.
- **Licensing:** Commercial, real cost.
- **First-five-user beta:** No — direct verdict-collision risk.
- **Should users see the provider name:** Yes, mandatorily, and never under a heading that could be mistaken for this platform's own recommendation (see the AI Analysis finding in §6 below — this exact mislabeling risk was already observed live with Finnhub's own consensus data).
- **Confidence/verdict influence:** Never independently.

### SPDR (read here as sector-ETF flow data)
- **Unique evidence:** Real sector-rotation signal via fund inflows/outflows — a legitimate, distinct data type.
- **Duplicates:** Overlaps with the existing hardcoded "sector rotation" scenario headlines already present as static strings with no real flow data behind them.
- **How it can mislead:** Fund flows can reflect index-rebalancing mechanics rather than genuine sentiment; needs careful framing to avoid overstating conviction.
- **Freshness:** Typically end-of-day.
- **Licensing:** Real commercial redistribution terms apply.
- **First-five-user beta:** No — a reasonable later addition, not foundational.
- **Should users see the provider name:** Yes, if used.
- **Confidence/verdict influence:** Corroborating only.

### CFTC COT
- **Unique evidence:** Genuine institutional/speculative positioning data from a real, Primary-tier public government source — arguably the single most legitimate alt-data source on this list, and the only one of the ten actually wired to a real external API today.
- **Duplicates:** Nothing else in the current architecture.
- **How it can mislead:** COT data is structurally stale by design (weekly, reflecting the prior Tuesday's positions) — extreme positioning shown without an explicit staleness label can easily be misread as a live, current signal. The code's own fallback also silently substitutes fabricated numbers on any failure, with no confirmed user-facing disclosure of which state (real vs. fallback) is being shown.
- **Freshness:** Weekly at best; the fallback path's staleness is materially worse and currently undisclosed to the user.
- **Licensing:** None — fully public domain, a genuine strength.
- **First-five-user beta:** Internal-only for now, pending an explicit freshness/fallback disclosure fix — not yet ready to show unlabeled to real users.
- **Should users see the provider name:** Yes — this is exactly the kind of source that has earned the right to be named, once its freshness and fallback status are honestly surfaced.
- **Confidence influence:** Appropriate, given real government data, once freshness is disclosed.
- **Verdict influence:** Corroborating only, given known weekly staleness.
- **Counter-evidence required:** An explicit "as of [report date]" or "estimated, not live" label at the point of display.

### CoinGlass
- **Unique evidence:** Crypto derivatives positioning — funding rates, liquidation levels, open interest.
- **Duplicates:** Nothing currently, since crypto coverage today is minimal.
- **How it can mislead:** Severely, if mishandled — extreme leveraged positioning is a **fragility** signal (often preceding a reversal via liquidation cascade), not a confirming directional signal, and treating it as the latter is a well-known way retail traders get hurt.
- **Freshness:** Real-time if integrated.
- **Licensing:** Commercial tiers exist; free tier limited.
- **First-five-user beta:** No — squarely outside the circle of competence of a beginner-and-family-first audience, and a serious misinterpretation risk for exactly that audience.
- **Should users see the provider name:** Yes, mandatorily, given how easily misread this data type is.
- **Confidence/verdict influence:** Should never move a verdict directly; must always be paired with explicit fragility framing, never confirming framing.

### Equity options data
- **Unique evidence:** Implied positioning and hedging activity.
- **Duplicates:** The hardcoded "Unusual options activity in semiconductors" headline already implies this exists, creating a direct expectation mismatch with the honestly-disclosed "not connected yet" placeholder found elsewhere in the same codebase.
- **How it can mislead:** Severely — raw call/put volume without open-interest and hedging context is one of the most commonly misread retail signals (large call volume is frequently a hedge against a short position, not a bullish bet).
- **Freshness:** Real-time if built.
- **Licensing:** Real cost — OPRA-derived options data is expensive.
- **First-five-user beta:** No.
- **Should users see the provider name:** Yes, mandatorily.
- **Confidence/verdict influence:** Never alone.

### Technical-analysis data
- **Unique evidence:** Momentum/trend confirmation independent of narrative evidence.
- **Duplicates:** Would overlap with price data already implicit in existing scoring.
- **How it can mislead:** A "breakout on weak volume" is a textbook false-positive pattern that technical signals alone cannot distinguish from a real move without volume/context — exactly the kind of single-signal overconfidence this platform's whole philosophy exists to prevent.
- **Freshness:** Could be real-time, derived from the already-live price feed.
- **Licensing:** Low, if derived from data already licensed.
- **First-five-user beta:** Low priority — a reasonable future addition, not foundational.
- **Should users see the provider name:** Not applicable as a "provider," but the calculation methodology should be disclosed if ever surfaced.
- **Confidence/verdict influence:** Never the sole driver.

### Research and Trading Knowledge (the model's own general knowledge, used to generate explanations)
- **Unique evidence:** None — this is not evidence. It is a reasoning and explanation capability, structurally different from the nine sources above.
- **Duplicates:** Nothing; it sits in a different category entirely.
- **How it can mislead:** This is the **highest-risk item on this entire list**, structurally, because `TRUTH.md` §2 is explicit that "a model's own output is never, by itself, evidence for another model's conclusion" — and this review found a **live, currently-reproducible violation of exactly that rule**: the Daily Feed's "Potential portfolio impact: Portfolio overlap detected in AAPL, NVDA" claim, confirmed today against an account with zero real holdings, is precisely what happens when AI-generated synthesis is presented with the same confidence as fact-checked evidence.
- **Freshness:** Not applicable — this capability is not "fresh" or "stale," it is a presentation layer, and treating its output as if it had freshness or source credibility is itself a category error.
- **Licensing:** Not applicable.
- **First-five-user beta:** Already in constant, unavoidable use today — every explanation, historical-analogy comparison, and counter-evidence bullet observed in this review is presumably synthesized this way. The real question is not whether to activate it, but whether its output is ever mistaken for independent evidence — and this review found direct, live proof that it currently is.
- **Should users see the provider name:** Every sentence generated this way should be visually and structurally distinguishable from a sourced factual claim — this distinction was not observed anywhere in the live product during this review.
- **Confidence/verdict influence:** Should never independently justify a score. The false-overlap-claim finding is direct evidence this boundary is being crossed in production today, not a hypothetical risk.

---

## 3. Adversarial Scenarios — Does the Architecture Preserve Disagreement or Manufacture Confidence?

| Scenario | Finding |
|---|---|
| Influential person posts a false claim | Cannot occur via X today — the provider is a disabled stub. The risk is entirely latent, pending a real integration. |
| Elon Musk posts an ambiguous joke | Same as above — `EVIDENCE_QUALITY_MODEL.md`'s tiering design would classify this as Speculation/Rumor, but nothing in the live code path enforces this yet, since X returns nothing. |
| Political statement later reversed | The Recommendation/DecisionTrace `SUPERSEDED` pattern (confirmed live in a prior review — 44 dated, append-only supersession records for one symbol) suggests the append-only correction model is real at the recommendation level. Not independently confirmed at the raw-evidence level. |
| Finviz shows Strong Buy while Zacks shows Hold | Cannot occur — neither source exists. If both were added, `EVIDENCE_QUALITY_MODEL.md` §2.5's documented rule (preserve both, disclose the conflict, never silently pick one) is sound on paper but entirely unimplemented, since neither source exists to test it against. |
| Analyst target is six months old | Partially observed: the live Finnhub-derived "Recommendation" card does show a trend comparison ("Latest... vs prior..."), a good practice — but no explicit "as of [date]" freshness label was observed on the card itself. |
| Options call volume is actually hedging | Cannot occur — the options-flow provider is honestly disconnected. |
| Long/short ratio extremely bullish immediately before liquidation | Cannot occur — no leveraged-positioning data source (e.g., CoinGlass) exists. The closest live analog, CFTC COT, shares the same "extreme positioning could be about to reverse" risk, and the current fallback path adds no fragility-aware framing. |
| COT positioning is extreme but the report is stale | **Directly applicable and confirmed as a real, current gap** — no freshness/report-date label was found reaching the user for COT data, live or fallback. |
| Technical breakout occurs on weak volume | Cannot occur — no technical-analysis source exists. |
| Several sources all repeat the same original story | A live, testable risk given the architecture's reliance on one real news pipeline underneath the "Reuters/Bloomberg Wire" relabeling — cross-source independence (per `EVIDENCE_QUALITY_MODEL.md` §2.4) could not be confirmed as enforced, since 14 of 15 alt-data providers currently contribute no volume to test it against. |
| Ten weak signals appear to outweigh one strong contradictory fact | The documented design (`EVIDENCE_QUALITY_MODEL.md` §2.1/§2.4 — quality ceiling, not average) is sound, but with 14 of 15 alt-data providers empty, there is essentially no real multi-source volume in production today to verify this holds in practice. This must be explicitly re-verified before any new high-volume, low-tier source (X, Reddit, Telegram) is switched on. |

**Overall determination:** The *documented design* (`TRUTH.md`, `EVIDENCE_QUALITY_MODEL.md`) is genuinely built to preserve disagreement rather than manufacture confidence. The *live implementation* cannot yet be said to honor that design in practice, for the simple reason that almost none of the sources needed to test it are actually connected. The one place a specific, checkable, AI-synthesized claim about a user's own data is live in production today — the portfolio-overlap line — is a confirmed instance of manufactured, false confidence, not preserved disagreement. That single finding should outweigh every provider-activation decision on this list until it is fixed.

---

## 4. First-Five-User Source Recommendation

| Source | Daily usefulness | Trust value | Uniqueness | Implementation risk | Licensing risk | Confusion risk | Recommendation |
|---|---|---|---|---|---|---|---|
| Finnhub (quotes, analyst consensus, company profile) | High | High, once labeled correctly | Medium (already live) | Low (already built) | Low (already licensed) | Medium — must fix "Recommendation" mislabeling | **Activate now** (fix labeling first) |
| News (existing pipeline, incl. "Reuters/Bloomberg Wire" relabel) | High | Medium — needs per-article source links | Medium | Low | Low | Medium | **Activate now** (add real source links) |
| CFTC COT | Low-Medium for a beginner audience | High if freshness disclosed | High (genuinely primary, unique) | Low (already built) | None | Medium — weekly data easily misread as current | **Internal-only now** |
| X / Twitter | Low for this audience | Low until corroboration rules are enforced | High if ever built | High | High | High | **Defer** |
| Reddit / Telegram / Polymarket | Low for this audience | Low | Medium | High | Medium | High | **Defer** |
| Options flow | Low for this audience | N/A — honestly disconnected | High if built | High | High | High | **Defer** |
| CoinGlass | Very low for this audience | N/A — doesn't exist | High for crypto-specific users | High | Medium | Very high | **Reject** for the first cohort specifically (beginner/family audience) |
| Finviz / TipRanks / Zacks | Low — duplicates existing Finnhub coverage | Low — imports opaque third-party verdicts | Low | High | High | High | **Reject** |
| SPDR sector-flow data | Low for a first cohort | Medium | Medium | Medium | Medium | Medium | **Defer** |
| Technical-analysis indicators | Low for a first cohort | Medium | Low-Medium | Medium | Low | Medium | **Defer** |
| SEC/Fed/ECB/FOMC/Treasury/FDA/NASA/Congress/Earnings/Patent stubs | N/A — currently produce nothing | N/A | Would be high once real | Medium each | Low (mostly public data) | Low once real | **Defer** (activate individually, one at a time, each independently audited before going live) |

**Minimum useful source set for the first five users: Finnhub (fixed) plus the existing news pipeline (fixed), and nothing else new.** Every other source on this list either doesn't exist, is disabled, or carries a misinterpretation risk disproportionate to what a beginner-and-family-first cohort of five people needs on day one.

---

## 5. Onboarding Audit

A true first-run onboarding flow could not be independently re-triggered in this session — the available account is a persistent workspace with existing history (confirmed via the Profile screen's "Your progress" section showing "9 views earlier vs. 4 more recently" and "3 recorded so far" feedback entries), and no in-app path to replay onboarding from a genuinely blank state was found. This is disclosed here explicitly rather than fabricating tap counts for a flow that could not actually be walked through fresh in this session. **A dedicated fresh-account onboarding re-test is required before this section can be considered complete**, and is recommended as an immediate follow-up.

What could be observed: the Profile screen's Investment Profile content (a suggested stocks/bonds/cash split, an expected-volatility range, and an interactive compound-interest simulator) is clearly built from information onboarding is expected to collect (risk tolerance, horizon), and is well-labeled throughout as illustrative, not a forecast — a genuinely good, honest pattern consistent with this platform's stated principles.

---

## 6. User-Facing Evidence Audit

- **Where information came from:** Inconsistent. Only one Daily Feed item observed across multiple sessions has ever shown a clickable source link; the AI Analysis screen's "Recent news" headlines are not clickable at all — a user cannot verify a specific news claim by reaching its original article, only the company's own website via a separate "Visit website" link.
- **How fresh it is:** Inconsistent. Home shows an explicit "Updated this minute" label — good practice. The CFTC COT-derived content shows no freshness label at all, live or fallback.
- **Whether sources agree:** Cannot currently be evaluated by a user at all, since 14 of 15 alt-data providers produce no data to disagree or agree with.
- **Which evidence is strongest:** Not visually distinguished anywhere observed — a hardcoded scenario headline ("Unusual options activity in semiconductors," backed by nothing) and a live Finnhub quote figure are presented with identical visual weight and confidence styling.
- **What contradicts the conclusion:** Present and genuinely good on the Recommendations detail view (explicit "Counter-evidence" and "Would prove this wrong" sections, confirmed in a prior session) — not yet confirmed present on Home or AI Analysis.
- **Whether displayed data is live or simulated:** Not reliably distinguishable by a user anywhere in the product. A hardcoded scenario headline and a real Finnhub quote look identical in presentation.

**Flag: the AI Analysis screen creates sophistication without improving understanding.** Eight in-page sections, several showing simultaneous "still loading" placeholders, alongside a "Recommendation" card that is actually an unlabeled third-party analyst tally, add visual complexity without making it any clearer to a user which numbers are live, which are synthesized, and which are the platform's own canonical view.

---

## Critical Defects, With Reproduction Steps

### Defect 1 — False, specific personalized claim (Critical, longest-standing)
1. Confirm a test account has zero open portfolio positions and an empty watchlist (visible on the Portfolio screen: "no simulated trade has cleared the 75-confidence threshold yet").
2. Open the Feed tab.
3. Expand any item's "Evidence, reasoning & portfolio impact" section.
4. Observe: "Potential portfolio impact: Portfolio overlap detected in AAPL, NVDA" — a specific, false claim, reconfirmed live in this review.

### Defect 2 — Undisclosed provenance for specialized-sounding headlines
1. Open the Feed tab.
2. Observe a headline such as "Unusual options activity in semiconductors" or "Congress trading rotation."
3. Cross-reference against the backend: these strings originate from a hardcoded scenario catalog (`AUTONOMOUS_SCAN_UNIVERSE` in `autonomousMarketService.js`), not from any live options-flow or congressional-trading data feed — both of which are either non-existent or explicitly disconnected elsewhere in the same codebase.

### Defect 3 — Ambiguous "Recommendation" labeling on AI Analysis
1. Search any ticker (e.g., NVDA) via the global search bar.
2. Observe the "Recommendation" card, subtitled "Analyst posture," showing "Strong Buy."
3. Note that this is Finnhub's raw third-party analyst tally, not the platform's own canonical verdict — which, at the moment of observation, was still labeled "Generating..." further down the same page.

### Defect 4 — Undisclosed staleness on COT-derived data
1. Trace any COT-derived figure to `altDataService.js: getCotData()`.
2. Observe that both the live path (weekly-refreshed government data) and the fallback path (fabricated static numbers) return structurally identical shapes, with no freshness or "as of" date confirmed to reach the user-facing display.
