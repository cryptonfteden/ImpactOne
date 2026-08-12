# 01 — Product Vision

## Purpose

ImpactOne aims to turn fragmented market evidence into understandable, traceable investor decisions. The product is positioned as an intelligence workspace rather than a brokerage: it explains evidence, uncertainty, scenarios, portfolio impact, and the evolution of decisions.

## Target users

- Self-directed investors needing a daily intelligence brief and watchlist monitoring.
- Advanced investors comparing technical, fundamental, sentiment, options, macro, ownership, and news signals.
- Closed-beta operators and founders reviewing quality, system health, and user behavior.
- Future paying users with authenticated accounts, plans, subscriptions, and usage entitlements.

## Differentiation evidenced in code

- Specialized agents feeding a standardized orchestrator and investment committee.
- Separate confidence, probability, uncertainty, provenance, and counter-evidence concepts.
- An Intelligence Bus and canonical event model rather than direct provider-to-screen coupling.
- A Claim Intelligence layer with evidence ledgers, lifecycle transitions, outcomes, and calibration.
- Portfolio-aware impact graphs, briefs, recommendations, and personalization.
- Decision traces and methodology versions intended to make outputs auditable.

## Product principles inferred from implementation

- Missing data should remain missing rather than be fabricated.
- User-facing conclusions should expose evidence and uncertainty.
- Historical evidence and outcome grading are append-oriented.
- External providers are replaceable behind adapters and provider abstractions.
- Internal diagnostics remain gated from normal production navigation.

## Boundary

The platform provides decision support. Nothing in the audited code establishes regulated investment-adviser status, brokerage execution, custody, or guaranteed outcomes; legal positioning and user disclosures require explicit review.
