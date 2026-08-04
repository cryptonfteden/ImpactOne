# VALUATION_AGENT.md — Phase VALUATION-AGENT-001

**Mission:** build the Valuation Intelligence Agent, implemented using the approved research documents (`VALUATION_RESEARCH.md`, `VALUATION_SCORING_MODEL.md`, `FAIR_VALUE_METHODOLOGY.md`) — a composite, multi-method Fair Value assessment (never a single metric), honest negative-earnings handling, a normalized output (Valuation Status, Estimated Fair Value, Fair Value Range, Attractive Range, High Margin of Safety, Confidence, Supporting Metrics, AI Summary), integrated with the Registry/Scheduler/Observability/Orchestrator, a provider abstraction, clean extension points for SEC EDGAR/Alpha Vantage/future providers, no UI, comprehensive tests.

---

## This phase's real starting point: three approved research documents

Unlike `OPTIONS-AGENT-001`/`EARNINGS-AGENT-001`, this phase did not start from a blank design — `VALUATION-RESEARCH-001` (a prior phase) produced three research documents this implementation follows directly: `VALUATION_RESEARCH.md` (formulas/data sources), `VALUATION_SCORING_MODEL.md` (confidence model, negative-earnings rules, sector normalization mechanics), `FAIR_VALUE_METHODOLOGY.md` (the Fair Value/Attractive-Range/High-Margin-of-Safety calculations and naming governance). Every module below implements one specific, named section of one of those documents — cited in its own file header.

## Design decision: upgrade, not duplicate (same precedent as OPTIONS/EARNINGS)

The `"valuation"` agent id has existed since `AGENT-ORCHESTRATOR-001` as an honest, inert stub. This phase upgrades it in place — same id, same registry slot, `metadata.name` updated to `"Valuation Intelligence Agent"`. Confirmed zero regression via the full pre-existing `registry.test.js` suite.

## What was built

New directory: `backend/services/domainAgents/valuationAgent/`.

| File | Implements | Responsibility |
|---|---|---|
| `valuationDataProvider.js` | `VALUATION_RESEARCH.md` §1/§10 | **The provider abstraction.** Real, default implementation reusing Finnhub's `/stock/metric?metric=all` and `/stock/profile2` — the exact endpoint `finnhubService.js` already calls, per the research's own recommendation to "audit and fully utilize" it rather than add a new vendor. Confirmed-real field names (`peTTM`, `finnhubIndustry`, etc.) are used directly; every other field name is tried against several documented real candidates via `extractFirstFinite()`, honestly `null` if none match — the exact field-name uncertainty the research itself repeatedly disclosed. |
| `peerGroupProvider.js` | `VALUATION_RESEARCH.md` §9, `VALUATION_SCORING_MODEL.md` §3 | The sector/peer-group abstraction `FAIR_VALUE_METHODOLOGY.md` §1.2 structurally requires (every implied-price formula needs a *sector-relative* multiple, never the company's own current one — that would be circular). Default implementation: a disclosed, hand-set, real (not fabricated) broad-market reference multiple set, explicitly labeled `source: "broad-market-reference"` and `peerGroupSize: 0` — honestly scoring 0 on the peer-group-quality confidence component, never presented as sector-specific. |
| `negativeEarningsHandler.js` | `VALUATION_SCORING_MODEL.md` §2 | The exact exclude-don't-compute rule for negative/unavailable EPS, EBITDA, FCF — every exclusion carries a real, disclosed reason (§2.4's `excludedMethods` requirement). |
| `impliedPriceCalculator.js` | `FAIR_VALUE_METHODOLOGY.md` §1.2 | The 7 implied-fair-price formulas exactly as tabled, including the EV/EBITDA→equity net-debt-per-share subtraction the research explicitly flags as "a step easy to omit." |
| `profileWeighting.js` | `FAIR_VALUE_METHODOLOGY.md` §1.3 | Classifies a company as `PROFITABLE_STABLE` / `UNPROFITABLE` / `ASSET_HEAVY` and returns the corresponding disclosed weight table. |
| `fairValueComposer.js` | `FAIR_VALUE_METHODOLOGY.md` §1.3 | Combines weighted implied prices into one `fairValueEstimate` + a real `fairValueRange` (min/max of contributing implied prices); computes `discountToFairValue`. |
| `confidenceModel.js` | `VALUATION_SCORING_MODEL.md` §1 | The exact 4-component `valuationConfidence` formula (`dataCompletenessScore*0.30 + methodAgreementScore*0.30 + peerGroupQualityScore*0.25 + earningsQualityScore*0.15`), every sub-score computed per the document's own disclosed formulas (including the single-method fixed-40 rule and the CoV-based agreement scaling). |
| `zoneClassifier.js` | `FAIR_VALUE_METHODOLOGY.md` §2/§3/§4 | The Attractive-Range/High-Margin-of-Safety gating (discount threshold + confidence floor + ROIC-vs-WACC value-trap gate + method-agreement gate for the stricter zone) — using this mission's own non-directive output names directly (§4's naming governance is already satisfied by the mission's own wording, discussed below). |
| `supportingMetrics.js` | Mission's "Explain which metrics contributed most" | Ranks the contributing methods by real weight share. |
| `aiSummary.js` | `FAIR_VALUE_METHODOLOGY.md` §4 | The 2-4 sentence summary — deterministic templating, not an LLM call, disclosed explicitly; never uses directive language. |
| `valuationAgent.js` | — | `generateReport(symbol, { provider, peerProvider })` — composes everything above. |

## Naming governance — already satisfied by this mission's own wording

`FAIR_VALUE_METHODOLOGY.md` §4 flags a real risk: "Buy Zone"/"Strong Buy Zone," read plainly, sound like a directive rather than a description of a price-to-estimate relationship — the exact mistake this codebase already found and fixed once (Phase E3.5's "Wall Street Analyst Consensus" relabeling). **This mission's own Output section already asks for non-directive names** — "Attractive Range" and "High Margin of Safety" — so no further relabeling was needed; the internal gating logic (`zoneClassifier.js`) implements exactly the Buy-Zone/Strong-Buy-Zone mechanics the research describes, surfaced under the mission's own already-safe field names. Confirmed by a dedicated test: the report's serialized JSON never contains `action`, `decision`, `verdict`, `recommendation`, or `finalDecision` (`canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`), and `aiSummary.js`'s output is tested to never contain the words "buy"/"sell".

## The normalized report shape

```js
{
  symbol: "NVDA",
  generatedAt: "2026-...",
  dataAvailable: true,
  unavailableReason: null,
  valuationStatus: "UNDERVALUED",       // UNDERVALUED | FAIRLY_VALUED | OVERVALUED | UNKNOWN
  estimatedFairValue: 118.40,
  unavailableForFairValueReason: null,   // set instead of a fair value when genuinely unresolvable
  fairValueRange: { low: 95.00, high: 140.00 },
  discountToFairValue: 0.24,
  attractiveRange: true,
  attractiveRangeCaveat: null,           // or an honest value-trap/data-gap caveat
  highMarginOfSafety: false,
  confidence: 62,
  confidenceComponents: { dataCompletenessScore: 100, methodAgreementScore: 78, peerGroupQualityScore: 0, earningsQualityScore: 90 },
  profile: "PROFITABLE_STABLE",
  sectorReferenceSource: "broad-market-reference",
  supportingMetrics: [ { method: "EV_EBITDA", impliedPrice: 130, weight: 1, contributionPercent: 20 }, ... ],
  excludedMethods: [],
  aiSummary: "At $95.20 against an estimated fair value of $118.40, this symbol is trading below its estimated fair value by roughly 20%. The EV/EBITDA method contributed most to this estimate (20% weight), alongside 6 other method(s). Confidence in this estimate is limited (62/100) — treat it as indicative only.",
  inputs: { /* the full ValuationMetrics this report was built from, for auditability */ },
}
```

Every field the mission's "Output" section named is present.

## Every mission metric — how each is handled

| Metric | Status |
|---|---|
| Trailing P/E | Real (Finnhub `peTTM`/`peAnnual`), excluded per §2 when trailing EPS ≤ 0. |
| Forward P/E | Real when Finnhub exposes a forward EPS/P/E field (uncertain field name, disclosed); excluded independently when forward EPS ≤ 0. |
| PEG | Derived from trailing P/E's growth rate; excluded whenever P/E is excluded, or growth is ≤ 0. |
| EV/EBITDA | Real, per-share EBITDA-based; converted to an implied equity price via real net-debt-per-share; excluded when EBITDA ≤ 0. |
| Price/Sales | Real revenue-per-share based; the primary fallback for unprofitable companies (almost always computable). |
| Price/Book | Real book-value-per-share based; excluded when book value ≤ 0; weighted heavily for `ASSET_HEAVY` (bank/insurance/financial) profiles. |
| Free Cash Flow Yield | Real FCF-per-share based; the single best fallback signal for negative-earnings companies per the research, included only when FCF is itself positive. |
| ROIC | Real when Finnhub exposes it (field name uncertain, disclosed); used **only** as the value-trap confidence/eligibility gate — never as a weighted price input, exactly as the research requires. |
| Sector-relative valuation | **Partially real, honestly disclosed.** Every implied price is computed against a *reference* multiple (real, disclosed, broad-market — see "Honest limitations" below), not the company's own current multiple. A genuine sector-specific peer group is a documented, not-yet-connected extension point. |

## Requirements — confirmed met

- **"Implement a composite Fair Value model. Never rely on a single metric."** — `fairValueComposer.js` always blends every usable, weighted method; a test proves a fully healthy company produces 7 real contributing methods, never one.
- **"Negative earnings: do NOT calculate meaningless P/E values. Automatically switch to FCF Yield / EV-EBITDA / Price-Sales / Price-Book."** — `negativeEarningsHandler.js` + `profileWeighting.js`'s `UNPROFITABLE` weight table (P/E and PEG weight 0, weight shifts to P/S/FCF-Yield/EV-EBITDA/P-B); a dedicated integration test proves this end-to-end.
- **"Return honest 'Insufficient Data' where appropriate."** — three distinct honest-empty paths, each tested: no data source connected (`dataAvailable: false`), a genuinely unresolvable company with zero usable methods (`unavailableForFairValueReason` set, `VALUATION_SCORING_MODEL.md` §2.3's pre-revenue-biotech case), and per-method exclusion reasons always itemized (§2.4).

## Compatibility with the existing Agent Platform — verified, not assumed

Registry auto-registration (no longer a stub), real orchestrator execution, real scheduler health-cache reuse, real observability recording — all confirmed by a dedicated full-stack integration test suite, mirroring `OPTIONS-AGENT-001`/`EARNINGS-AGENT-001`'s own equivalent tests exactly.

## Tests

**101 new tests, all passing:**
- `negativeEarningsHandler.test.js` (10), `profileWeighting.test.js` (7), `impliedPriceCalculator.test.js` (11), `fairValueComposer.test.js` (9), `confidenceModel.test.js` (10), `zoneClassifier.test.js` (16), `supportingMetrics.test.js` (4), `aiSummary.test.js` (9), `peerGroupProvider.test.js` (5), `valuationDataProvider.test.js` (5, including a real Postgres-free live-call attempt and a forced-network-failure graceful-degradation test), `valuationAgent.test.js` (7, including a forbidden-governance-key scan and an end-to-end negative-earnings scenario), `valuationAgent.orchestratorIntegration.test.js` (5), plus 3 new smoke tests added to the existing `realAgents.test.js`.

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **1417 tests, 1415 passing, 2 failing** — the same two pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes identified across `AGENT-OBSERVABILITY-001`, `AGENT-SCHEDULER-001`, `PLATFORM-HARDENING-001`, `OPTIONS-AGENT-001`, and `EARNINGS-AGENT-001` (a real-time-based TTL/expiry assertion, in a file this phase never touched). Zero new failures. The frontend production build was re-verified green (backend-only phase).

## Honest limitations, disclosed rather than hidden

1. **No real sector-specific peer group is connected.** The default `peerGroupProvider.js` uses a disclosed, hand-set, real (not fabricated) *broad-market* reference multiple set — explicitly not sector-specific — which is precisely why it scores `peerGroupQualityScore: 0`, honestly discounting confidence rather than presenting a sector-blind comparison as if it were sector-aware. The mission's own explicit "prepare clean extension points" requirement is satisfied: `getSectorReference(industry)` is a documented, swappable interface ready for SEC EDGAR, Alpha Vantage, the Damodaran dataset, or this platform's own tracked-symbol universe (none built this phase, per the mission's own scoping of those as future extension points, not present-phase deliverables).
2. **Several Finnhub field names (P/S, P/B, EV/EBITDA, ROIC, forward EPS) were not independently re-verified live against Finnhub's current API docs** — the exact uncertainty `VALUATION_RESEARCH.md` itself disclosed twice. `extractFirstFinite()`'s multi-candidate approach defends against a wrong single guess; a field that genuinely doesn't exist under any tried name honestly returns `null`, feeding this agent's existing negative/missing-data handling rather than crashing or fabricating.
3. **`earningsQualityScore`'s `largeOneTimeItemFlag` and `gaapAdjustedEpsDivergenceFlag` are always `false`** — no data source for either exists in this environment; only the real, computable `negativeEarningsFlag` component is live. Disclosed directly in `confidenceModel.js`'s own header comment.
4. **The WACC proxy is one flat, disclosed constant (8%), not sector-specific** — `VALUATION_RESEARCH.md` §8 itself acknowledges a full per-company CAPM computation is out of scope for an MVP and recommends a sector-average proxy; without the Damodaran dataset connected, this phase uses one hand-set approximation instead, clearly labeled as such.
5. **`MINIMUM_METHOD_AGREEMENT_FOR_HIGH_MARGIN_OF_SAFETY` (60) is a disclosed, hand-set threshold**, since `FAIR_VALUE_METHODOLOGY.md` §3.1 describes the requirement qualitatively ("reasonably close") without a specific number.
6. **Full DCF is explicitly out of scope**, per `FAIR_VALUE_METHODOLOGY.md` §1.4's own recommendation — this agent implements the multiples-composite approach only.

## Files changed

- New: `backend/services/domainAgents/valuationAgent/{valuationDataProvider,peerGroupProvider,negativeEarningsHandler,impliedPriceCalculator,profileWeighting,fairValueComposer,confidenceModel,zoneClassifier,supportingMetrics,aiSummary,valuationAgent}.js` + matching `.test.js` files, plus `valuationAgent.orchestratorIntegration.test.js`.
- Modified: `backend/services/agentOrchestrator/agents/valuationAgent.js` (stub → real; same id, same 4-member Agent interface).
- Modified: `backend/services/agentOrchestrator/agents/realAgents.test.js` (extended to smoke-test the valuation agent alongside the existing four, non-destructively).
- Unmodified: `finnhubService.js`, `alphaVantageService.js` (explicitly NOT reused for its existing undisclosed-fallback-data anti-pattern, per `VALUATION_RESEARCH.md` §1's own warning), `agentOrchestrator.js`, `agentScheduler.js`, `agentObservability`, every other agent.
