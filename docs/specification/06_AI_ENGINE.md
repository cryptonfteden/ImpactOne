# 06 — AI Engine

## Engine model

ImpactOne implements a multi-stage intelligence system rather than one prompt call:

1. Provider-specific data is normalized.
2. Specialized agents analyze technicals, valuation, sentiment, news, macro, earnings, institutional/insider activity, options, short interest, ETF flow, Fibonacci, and analyst consensus.
3. Standard member outputs and agent interfaces normalize findings.
4. Orchestration selects agents, manages execution, cancellation, retries, health, and traces.
5. Committee services resolve disagreement and build a canonical verdict.
6. Intelligence Bus events, claims, scenarios, recommendations, and explanations persist or present the result.
7. Outcomes and calibration services evaluate performance and feed bounded learning adjustments.

## Trust and governance

- Confidence, probability, and uncertainty are distinct concepts.
- Evidence carries provenance, freshness, stance, and independence grouping.
- Claims maintain append-oriented evidence and transition ledgers.
- Decision traces, methodology versions, scorecards, calibration, drift detection, and reliability context support audits.
- Governance modules sanitize event and claim content and avoid fabricated values.

## OpenAI usage

`openaiService` and summary services support generated language when configured. Core scoring and many analyzers are deterministic modules. Missing `OPENAI_API_KEY` should degrade features honestly; exact fallback behavior must be tested per endpoint.

## Gaps

- Prompt/model/version inventory is not centralized in a single executable registry.
- Static inspection cannot validate hallucination rate or recommendation quality.
- Agent count and repeated filenames across subdirectories make lineage hard to understand without generated catalogs.
- Financial-risk disclosures and human escalation policy need product/legal ownership.
