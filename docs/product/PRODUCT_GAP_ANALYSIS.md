# ImpactOne Product Gap Analysis

Date: 2026-07-11  
Scope: Gap analysis between current repository implementation and a world-class AI investment platform

## 1. Executive Summary

ImpactOne has built a strong AI intelligence core for MVP stage:

- Multi-source market and alternative-data ingestion
- Event intelligence and scenario analysis
- AI committee and daily briefing workflows
- A persistent paper-trading engine (v2 portfolio)
- A high-quality dashboard foundation (Sprint 15)

The largest strategic gaps versus world-class platforms are not core intelligence algorithms. They are platformization gaps:

- No user identity and account model
- No monetization rails
- No real execution layer (broker connectivity)
- No trust/compliance layer suitable for scaled deployment
- Limited personalization, collaboration, and lifecycle retention loops

In short: ImpactOne is currently a strong intelligence product, but not yet a full investment platform.

## 2. Current State Baseline (From Repository)

Observed strengths in implementation:

- Rich backend intelligence surface under [backend/routes/index.js](../../backend/routes/index.js)
- Portfolio persistence and transaction model in [backend/services/portfolioEngineService.js](../../backend/services/portfolioEngineService.js)
- Daily brief archive persistence via [backend/services/dailyBriefArchiveService.js](../../backend/services/dailyBriefArchiveService.js)
- Home dashboard composition in [frontend/src/components/DashboardHome.jsx](../../frontend/src/components/DashboardHome.jsx)
- API contract coverage in [API_CONTRACTS.md](../engineering/API_CONTRACTS.md)
- Competitive landscape synthesis in [COMPETITOR_INTELLIGENCE.md](COMPETITOR_INTELLIGENCE.md)

Observed structural gaps:

- No auth/session endpoints (already documented as missing in [API_CONTRACTS.md](../engineering/API_CONTRACTS.md))
- No billing/entitlements system
- No broker execution integration
- No background job orchestration layer
- No enterprise governance/audit controls
- Test coverage is growing but still sparse relative to scope

## 3. Ranking Method

Scoring scale:

- User Value: 1 to 10 (higher = more user impact)
- Technical Complexity: 1 to 10 (higher = harder)
- Competitive Advantage: 1 to 10 (higher = stronger differentiation)
- Revenue Impact: 1 to 10 (higher = greater monetization lift)

Priority Score formula used for ranking:

$$
Priority = 0.35 \times UserValue + 0.30 \times CompetitiveAdvantage + 0.25 \times RevenueImpact - 0.10 \times TechnicalComplexity
$$

Complexity is treated as a delivery drag, not a value metric.

## 4. Top 20 Missing Features (Ranked)

| Rank | Missing Feature | User Value | Technical Complexity | Competitive Advantage | Revenue Impact | Priority Score |
|---|---|---:|---:|---:|---:|---:|
| 1 | Secure account system (signup/login/session, user profiles) | 10 | 6 | 7 | 9 | 7.85 |
| 2 | Broker connectivity for real trading (first broker integration) | 10 | 9 | 9 | 9 | 7.80 |
| 3 | Trust layer: explainability, citations, confidence provenance panel everywhere | 9 | 5 | 10 | 8 | 7.75 |
| 4 | Paid plans and entitlements (billing, upgrades, feature gating) | 9 | 7 | 7 | 10 | 7.30 |
| 5 | Personalized onboarding + persistent investor preferences | 9 | 5 | 7 | 8 | 7.10 |
| 6 | Autonomous alerting system (multi-channel, threshold tuning, digest control) | 9 | 6 | 8 | 7 | 7.05 |
| 7 | Portfolio construction assistant (target allocation, constraints, optimizer) | 9 | 7 | 8 | 7 | 6.95 |
| 8 | Continuous backtesting and strategy validation framework | 8 | 8 | 9 | 7 | 6.70 |
| 9 | Risk management cockpit (VaR, scenario stress, concentration, drawdown guardrails) | 9 | 8 | 8 | 7 | 6.70 |
| 10 | Idea lifecycle workflow (thesis -> monitor -> decision -> outcome attribution) | 8 | 6 | 8 | 7 | 6.60 |
| 11 | Real-time stream architecture (websocket/SSE for live intelligence updates) | 8 | 7 | 8 | 6 | 6.35 |
| 12 | Saved screeners and reusable query workspace | 8 | 5 | 7 | 6 | 6.35 |
| 13 | Team collaboration layer (shared watchlists, comments, approvals, activity feed) | 7 | 7 | 8 | 7 | 6.10 |
| 14 | Multi-asset expansion with execution-grade crypto/FX/fixed-income flows | 7 | 9 | 8 | 8 | 6.05 |
| 15 | Institutional reporting exports (PDF, investor letters, compliance-ready packs) | 7 | 6 | 7 | 7 | 6.00 |
| 16 | Background job and data reliability platform (queues, retries, schedulers) | 7 | 8 | 7 | 6 | 5.60 |
| 17 | Enterprise security and governance (RBAC, audit logs, SSO, data controls) | 6 | 8 | 8 | 7 | 5.65 |
| 18 | Mobile-first native app or PWA hardening for daily workflow | 7 | 7 | 6 | 6 | 5.75 |
| 19 | Recommendation quality feedback loop (human labels, outcome training, drift monitor) | 6 | 8 | 9 | 6 | 5.60 |
| 20 | Global regulatory/compliance module (suitability, disclosures, region rules) | 6 | 9 | 7 | 7 | 5.30 |

## 5. Why These Gaps Matter

### 5.1 Platform Viability Gaps (Must-Have)

- Identity + account layer
- Billing + plan control
- Broker execution

Without these, ImpactOne remains a powerful analysis app but cannot become a full revenue platform with durable user lock-in.

### 5.2 Trust and Decision Quality Gaps (Differentiation)

- Explainability and citations at every decision touchpoint
- Risk cockpit and stress testing
- Outcome attribution and model feedback loops

World-class products win trust through transparent reasoning and measurable decision quality, not just high AI confidence scores.

### 5.3 Operational Scale Gaps

- Background jobs and reliability controls
- Security governance and enterprise controls
- Compliance and jurisdiction support

These gaps are less visible to end users but determine whether the product can scale safely into larger accounts and institutions.

## 6. Recommended Sequencing

### Phase A: Revenue Foundation (0-2 sprints)

1. Account/authentication system
2. Billing and entitlements
3. Onboarding and preferences persistence

### Phase B: Product-Market Expansion (2-5 sprints)

1. Trust layer with citations and confidence provenance
2. Alerting system and saved workflows
3. Idea lifecycle workflow and decision history

### Phase C: Platform Depth (5+ sprints)

1. Broker integration and execution controls
2. Risk cockpit and strategy validation
3. Collaboration, governance, and compliance modules

## 7. Immediate Actions for Sprint Planning

1. Convert the top 5 gaps into concrete PRD epics with API contracts and UX flows.
2. Define a monetization architecture decision: per-seat, per-AUM, or hybrid entitlement model.
3. Create a broker-integration feasibility spike (provider shortlist, legal constraints, account model changes).
4. Add trust UX requirements to all AI outputs: source, confidence, rationale, and caveats.
5. Add reliability workstream: scheduler/queue architecture for daily brief and intelligence generation.

## 8. Conclusion

ImpactOne already has a meaningful AI intelligence engine and a credible dashboard product. The path to world-class status is to close platform gaps around identity, monetization, execution, and trust infrastructure. The ranked top-20 list above focuses on features that maximize user value and business durability while creating defensible competitive advantage.
