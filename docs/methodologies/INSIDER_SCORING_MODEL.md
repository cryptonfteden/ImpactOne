# Insider Scoring Model — Insider Score, Executive Score, Cluster Score, Ownership Score, Confidence Model, Freshness Model

**Phase:** INSIDER-RESEARCH-001. Pure research/design — no production code was written. Every formula below is grounded in `INSIDER_RESEARCH.md`'s findings — most importantly, the real SEC transaction-code discipline (§5) and the well-established academic asymmetry between purchases and sales (§8). Bound by the same governance as every other agent in this platform (`canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`): every score below is evidence, never a verdict, and must never itself set or override `Recommendation.action`.

---

## 1. Insider Score (0-100, with an explicit signed lean reported alongside)

**What it measures:** the overall magnitude of well-supported insider-trading evidence for a symbol, across all filers and transaction types — the headline composite.

```
InsiderScore = clamp(
    executiveScoreComponent * 0.40
  + clusterScoreComponent    * 0.35
  + ownershipScoreComponent  * 0.25
  , 0, 100)          — a magnitude-only composite; a SEPARATE signed
                        field (insiderLean, in [-1,+1]) reports whether
                        the underlying evidence leans toward net buying
                        or net selling, reusing the same magnitude-vs-
                        direction separation established platform-wide
                        (ExecutionPressure, TrendAlignment, Claim Layer
                        confidence-vs-probability)
```

- **Only `P`- and `S`-coded transactions (real, discretionary open-market activity, per `INSIDER_RESEARCH.md` §5) contribute to this score at all.** `A`/`M`/`F`/`G`/`C`-coded transactions (grants, option exercises, tax withholding, gifts, conversions) are **excluded entirely from the score**, not down-weighted — including them at any weight would misrepresent routine compensation mechanics as market-moving discretionary activity, the single most important false-positive guard in this whole model. They remain visible in the underlying evidence/explanation (never silently hidden — the same "disclose, don't hide" discipline this whole engagement applies everywhere), just never contribute to the numeric score.
- **`insiderLean`'s sign and magnitude are asymmetric by design**, per `INSIDER_RESEARCH.md` §8's real, well-established academic finding: a purchase-heavy mix should be weighted **more heavily** toward a strong positive lean than an equally-sized sale-heavy mix is weighted toward a strong negative lean — implemented via a disclosed `purchaseWeightMultiplier` (proposed: 1.5×) applied to the buy-side contribution before computing the net signed lean, directly encoding the real, cited asymmetry rather than treating buys and sells as symmetric opposites.

## 2. Executive Score (0-100)

**What it measures:** insider activity specifically from **officers and directors** (per `INSIDER_RESEARCH.md` §2's role-based distinction), deliberately separated from 10%-owner-only activity.

```
ExecutiveScore = clamp(
    Σ over each qualifying P/S transaction from an officer or director:
        transactionSignificance(txn) * roleWeight(txn.role)
  , 0, 100)

roleWeight:
    officer (esp. CEO/CFO/COO — named C-suite titles)  = 1.0
    director (non-officer board member)                = 0.8
    officer-and-director (holds both roles)             = 1.0 (not additive —
                                                             capped at the
                                                             higher single
                                                             role weight,
                                                             avoiding
                                                             double-counting
                                                             one person's
                                                             one transaction
                                                             under two roles)
    10%-owner-only (no officer/director role)            = EXCLUDED from
                                                             ExecutiveScore
                                                             entirely — this
                                                             score is
                                                             deliberately,
                                                             explicitly
                                                             scoped to
                                                             genuine
                                                             operational
                                                             insiders only,
                                                             per §3's
                                                             separate
                                                             treatment
```

- **10%-owner-only filers are deliberately, entirely excluded from `ExecutiveScore`** — not down-weighted to a small contribution, fully excluded — since, per `INSIDER_RESEARCH.md` §2, a passive institutional 10%-owner's Form 4 reflects a fundamentally different kind of decision (portfolio-management, not operational insight) than an officer or director's. Their activity is still real, disclosed evidence, and should be reported separately (a distinct, labeled `institutionalOwnerActivity` field alongside `ExecutiveScore`, never silently discarded) — simply not blended into a score whose entire purpose is measuring genuine operational-insider conviction.

## 3. Cluster Score (0-100)

**What it measures:** how many **distinct** insiders are transacting in the **same direction** within a defined window — per `INSIDER_RESEARCH.md` §3, the single most scientifically defensible signal in this whole research area.

```
ClusterScore = clamp(
    distinctBuyerCount * BUY_CLUSTER_WEIGHT
    - distinctSellerCount * SELL_CLUSTER_WEIGHT * SELL_CLUSTER_DISCOUNT
  , 0, 100)

BUY_CLUSTER_WEIGHT   = 25 points per distinct qualifying (P-coded,
                        non-10b5-1-plan or explicitly-flagged-if-plan)
                        buyer within the window, capped contribution
                        (diminishing returns beyond ~4 distinct buyers,
                        avoiding an unbounded score from an arbitrarily
                        large company-wide event)
SELL_CLUSTER_WEIGHT  = same base weight, but...
SELL_CLUSTER_DISCOUNT = 0.4  — a sell cluster is REAL, disclosed evidence,
                                but per INSIDER_RESEARCH.md §3/§8's own
                                finding, coordinated selling has a much
                                weaker, more ambiguous predictive
                                relationship than coordinated buying
                                (routine reasons for coordinated selling
                                — e.g., several executives' 10b5-1 plans
                                executing on similar pre-scheduled
                                cadences — are common and largely
                                uninformative) — this discount is the
                                direct, disclosed encoding of that
                                asymmetry
```

- **A `10b5-1`-plan flag, when present on a transaction, further discounts that specific transaction's contribution to the cluster count** (proposed: 0.5× weight) rather than excluding it outright — a pre-scheduled plan transaction is real, weaker evidence of spontaneous conviction, not zero evidence (the insider still chose to adopt the plan and hold the position through to execution), consistent with `INSIDER_RESEARCH.md` §6.
- **Window size is itself a disclosed, hand-set parameter** (proposed: a rolling 30-day window) — long enough to capture a genuine, related wave of activity, short enough that unrelated transactions months apart aren't miscounted as one "cluster."

## 4. Ownership Score (0-100)

**What it measures:** the significance of insider activity **normalized by each insider's own existing stake** — per `INSIDER_RESEARCH.md` §4's finding that raw dollar value alone is a misleading significance measure.

```
OwnershipScore = clamp(
    Σ over each qualifying P/S transaction:
        (transactionShares / insiderPreTransactionShares) * 100 * SIGNIFICANCE_SCALING
  , 0, 100)

SIGNIFICANCE_SCALING = a disclosed, hand-set constant translating
                       "percentage of an insider's own stake" into the
                       0-100 scale — proposed such that a transaction
                       representing ~20% or more of an insider's
                       pre-transaction holdings alone approaches the
                       ceiling, since a change of that magnitude to a
                       single insider's own position is a genuinely
                       significant, attention-worthy event regardless
                       of the absolute dollar figure involved
```

- **A `100%`-of-holdings sale (a complete exit) is deliberately treated as the single highest-significance event this score can register** — a real, well-established practitioner heuristic (a complete divestiture is qualitatively different from, and generally considered more informative than, a partial reduction of any size) — recommend this be additionally, explicitly flagged as a distinct boolean (`completeExit: true`) alongside the numeric score, never silently folded into the same number as a large-but-partial sale.
- **Explicitly does not distinguish buy vs. sell direction on its own** — `OwnershipScore` measures *how significant* a transaction was relative to the insider's own stake, a magnitude concept; direction is captured separately via `insiderLean` (§1), consistent with this document's consistent magnitude-vs-direction separation.

## 5. Confidence Model

**What it measures:** how much to trust the overall `InsiderScore` composite — a disclosed weighted composite of data-quality factors, distinct from the score's own magnitude/direction.

```
InsiderConfidence = clamp(
    dataCompletenessScore  * 0.30   (fraction of expected Form 4 fields
                                      present/parseable for the
                                      contributing transactions — role
                                      flags, transaction codes, share
                                      counts, dates — all real, always-
                                      present fields on a genuine Form 4,
                                      so a LOW completeness score here is
                                      itself a real data-quality red flag,
                                      not an expected/normal condition)
  + sampleAdequacyScore    * 0.30   (per INSIDER_RESEARCH.md §7's own
                                      "don't over-claim from a small
                                      sample" caution — a single isolated
                                      transaction should carry materially
                                      lower confidence than a genuine,
                                      multi-transaction, multi-insider
                                      pattern)
  + filingTimelinessScore  * 0.25   (the inverse of §6 below's freshness-
                                      model lateness penalty — a
                                      transaction cluster built
                                      predominantly from promptly-filed
                                      Form 4s is more straightforwardly
                                      interpretable than one built from
                                      several late-filed ones, per
                                      INSIDER_RESEARCH.md §7's own
                                      disclosed, modest predictive
                                      association)
  + sourceReliabilityScore * 0.15   (100 if sourced directly from SEC
                                      EDGAR or a real, documented vendor
                                      API [Finnhub]; a disclosed, lower
                                      fixed value if sourced from an
                                      undocumented/scraped path
                                      [OpenInsider-class], per
                                      INSIDER_RESEARCH.md §9's own
                                      reliability caveat)
  , 0, 100)
```

- **`InsiderConfidence` is deliberately independent of `InsiderScore`'s own magnitude** — a large, high-magnitude `InsiderScore` built from a thin, single-transaction sample must report a correspondingly lower `InsiderConfidence`, never presenting as equally trustworthy as a similarly-large score built from a genuine, multi-insider, promptly-filed, well-sourced pattern — the same confidence-vs-magnitude separation this whole research series has applied consistently.

## 6. Freshness Model

**What it measures:** how current the underlying insider evidence is — with a specific, disclosed complication unique to this domain, per `INSIDER_RESEARCH.md` §7: **two distinct dates exist on every Form 4** (the real transaction date and the real filing date), and freshness must account for both.

```
freshnessScore = clamp(
    100 - (daysSinceTransaction / EXPECTED_RELEVANCE_WINDOW_DAYS) * 100
  , FLOOR, 100)          (proposed EXPECTED_RELEVANCE_WINDOW_DAYS: 30 —
                           insider-transaction evidence remains
                           meaningfully relevant for weeks, materially
                           longer than options-flow or sentiment
                           signals, consistent with this being a
                           lower-frequency, longer-horizon signal type)

filingLatenessDiscount = a SEPARATE, disclosed multiplicative penalty,
                          NOT blended into freshnessScore itself:
                          1.0   if filed within the real 2-business-day
                                requirement
                          0.85  if filed late, but within 10 additional
                                business days
                          0.65  if filed materially late (beyond that)
                                — reflecting INSIDER_RESEARCH.md §7's own
                                disclosed, modest academic finding that
                                late-filed Form 4s show a real but
                                bounded, non-catastrophic average
                                association with weaker subsequent
                                performance — a real discount, never a
                                disqualification
```

- **`freshnessScore` is computed from the real transaction date, never the filing date** — a transaction that occurred recently but was filed late is still evidence about a recent event; the lateness itself is captured separately via `filingLatenessDiscount`, applied multiplicatively to that specific transaction's contribution to `InsiderScore`/`ClusterScore`/`OwnershipScore` — keeping "how recent is this information" and "was this filed on time" as two distinct, disclosed facts rather than one conflated number, directly mirroring `FIBONACCI_METHODOLOGY.md` §2's own "two genuinely distinct freshness dimensions, not one number" principle established for the Fibonacci Agent.

---

## 7. Summary — how the 6 scores relate to each other

```
InsiderScore        — magnitude-and-lean headline composite, built from
                        ExecutiveScore + ClusterScore + OwnershipScore,
                        ONLY from genuine discretionary (P/S-coded)
                        transactions — A/M/F/G/C-coded activity excluded
                        entirely, not merely down-weighted

ExecutiveScore       — officer/director-only component, explicitly
                        excluding 10%-owner-only filers (reported
                        separately, never silently discarded)

ClusterScore         — distinct-insider-count-based, asymmetrically
                        weighted (buy clusters count more than sell
                        clusters), 10b5-1-plan-aware discount applied
                        per-transaction

OwnershipScore       — percentage-of-own-holdings-based magnitude,
                        with a distinct completeExit flag for 100%
                        divestitures, direction-agnostic (direction
                        lives in the separate insiderLean field)

InsiderConfidence    — a disclosed composite of data completeness,
                        sample adequacy, filing timeliness, and source
                        reliability — deliberately independent of
                        InsiderScore's own magnitude

Freshness            — two SEPARATE dimensions: how recent the real
                        transaction was (freshnessScore) and whether it
                        was filed on time (filingLatenessDiscount),
                        never conflated into one number
```

No code was written to implement any of the above — this document, together with `INSIDER_RESEARCH.md` and `INSIDER_DATA_STRATEGY.md`, is the design/decision record for whenever a real implementation phase begins, following the same "architecture → research → build" sequencing already proven for this platform's other agents.
