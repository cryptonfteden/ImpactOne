# Model Quality Review — Phase X10
## Recommendation Quality, Source Scoring, and Explainability Learning

Scope: three of the mission's seven named areas, evaluated purely on architectural merit, ignoring UI/implementation quality.

---

## 1. Recommendation Quality — "Can Every Recommendation Become Smarter?"

`computeQualityScore()` (`autonomousRecommendationEngine.js`) produces a real, traceable six-component score (`sourceQuality`, `evidenceFreshness`, `portfolioRelevance`, `evidenceAgreement`, `dataCompleteness`, `modelConfidence`) via fixed, documented weights (`QUALITY_WEIGHTS`). Each component is genuinely computed from real inputs — this is not a fabricated single opaque number, and `scoringVocabulary.js` documents the exact formula, range, and fallback for every one.

**But "smarter" requires the formula itself to change in response to being right or wrong, and it does not.** As established in `AI_LEARNING_REVIEW.md` §1, `outcomeGradingService.js` grades every recommendation's real-world result, and `calibrationReportService.js` can already tell you, per action-family, whether confidence is *over*- or *under*-calibrated against reality — but nothing reads that calibration signal back into `QUALITY_WEIGHTS` or `modelConfidence`. A `BUY` recommendation whose family has a demonstrated 30% real hit rate is scored by the exact same formula as one whose family hits 70% of the time.

Additionally, per repo history (Sprint D1 dataset audit), the underlying dataset itself has real integrity problems that would corrupt any future learning attempt built on it as-is: 76% exact-content duplicate recommendations, only 3 symbols ever represented (AAPL/NVDA/TSLA), and `benchmarkReturnPct`/`riskAdjustedReturnPct` populated on 0 of 96 graded outcomes as of that audit. A learning mechanism wired onto this specific historical data today would learn from noise, not signal — a second, independent reason recommendation quality cannot yet "become smarter" even if the wiring existed.

**Verdict: No.** The architecture for measuring quality is genuinely good; the architecture for *acting* on that measurement does not exist, and the historical data it would act on is not yet clean enough to trust if it did.

## 2. Source Scoring — "Can Weak News Sources Be Detected Automatically?"

`autonomousMarketService.sourceQualityScore(sourceName)` is the entire source-scoring mechanism in this codebase:

```js
const HIGH_QUALITY_NEWS_SOURCES = ["reuters", "bloomberg", "wall street journal", "wsj", "cnbc",
  "financial times", "associated press", "marketwatch"];
const DEFAULT_SOURCE_QUALITY_SCORE = 60;
const HIGH_SOURCE_QUALITY_SCORE = 95;
```

This is a **static, hand-curated 8-name allowlist**: known outlets score 95, literally everything else — a genuinely unreliable blog, a fabricated wire, or an actually-excellent niche analyst — scores the same flat default of 60. There is no mechanism anywhere that adjusts this score based on a source's own historical track record of being right or wrong, and no per-source accuracy ledger exists in the schema.

`providerHealthService.js` tracks something adjacent but different: `successRate` per registered provider, computed from the last 10 `ProviderRunLog` rows. This measures *whether a fetch technically succeeded*, not *whether the content was accurate or high-quality*. Per repo history (Sprint 43 audit), this distinction is not hypothetical: 14 of the platform's 15 registered "Continuous Intelligence Platform" providers are stub implementations that always return `[]` and are logged as `SUCCESS` — meaning `successRate` reads 100% for sources that have never returned a single real data point. A genuinely weak-but-technically-reachable source would score identically to a strong one under this mechanism.

**Verdict: No.** Source scoring today is a static reputation lookup table, not a learned or automatically-detected signal. A source that was reliable last year and has since become unreliable (or vice versa) would never have its score change.

## 3. Explainability Learning — "Can the AI Explain Why It Changed Its Behavior?"

Two distinct questions need separating here, and the codebase answers them very differently.

**"Can it explain one specific decision?"** — Yes, well. `decisionTraceExplainabilityService.js` (extended Sprint 42) assembles a real, honest bundle per recommendation: the original recommendation, committee debate, evidence, confidence calculation, and — once graded — the real final `Outcome` and recommendation lifecycle history. `DecisionTrace` rows are immutable by convention (no update path exists), so this per-decision trail is trustworthy and genuinely traceable end-to-end.

**"Can it explain why its own behavior changed over time?"** — No. There is no mechanism anywhere that records *why* a scoring weight, methodology version, or committee configuration changed. `METHODOLOGY_VERSION = "sprint29-v1"` and `BENCHMARK_PIPELINE_VERSION = "d1-v1"` are static string constants attached to output rows — they let you tag *which* version produced a given row, but there is no changelog, diff, or reasoned-narrative object anywhere recording *what changed between versions and why*. `QUALITY_WEIGHTS` is a hardcoded object with no version history at all; if it were edited tomorrow, nothing in the running system — not the API, not any dashboard, not any stored record — would ever surface that a change happened, let alone justify it.

**Verdict: Split.** Per-decision explainability is genuinely strong and a real differentiator. Per-*system*-behavior-change explainability — the meta-level "why did you start scoring things differently" — does not exist in any form.

## 4. Summary Table

| Question | Architecture Exists? | Wired to Actually Affect Output? | Verdict |
|---|---|---|---|
| Recommendation quality gets smarter over time | Measurement: yes. Feedback loop: no. | No | Not yet |
| Weak sources detected automatically | No — static allowlist only | N/A | No |
| System explains a single decision | Yes, genuinely strong | Yes | Yes |
| System explains why its own behavior/weights changed | No | N/A | No |
