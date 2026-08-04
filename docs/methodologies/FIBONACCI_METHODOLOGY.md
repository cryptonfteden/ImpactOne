# Fibonacci Methodology — Signal Weighting, Freshness Model, False-Positive Reduction

**Phase:** FIBONACCI-RESEARCH-001. Pure research/design — no production code was written. Companion to `FIBONACCI_RESEARCH.md` (research) and `FIBONACCI_SCORING_MODEL.md` (the 5 defined scores) — this document is the "Recommend" deliverable, directly reusing this engagement's already-established patterns from `TECHNICAL_SIGNAL_PRIORITY.md` (the immediately preceding, same-engagement research) rather than inventing parallel conventions for a domain that is, architecturally, a specialization of the same Technical Agent infrastructure.

---

## 1. Signal weighting

### 1.1 Retracement vs. extension — different weight, different purpose

```
FibonacciSignalWeight(analysisType) =
    retracement: full weight as a pullback/continuation-context signal
                 — the primary, most-established use of Fibonacci
                   analysis, and should carry the greater share of
                   whatever composite "structure family" weighting
                   TECHNICAL_SCORING_MODEL.md §1 already assigns to
                   fibonacciRetracement (currently the lowest-weighted
                   member of the Structure family, at 0.15, specifically
                   because — per TECHNICAL_METHODOLOGY.md §7's own
                   finding — it "currently only reports LEVELS_COMPUTED/
                   UNKNOWN with no real directional signal of its own")
    extension:   a secondary, lower-weighted signal — extensions are
                 inherently more speculative (projecting price INTO
                 territory it has not yet reached, as opposed to a
                 retracement's levels, which sit within the already-
                 traded range) and should be weighted accordingly, both
                 within the Fibonacci Agent's own internal reporting and
                 wherever it feeds the Technical Agent's Structure family
```

- **This directly motivates upgrading `fibonacciRetracement`'s current 0.15 within-family weight (per `TECHNICAL_SIGNAL_PRIORITY.md` §1) once the real directional/anchor-quality logic in this research is implemented** — the current low weight was an honest, correct reflection of a signal with no real directional content; a genuinely anchor-validated, trend-aligned, confluence-scored Fibonacci signal is materially more informative and should be re-weighted upward accordingly, but only once the underlying analysis actually earns that weight (never re-weight the display before the substance improves).

### 1.2 Confluence-source weighting — reused directly from `FIBONACCI_SCORING_MODEL.md` §1

The `sourceWeight` table already defined there (other-timeframe Fibonacci level: 30; support/resistance pivot: 25; moving average: 20; round number: 10) **is** this document's signal-weighting recommendation for confluence sources — not repeated in full here to avoid duplication, cross-referenced instead, consistent with this whole 3-document set's own internal-consistency discipline.

---

## 2. Freshness model

### 2.1 Two genuinely different freshness questions, not one

Fibonacci analysis has **two distinct freshness dimensions**, more than most other signals this engagement has designed freshness models for (`TECHNICAL_SIGNAL_PRIORITY.md` §4 had one axis per indicator family; this domain genuinely needs two, stated explicitly rather than conflated):

1. **Anchor freshness** — how long ago the underlying swing (the anchor pair) actually completed — already specified as `recencyScore` within `SwingQualityScore` (`FIBONACCI_SCORING_MODEL.md` §3). This answers *"is the swing this analysis is built on still a relevant, recent price event?"*
2. **Bar-data freshness** — how current the underlying price bars themselves are (the same concept every other Technical Agent signal already tracks via the shared `freshness` object, per `TECHNICAL_METHODOLOGY.md` §1) — answering *"is this analysis computed from today's real market data, or from a stale/delayed feed?"*

```
FibonacciDataFreshnessDecay = the SAME per-family decay function already
    designed in TECHNICAL_SIGNAL_PRIORITY.md §4.2 — Fibonacci belongs to
    the "Structure" family alongside breakout and support/resistance,
    with the SAME proposed expectedSignalHalfLifeDays (1-2 days) already
    assigned to that family, since a Fibonacci level's practical
    relevance to CURRENT price action is just as time-sensitive as a
    breakout's — reused directly, not re-derived, exactly the same
    "one shared per-family model, not a bespoke one per indicator"
    principle already established in that document
```

- **`recencyScore` (anchor freshness) and `FibonacciDataFreshnessDecay` (bar-data freshness) are deliberately kept as two separate inputs, feeding different parts of the overall model** — `recencyScore` feeds `SwingQualityScore` (`FIBONACCI_SCORING_MODEL.md` §3, a property of the *analysis itself*), while `FibonacciDataFreshnessDecay` feeds `FibonacciConfidence`'s own `freshnessScore` term (§2 of that document, a property of the *underlying data*) — conflating them would obscure a real, useful distinction: an analysis can be built on perfectly fresh, up-to-date market data (`FibonacciDataFreshnessDecay` = 1) while still being anchored to an aging swing (`recencyScore` declining), and a user should be able to tell these two facts apart rather than see one blended number.

---

## 3. False-positive reduction

### 3.1 The single highest-leverage recommendation: don't anchor without a real, size-qualifying, trend-validated swing

Per `FIBONACCI_RESEARCH.md` §1-2 and §7: the current naive 60-bar max/min anchor selection is itself the largest false-positive source in today's implementation — it will happily produce a "Fibonacci retracement" from two price points that do not represent a genuine, coherent, tradeable swing at all (e.g., two unrelated local extremes from disconnected price moves that both happened to fall inside the same fixed window). **Requiring the ZigZag-style minimum-size filter (§1) and the ADX-based trend-validation gate (`FIBONACCI_SCORING_MODEL.md` §4's `adxFloorGate`) before ANY Fibonacci analysis is reported at all** is the single most important false-positive-reduction recommendation in this whole research — better to honestly report "no qualifying swing found" (a real, disclosed `insufficientSwingQuality` result, consistent with this platform's established "never fabricate from insufficient data" discipline) than to compute misleading levels from an arbitrary, non-qualifying price range.

### 3.2 Reuse, don't reinvent, the existing failed-breakout/failed-hold logic

Per `FIBONACCI_RESEARCH.md` §8: rather than writing a third, Fibonacci-specific implementation of "did a level-piercing move actually hold," extract the Technical Agent's own real, already-working retrospective check (`analyzeBreakout()`'s genuine `FAILED_BREAKOUT` logic) into one shared helper, parameterized by "the price level in question," reused by support/resistance, breakout, and Fibonacci alike. This is simultaneously a false-positive-reduction recommendation (a Fibonacci level that was pierced and immediately reverted should not be reported as "held" at full confidence) and an architecture recommendation (avoiding a third near-duplicate implementation of the same underlying concept).

### 3.3 Confluence-cluster double-counting (already addressed in the scoring model, restated here as a false-positive concern)

A cluster of several correlated, non-independent "confluence" sources (e.g., three different moving averages that happen to sit close together simply because they are all slow-moving averages of the same recent price history) should not be allowed to manufacture an artificially high `ConfluenceScore` — already handled via the capped, disclosed `sourceWeight`/`independenceDiscount` mechanism in `FIBONACCI_SCORING_MODEL.md` §1, restated here because an un-discounted confluence score is itself a real, concrete false-positive risk (a level that looks strongly corroborated purely because several correlated signals happened to coincide, not because genuinely independent evidence agrees).

### 3.4 Round-number confluence is real but should never be treated as strongly as price-structure-derived confluence

A Fibonacci level landing near a round psychological number (e.g., $100.00) is a real, disclosed, lower-weighted factor (already reflected in its low `sourceWeight` of 10 in `FIBONACCI_SCORING_MODEL.md` §1) — recommend this remain explicitly the lowest-weighted confluence category, since round-number effects are a genuine but comparatively weaker, less structurally-derived phenomenon than cross-timeframe Fibonacci agreement or a real support/resistance pivot, and over-weighting it risks manufacturing apparent confluence from mere numerical coincidence.

### 3.5 Never let extension levels (inherently more speculative, per §1.1) present at the same confidence as retracement levels

Since extensions project price into territory it has not yet visited (as opposed to retracements, whose levels sit within already-traded range), recommend an explicit, disclosed confidence ceiling for extension-derived signals — proposed: extension-level confidence should never exceed the confidence of the retracement analysis it's built from (the same "a lower-tier or more-speculative signal caps rather than silently equals a more-grounded one" principle already used throughout this engagement, e.g. `OPTIONS_SCORING_MODEL.md`'s `provenanceCapAdjustment`).

---

## 4. Summary — concrete, actionable recommendations

1. Weight retracement signals higher than extension signals within the Fibonacci Agent's own reporting and within the Technical Agent's Structure family, re-earning (not pre-emptively assuming) a higher within-family weight than today's honest 0.15 once the real anchor/trend/confluence logic in this research set is actually implemented.
2. Track two genuinely distinct freshness dimensions (anchor recency vs. bar-data currency) rather than conflating them into one number, reusing the Structure family's existing 1-2-day half-life for the data-freshness axis.
3. Require a real, size-qualifying, ADX-trend-validated swing before reporting ANY Fibonacci analysis at all — the single highest-leverage false-positive-reduction step, with an honest `insufficientSwingQuality` result as the alternative to a misleading analysis built on an arbitrary price range.
4. Extract the existing failed-breakout/failed-hold retrospective check into one shared helper reused by support/resistance, breakout, and Fibonacci, rather than a third near-duplicate implementation.
5. Keep confluence-source weighting capped and correlation-discounted, with round-number confluence explicitly the lowest-weighted, least-structural category.
6. Cap extension-signal confidence at or below its underlying retracement analysis's own confidence, since extensions are inherently more speculative by construction.

No code was written to implement any of the above — this document, together with `FIBONACCI_RESEARCH.md` and `FIBONACCI_SCORING_MODEL.md`, is the design/decision record for whenever a real implementation phase begins, contingent on the separate, already-noted frontend governance gate (`overlayRegistry.js`'s `pendingApproval`) being resolved.
