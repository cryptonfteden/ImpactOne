# PHASE_C_REVIEW.md

## Scope and Basis
This review covers the current repository state and the following artifacts:
- `PRODUCT_GAP_ANALYSIS.md`
- `UX_RECOMMENDATIONS.md`
- `SCALABILITY_REPORT.md`
- `ARCHITECTURE.md`
- `API_CONTRACTS.md`
- `PROJECT_STATUS.md`
- Current repository structure and current implementation surfaces relevant to Sprint 16

Review note:
- No standalone Sprint 16 Phase C implementation plan was found in the repository at review time.
- This is itself a blocker for approval because several requested review areas depend on explicit scope, success metrics, non-goals, and rollout constraints.
- Where relevant, this review distinguishes between current implementation gaps and plan requirements that must be satisfied once the Phase C plan lands.

## 1. Missing Product Requirements
- No standalone Phase C PRD or implementation plan exists yet. There is no explicit scope, success metric set, owner map, rollout sequence, or out-of-scope boundary.
- No user/account model exists for Phase C personalization. The architecture remains effectively single-tenant with one default server-side portfolio and browser-local watchlists.
- No server-owned watchlist, preferences, risk profile, notification preference, or trust preference model exists, so true portfolio-personalized intelligence is not product-complete.
- No explicit definition exists for what “personalization” means in product terms: holdings-aware, watchlist-aware, sector-aware, risk-aware, jurisdiction-aware, or account-aware.
- No requirement set exists for recommendation lifecycle states from a user perspective: created, stale, superseded, dismissed, snoozed, archived, reviewed, or escalated.
- No human-in-the-loop requirement exists for high-impact recommendations, especially if Phase C is expected to deepen toward execution-adjacent workflows.
- No explicit trust-layer product requirements exist for when the system must suppress an answer instead of showing low-quality or synthetic output.
- No requirement set exists for freshness SLAs by surface: dashboard, recommendations, global intelligence, market news, alerts.
- No plan exists for user feedback loops such as “useful/not useful,” false-positive marking, or relevance correction, which are important for ranking quality.
- No requirement set exists for auditability, decision history, or explanation retention, despite PRODUCT_GAP_ANALYSIS describing governance/compliance depth as a Phase C direction.

## 2. Data-Quality Risks
- Live, fallback, and synthetic data are mixed across the product, but provenance is not consistently surfaced to the user. This creates a risk that demo-quality or fallback content is interpreted as production-quality intelligence.
- `backend/services/newsService.js` returns a fallback example article when `NEWS_API_KEY` is missing. Without strong UI labeling, this can look like a legitimate citation.
- `frontend/src/screens/MarketNewsScreen.jsx` is still a static mock screen, so news quality is not validated end-to-end on that surface even though live news is used elsewhere.
- `frontend/src/screens/WatchlistScreen.jsx` still renders `change` with a `%` suffix even though PROJECT_STATUS documents the known `change` versus `changePercent` mismatch. This is a live data-interpretation risk, not cosmetic debt.
- Confidence values across the system are often heuristic composites rather than calibrated probabilities. The product currently risks presenting synthetic confidence as statistical confidence.
- The recommendation engine depends on existing ranking logic and cached intelligence layers, so any upstream scoring bias propagates downstream into portfolio advice.
- The architecture still splits state between server-owned portfolio data and client-local watchlist data. This creates mismatched personalization inputs and inconsistent outputs across screens.
- `backend/services/autonomousMarketService.js` contains Phase C-oriented personalized news query logic, but the current recommendation engine path does not pass `portfolioContext` into `getAutonomousOverview()`. That means intended personalization support exists in code but is not fully active in the main run path.
- Sparse provider coverage for less-followed symbols can materially reduce reasoning quality while still yielding a recommendation object.
- There is no clear quality gate for minimum evidence count, source diversity, or freshness before a recommendation is shown.

## 3. News Relevance and Ranking Risks
- Current default behavior still falls back to a broad `markets` query when no portfolio context is provided. This is weak personalization and will surface generic macro noise.
- Even when personalized query terms are used, query quality is still simplistic: active recommendations, held symbols, watchlist symbols, and sector strings. There is no intent model, topic clustering, or recency weighting strategy described.
- News deduplication is URL-first and title-second. That can collapse legitimately distinct stories with reused wire headlines or fail to collapse near-duplicates with different URLs.
- There is no source-quality weighting model in the visible architecture. A low-signal outlet can influence ranking similarly to a high-signal outlet if both enter the feed.
- There is no explicit ranking model combining freshness, portfolio relevance, novelty, confidence, and source trustworthiness into a stable user-facing score.
- There is no contradiction-handling requirement for situations where headlines conflict materially or where sentiment is mixed.
- There is no requirement to suppress stale headlines that remain high-ranking because of cached importance scores.
- `frontend/src/screens/MarketNewsScreen.jsx` being static means the dedicated news surface is disconnected from the actual ranking pipeline, so user validation of relevance is incomplete.
- The current cap on personalized news query terms is sensible for cost control, but it creates omission risk when users hold broad or multi-sector portfolios.
- There is no explicit cluster-level representation requirement, so one dominant theme can crowd out diverse but relevant stories.

## 4. Portfolio-Personalization Gaps
- There is no real multi-user foundation yet. The backend portfolio remains a single default portfolio, which is incompatible with true user-specific recommendations.
- Watchlists are still browser-local via `useWatchlist`, so server-side services cannot reliably see a user’s current saved interests.
- There is no persisted risk tolerance, investment horizon, strategy style, or do-not-trade list.
- There is no account segmentation for taxable versus retirement, long-only versus options-enabled, or simulated versus real funds.
- There is no model for user exclusions such as ESG constraints, sector caps, banned tickers, or jurisdictional restrictions.
- There is no requirement for recommendation relevance by position size, liquidity, cost basis sensitivity, or realized/unrealized tax posture.
- There is no personalized alert-threshold model, so importance can only be generic or portfolio-weight derived.
- There is no mechanism for user feedback to improve future ranking or suppress unwanted themes.
- There is no cross-device or cross-session persistence layer for portfolio-related preferences outside the single backend portfolio record.

## 5. Citation and Confidence Requirements
- Every recommendation, alert, and news-derived insight should include source provenance fields at the contract level: `sourceName`, `sourceUrl`, `publishedAt`, `retrievedAt`, `sourceType`, and `isFallback`.
- Synthetic or fallback content must never be visually indistinguishable from live sourced content. It should be labeled clearly as `fallback`, `synthetic`, or `demo`.
- A recommendation should not claim evidence-backed confidence unless it meets a minimum threshold of source count, source diversity, and freshness.
- Confidence should be decomposed into visible factors: data freshness, source agreement, model certainty, and portfolio relevance.
- All user-facing confidence values should be described as heuristic confidence unless calibration has been validated and documented.
- Citations should support drill-down to the specific matched evidence, not just a generic article link.
- Null `sourceUrl` items should not render as if they are cited live articles.
- The UI should show invalidation conditions for every recommendation or major event summary.
- Evidence should preserve whether a signal came from live news, synthetic scenario fallback, provider fallback, or deterministic AI fallback.
- Acceptance should require a no-silent-fabrication rule: if evidence is unavailable, the system must say so explicitly.

## 6. Edge Cases
- No API keys configured: the product must degrade clearly and honestly without implying live intelligence quality.
- Empty watchlist, empty portfolio, or both empty: the system should still behave coherently and explain what personalization inputs are missing.
- Invalid, delisted, thinly covered, or duplicate symbols in watchlist inputs.
- Market closed, stale quote, or delayed quote conditions.
- Conflicting evidence across providers or headlines.
- Large watchlists or diversified portfolios that exceed personalized news query caps.
- Single-sector portfolios that over-bias relevance and crowd out macro risk.
- Duplicate articles with different URLs, syndicated rewrites, or identical titles.
- Closed positions with still-active recommendations.
- Recommendations generated during provider partial outage.
- Rapid portfolio changes between recommendation run and user view.
- Frontend/server state divergence when local watchlist changes are not reflected in backend personalization context.
- Users on fallback-only environments seeing apparently polished but low-trust output.

## 7. Privacy and Security Concerns
- There is no authentication or authorization layer in the current implementation. That is incompatible with any Phase C feature that claims real personalization, history, governance, or account ownership.
- `PROJECT_STATUS.md` explicitly notes that `frontend/.env` was committed with real API keys in repository history. This is a material security concern and should be treated as an open incident until keys are rotated and history is remediated.
- `backend/app.js` applies global CORS without visible narrowing. For a richer multi-user product, that is too permissive by default.
- OpenAI request paths currently send large serialized context payloads. Without explicit data minimization rules, sensitive portfolio context could be overshared to third-party AI providers.
- `backend/services/openaiService.js` logs request context and response snippets. In a multi-user or sensitive portfolio setting, that is not acceptable for production.
- No visible audit logging or access trail exists for who viewed, changed, or triggered recommendation workflows.
- No visible secret-management, rotation, or environment-hardening requirements are documented for Phase C.
- No visible retention policy exists for recommendation evidence, chat context, or provider payload fragments.
- No visible policy exists for separating demo/sandbox environments from real-user environments.

## 8. Performance and Scalability Risks
- PHASE C personalization will increase pressure on the exact hotspots already identified in `SCALABILITY_REPORT.md`: synchronous fan-out, per-screen polling, process-local caches, and inline AI calls.
- Personalized news queries multiply third-party NewsAPI calls. This is cost-sensitive and latency-sensitive once portfolio context is used broadly.
- Current frontend polling patterns will amplify Phase C cost if more portfolio-aware surfaces are added without request deduplication.
- The recommendation engine still depends on expensive overview generation and per-symbol ranking logic. More personalization inputs will increase computation cost.
- In-memory caches are process-local and unbounded by size policy, so horizontally scaling personalized intelligence would produce inconsistent behavior and poor cache efficiency.
- The backend remains tightly coupled to third-party provider availability. That is especially risky for any Phase C experience promising timely, trustworthy alerts.
- The current single default portfolio model prevents realistic load testing of multi-user personalized workflows.
- If portfolioContext is enabled widely without queueing or snapshotting, p95 latency and rate-limit failures are likely to rise sharply.
- The dedicated Market News screen is still static, so one major Phase C quality surface is not yet exercising real backend load at all.

## 9. Test Scenarios Claude Must Cover
- Verify no recommendation is shown as “live” when it is generated entirely from fallback or synthetic data.
- Verify `sourceUrl`, `sourceName`, and freshness metadata appear for every cited recommendation event.
- Verify null-citation events render as uncited or synthetic, not as authoritative live evidence.
- Verify the system behaves correctly with no API keys configured and exposes clear degraded-mode messaging.
- Verify watchlist personalization uses actual user-specific server-side state once implemented, not only the default watchlist.
- Verify a user with an empty portfolio and non-empty watchlist gets coherent, explicitly limited personalization.
- Verify a user with a populated portfolio and empty watchlist still gets holdings-aware relevance.
- Verify large watchlists do not silently drop critical symbols without exposing query-cap behavior.
- Verify duplicated or syndicated headlines do not inflate ranking disproportionately.
- Verify contradictory news sources do not collapse into a falsely high-confidence recommendation.
- Verify recommendation freshness and staleness rules when portfolio state changes after a run.
- Verify recommendation supersede behavior when a symbol’s signal flips direction.
- Verify the system does not leak one user’s portfolio context into another user’s outputs once auth exists.
- Verify OpenAI/provider failure does not leave partially populated, misleading recommendation cards.
- Verify recommendation and news ranking stay within defined latency budgets for cached and uncached paths.
- Verify watchlist data renders the correct absolute change versus percent change semantics everywhere.
- Verify static/mock content cannot appear in production pathways without explicit demo labeling.
- Verify audit trails for run triggers, overrides, dismissals, and state changes once those workflows are introduced.
- Verify permission boundaries for admin, standard user, and read-only reviewer roles if governance features are included.
- Verify portfolio relevance scoring across concentration-heavy, diversified, and sector-constrained portfolios.

## 10. Acceptance Criteria for Phase C
- A standalone Phase C plan exists and defines scope, non-goals, success metrics, rollout order, and operational ownership.
- The product has a real user/account model or Phase C scope is explicitly reduced to single-user local mode only.
- Server-side personalization exists for watchlist, preferences, and portfolio context, or the UI clearly states its limitations.
- Every recommendation and major news-driven insight includes visible provenance, freshness, and confidence disclosure.
- Fallback and synthetic data are explicitly labeled and never masquerade as first-party or live provider evidence.
- Watchlist and recommendation surfaces use correct price-change semantics consistently.
- Recommendation generation obeys a minimum evidence policy before surfacing actionable guidance.
- Privacy controls are documented for third-party AI usage, logging, retention, and data sharing.
- Production logging excludes raw sensitive context payloads by default.
- Auth, authorization, and access ownership are defined before any cross-device personalization or governance claims are approved.
- Cached-path and uncached-path latency budgets are defined and measured for recommendation and news ranking endpoints.
- End-to-end tests cover degraded mode, stale mode, fallback mode, and citation rendering.
- The dedicated Market News surface is connected to the live ranking pipeline or explicitly removed from Phase C scope.
- API contracts are updated to match implemented routes before sign-off.

## 11. Conflicts Between the Plan and the Existing Architecture
- No standalone Phase C plan is present, so the first conflict is procedural: architecture review cannot fully validate implementation intent without a concrete plan.
- `PRODUCT_GAP_ANALYSIS.md` positions Phase C around broker integration, strategy validation, governance, and compliance depth, but `ARCHITECTURE.md` describes a system with no auth, no user tenancy, no entitlements, and no governance model.
- `PROJECT_STATUS.md` and `ARCHITECTURE.md` both describe the backend portfolio as effectively single-portfolio/single-user, which conflicts with any Phase C claim of user-personalized portfolio intelligence at scale.
- `API_CONTRACTS.md` is stale relative to the current backend: it lists `GET /api/intelligence/daily-brief/archive` as missing, but the route exists in `backend/routes/intelligenceRoutes.js` and has integration tests. This weakens confidence in contract-driven delivery.
- `UX_RECOMMENDATIONS.md` calls for source transparency, confidence provenance, and decision controls across screens, but the current UI/state model does not consistently support those requirements.
- `SCALABILITY_REPORT.md` recommends background jobs, shared caching, and deduplicated polling, but the current architecture still relies heavily on synchronous request-path fan-out and in-process caches.
- `backend/services/autonomousMarketService.js` includes Phase C-oriented personalized news query logic, but `backend/services/autonomousRecommendationEngine.js` currently calls `getAutonomousOverview({ watchlist: universe })` without `portfolioContext`. Intended architecture and actual active path are not aligned yet.
- `frontend/src/screens/MarketNewsScreen.jsx` remains static mock content, which conflicts with any Phase C plan that treats news relevance, citations, and ranking as a first-class reviewed surface.

## 12. Prioritized List of Issues

### Blocker
- No standalone Sprint 16 Phase C implementation plan exists in the repository.
- No auth/user-tenancy foundation exists, but true Phase C personalization and governance depend on it.
- Server-side watchlist/preferences persistence is still missing, so portfolio-personalized intelligence is incomplete and potentially misleading.
- Citation/provenance requirements are not enforced consistently across live, fallback, and synthetic content.
- Security incident remains open per PROJECT_STATUS: real API keys were committed in repository history.

### High
- The recommendation/news pipeline mixes live and synthetic content without a strong contract-level provenance model.
- The watchlist change-versus-changePercent bug is still present on a live user-facing screen.
- Market News remains a static mock surface, so news relevance and ranking cannot be validated end-to-end there.
- Current Phase C-oriented personalized news support is only partial because `portfolioContext` is not threaded through the main recommendation run path.
- Confidence scores are presented prominently but are not clearly calibrated or explained as heuristic.
- Current architecture is too dependent on synchronous provider calls and in-process caches for a broader personalized Phase C rollout.

### Medium
- API contract documentation is stale versus implemented routes.
- No explicit evidence-minimum policy exists for when recommendations should be withheld.
- No contradiction-handling or source-quality weighting model is visible for news ranking.
- No structured user feedback loop exists to improve relevance ranking and suppress noisy themes.
- No clear lifecycle rules exist for stale, dismissed, snoozed, or archived recommendations.

### Low
- Tests and status documentation appear to have some drift in counts and milestone descriptions over time.
- Navigation and feature layout already expose a Recommendations surface, but supporting trust controls are still uneven across screens.
- The repository still contains committed build artifacts and node_modules, which increases noise for review and change tracking even though it is not the primary product risk.

## Review Outcome
Current outcome: not approved for Phase C sign-off.

Reason:
- The repo shows meaningful Phase A and Phase B progress, and it even contains early Phase C-oriented hooks, but core prerequisites for trustworthy Phase C delivery are still missing: plan clarity, user ownership model, real server-side personalization, consistent provenance, and production-grade privacy/security controls.

Minimum approval gate before reassessment:
- Add the standalone Phase C plan.
- Resolve the security and provenance blockers.
- Define the user-state model for personalization.
- Align contracts, UX trust requirements, and active architecture paths with the intended Phase C scope.
