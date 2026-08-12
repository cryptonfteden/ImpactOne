# 14 — Feature Specifications

## Intelligence and recommendations

Inputs: normalized provider evidence and investor context. Processing: agents, orchestration, committee, claims/scenarios, scoring and governance. Outputs: verdict, factors, risks, confidence/uncertainty, explanation, recommendation, decision trace. Must never replace missing inputs with invented values.

## Portfolio intelligence

Maintains positions, orders, trades, cash ledger, performance snapshots and holding-aware impact. The legacy browser portfolio and API portfolio are distinct modes; migration/synchronization is not implicit.

## Watchlists, workspaces, alerts

Folders organize symbols and metadata; workspaces persist notes; price alerts evaluate conditions and generate notifications. User scoping and idempotent scheduler behavior are mandatory.

## Claims and learning

Claims represent falsifiable statements with evidence stance, probability, confidence, uncertainty, conditions, lifecycle transitions, and graded outcomes. Outcome feedback can influence bounded source/committee scoring but must not silently rewrite historical evidence.

## Personalization

Investor profile and memory events tailor ranking and presentation. Personalization must preserve provenance, allow user control, and never cross user/beta identity boundaries.

## Commercial infrastructure

Credentialed users receive revocable sessions. Plans and subscriptions drive entitlements and usage counters. Billing is provider-neutral internally; manual is default and Stripe is optional.

## Operations and quality

Provider, agent, performance, calibration, quality, admin, and executive surfaces consume real telemetry. Feature flags and methodology changes require access control and auditability.
