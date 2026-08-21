# ImpactOne Strategy Policy

The executable source of truth is `backend/services/agentOrchestrator/strategyPolicy.js`.

## Agent weights

| Agent | Weight / 10 | Product role |
|---|---:|---|
| Fibonacci | 10 | Primary setup gate: chronological low → later high, within 5% of 0.886 |
| Insider | 10 | Verified SEC Form 4 open-market purchases (`P`), strongest after a drawdown and near Fibonacci |
| Valuation | 9 | Plain-language price fit, interpreted together with earnings |
| Institutional | 8 | 13F ownership and changes, labelled as delayed filing data |
| Earnings | 7 | Revenue, earnings, margins, surprises and trend |
| News | 7 | Verified catalysts; U.S. government initiatives receive explicit classification |
| Short interest / volume | 6 | FINRA short-volume extremes; never shown as investor counts |
| Options | 6 | CALL/PUT volume and OI; real-time flow only with a licensed source |
| Alternative data | 6 | Public, source-linked corroborating signals |
| Market sentiment | 6 | Regime plus conditional contrarian context, never an automatic inverse trade |
| Macro | 6 | Rates, inflation, liquidity and policy mapped to sectors and symbols |
| Symbol sentiment | 5 | Symbol tone contextualized against DXY, gold and the broad market |
| ETF / sector flow | 4 | Sector breadth and relative strength |
| Technical | 3 | Supporting context; cannot overrule Fibonacci alone |
| Analyst consensus | 3 | Third-party context, not a primary decision driver |

## Decision states

- **Radar** — a verified Fibonacci candidate exists, but committee approval or confirmations are incomplete.
- **Watch** — Fibonacci is approved and one independent verified agent confirms it.
- **Confirmed** — Fibonacci is approved, two independent verified agents confirm it, committee coverage is at least 60%, and no high-confidence bearish veto exists.
- **Invalidated** — a disclosed strategy or evidence gate failed; it is never shown as approved.

Missing sources reduce coverage and stay visible as blockers. They never receive invented neutral values. Scores are evidence summaries, not promises or automatic trade instructions.

## Independent evidence model

The committee does not treat fifteen agent names as fifteen independent facts. Agents are grouped by the underlying evidence they consume and each family has a maximum influence:

| Evidence family | Agents | Maximum influence |
|---|---|---:|
| Weekly setup | Fibonacci | 10 |
| Fundamentals | Earnings + Valuation | 10 |
| Ownership | Insider + Institutional | 10 |
| Positioning | FINRA short volume + Options | 8 |
| Catalysts | News + Symbol Sentiment | 8 |
| Market context | Market Sentiment + Macro + ETF Flow + Alternative Data | 8 |
| Price action | Technical | 3 |
| External opinion | Analyst Consensus | 3 |

This prevents one news item, one earnings release, or one ownership filing from being counted repeatedly after several agents interpret it. A strong bearish **Fundamentals** or **Ownership** family is a strategic veto. Missing or quality-rejected rows contribute neither a bearish, bullish nor neutral vote.

The API exposes separate concepts so the interface cannot confuse them:

- `evidenceConfidence` — quality/confidence of the evidence that actually passed its source gates.
- `decisionDirection` — the family-capped committee lean (`BULLISH`, `BEARISH`, or `NEUTRAL`).
- `decisionConfidence` — directional conviction reduced by declared-strategy coverage.
- `decisionSynthesis.committee.coveragePct` — how much of the relevant strategy is backed by decision-grade evidence.
- `decisionSynthesis.committee.vetoFamilies` — disclosed evidence families that block approval.

## Refinement status

1. **Implemented — Insider Reversal:** verified Form 4 purchase + material drawdown + active-timeframe Fibonacci proximity.
2. **Implemented — Valuation + Earnings:** one plain-language view of growth, earnings quality and price fit, with source and freshness metadata.
3. **Implemented — Government Catalyst intake:** official `.gov` releases are distinguished from verified reporting about U.S. policy; symbol-linked events enter the daily specialist board and are mapped to disclosed policy themes and affected sectors. The system never invents beneficiary tickers that were not linked by the source event.
4. **Implemented — Conditional Contrarian Regime:** fear/euphoria becomes a watch signal only when liquidity and daily direction confirm it. Missing breadth/history remains an explicit blocker; this never places a trade.
5. **Implemented — Gold lifecycle history:** every verified setup records Radar → Watch → Confirmed → Invalidated transitions. Disappearance is marked Invalidated only after a completed full-universe scan. Paper outcomes remain linked only when a real portfolio/recommendation outcome exists; no synthetic return is generated.
