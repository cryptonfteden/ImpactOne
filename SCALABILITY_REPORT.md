# SCALABILITY_REPORT.md

## Scope
This report identifies scalability bottlenecks across backend, frontend, database, caching, APIs, and AI pipeline in the current ImpactOne repository.

## Executive Summary
The system is functionally rich but architected primarily for single-instance operation and moderate traffic.

Highest-risk scalability constraints are:
1. Synchronous fan-out request patterns to third-party providers on user-facing paths.
2. Per-user/per-screen polling that duplicates expensive backend computations.
3. Process-local in-memory caches without eviction policy, distribution strategy, or invalidation guarantees.
4. Portfolio and watchlist computation paths that scale linearly (or worse) with symbol count and concurrent users.
5. AI calls that run inline on request/response path with large context payloads and verbose logging.

If traffic grows, likely failure modes are increased p95/p99 latency, provider throttling, memory growth, inconsistent cache behavior across replicas, and degraded UI responsiveness.

---

## Bottlenecks By Layer

### 1) Backend Bottlenecks

#### 1.1 Serial processing in watchlist and comparison endpoints
- Evidence:
  - `backend/controllers/watchlistController.js` loops symbols with sequential `await getQuote` then `await analyzeTicker`.
  - `backend/services/comparisonService.js` loops symbols sequentially for quote + AI analysis.
- Bottleneck:
  - End-to-end latency grows roughly with number of symbols (`O(n)` remote round trips in series).
- Impact at scale:
  - Slow responses for larger watchlists.
  - Higher timeout probability under provider jitter.
  - Request queue buildup under concurrency.
- Recommendation:
  - Replace serial loops with bounded parallelism (e.g., p-limit, worker pool).
  - Add endpoint-level time budget and partial-result response mode.

#### 1.2 Hot-path fan-out in intelligence overview endpoints
- Evidence:
  - `backend/services/autonomousMarketService.js` and `backend/services/dailyBriefService.js` use broad fan-out via `Promise.all` / `Promise.allSettled` across scenarios, symbols, and feeds.
- Bottleneck:
  - Single request can trigger many provider calls and CPU-heavy synthesis.
- Impact at scale:
  - High per-request cost and burst amplification.
  - Increased risk of downstream API rate-limit cascades.
- Recommendation:
  - Move heavy synthesis to background jobs and serve precomputed snapshots.
  - Introduce stale-while-revalidate behavior for overview reads.

#### 1.3 No admission control/rate shaping on expensive endpoints
- Evidence:
  - Route layer (`backend/routes/index.js`) exposes compute-heavy endpoints without endpoint-specific throttling.
- Bottleneck:
  - Expensive paths can be called repeatedly by multiple clients.
- Impact at scale:
  - Noisy-neighbor behavior, provider quota exhaustion, and poor tail latency.
- Recommendation:
  - Add per-IP/per-user rate limits and endpoint budgets.
  - Add circuit breakers and backoff around external providers.

#### 1.4 Single-process assumptions in app composition
- Evidence:
  - `backend/app.js` is stateless-friendly, but many services rely on process-local caches and local state.
- Bottleneck:
  - Horizontal scaling introduces cache inconsistency and duplicated work.
- Impact at scale:
  - Unpredictable response variance across replicas; reduced cache hit rates.
- Recommendation:
  - Externalize cache and job state to Redis (or equivalent), add idempotency keys and distributed locks where needed.

---

### 2) Frontend Bottlenecks

#### 2.1 Polling duplication across multiple screens/components
- Evidence (60s intervals):
  - `frontend/src/components/DashboardHome.jsx`
  - `frontend/src/components/Header.jsx`
  - `frontend/src/screens/GlobalIntelligenceScreen.jsx`
  - `frontend/src/screens/PortfolioScreen.jsx`
  - `frontend/src/hooks/usePortfolioEngine.js`
- Bottleneck:
  - Many independent pollers fetch overlapping data.
- Impact at scale:
  - N x redundant API traffic per user session.
  - Spiky backend load every minute.
- Recommendation:
  - Centralize data fetching through shared query cache (React Query/SWR).
  - Deduplicate requests by key and use focus/visibility-aware refetching.

#### 2.2 Heavy page-level fan-out on AI analysis screen
- Evidence:
  - `frontend/src/screens/AiAnalysisScreen.jsx` performs `marketApi.getQuote`, then `Promise.allSettled` for analyze/compare/alt/intelligence.
- Bottleneck:
  - One user action triggers multiple expensive backend calls.
- Impact at scale:
  - Amplifies backend/provider pressure during active usage.
- Recommendation:
  - Collapse into a backend aggregation endpoint with cached sub-results.
  - Load sections progressively (critical first, deep panels on demand).

#### 2.3 Lack of client-side request coalescing and cancellation strategy
- Evidence:
  - API client (`frontend/src/services/api/apiClient.js`) is a thin fetch wrapper without dedupe, retries, cancellation policy, or stale data handling.
- Bottleneck:
  - Concurrent identical requests are not coalesced.
- Impact at scale:
  - Extra network chatter and race-condition UI updates.
- Recommendation:
  - Add request dedupe, abort-on-obsolete, exponential backoff, and cache-control semantics.

---

### 3) Database Bottlenecks

#### 3.1 Single-portfolio default model and shared tables
- Evidence:
  - `backend/services/portfolioRepository.js` uses `findDefaultPortfolio()` by name and fetches data off one default portfolio.
- Bottleneck:
  - Data model and access pattern are not tenant/user partitioned.
- Impact at scale:
  - Contention on shared rows and difficult multi-user isolation.
- Recommendation:
  - Introduce explicit user/tenant ownership on portfolio entities.
  - Add composite indexes for user/portfolio/time access paths.

#### 3.2 Request-time recomputation for portfolio summary
- Evidence:
  - `backend/services/portfolioEngineService.js#getPortfolioSummary()` marks positions with live quotes each request.
- Bottleneck:
  - Summary cost grows with positions and quote fan-out.
- Impact at scale:
  - Increasing DB + provider + CPU cost on every refresh.
- Recommendation:
  - Maintain incremental snapshots/materialized views; fetch only deltas.
  - Cache portfolio summary per user for short TTL with invalidation on trades.

#### 3.3 Potentially expensive resets and historical operations
- Evidence:
  - `backend/services/portfolioRepository.js#resetPortfolio()` deletes multiple tables inside transaction.
- Bottleneck:
  - Large historical datasets make delete-heavy workflows expensive.
- Impact at scale:
  - Transaction bloat and lock pressure.
- Recommendation:
  - Use soft-delete/archive strategy and background compaction.
  - Partition historical tables by time for operational maintenance.

---

### 4) Caching Bottlenecks

#### 4.1 Process-local in-memory caches across multiple services
- Evidence:
  - `backend/services/intelligenceCache.js`
  - `backend/services/finnhubCache.js`
  - `backend/services/altDataCache.js`
  - `backend/services/openaiService.js` (`aiCache`)
  - `backend/services/chatService.js` (`chatCache`)
- Bottleneck:
  - Cache is per-process and not shared across instances.
- Impact at scale:
  - Low global hit rate, duplicated recomputation, inconsistent user experience.
- Recommendation:
  - Move to distributed cache with namespace/versioned keys.

#### 4.2 No explicit size bounds or eviction policy
- Evidence:
  - Map-based caches have TTL checks but no max-size/LRU cap.
- Bottleneck:
  - Memory usage can grow with key cardinality.
- Impact at scale:
  - Memory pressure and eventual process instability.
- Recommendation:
  - Enforce key caps, weighted eviction, and cardinality monitoring.

#### 4.3 Cache key cardinality explosion risk
- Evidence:
  - Several keys include serialized context (`JSON.stringify(context)` patterns in AI/chat/intelligence).
- Bottleneck:
  - Small context variations generate unique cache keys.
- Impact at scale:
  - Fragmented cache and poor reuse.
- Recommendation:
  - Normalize keys to stable dimensions (symbol, period, scenario hash, user segment).

---

### 5) API and Integration Bottlenecks

#### 5.1 Synchronous dependency on third-party providers in request path
- Evidence:
  - Finnhub, OpenAI, FRED, CFTC, Polymarket, SEC calls are made directly from service methods serving user requests.
- Bottleneck:
  - User latency and availability are coupled to external provider performance.
- Impact at scale:
  - Provider outages/rate limits surface directly as degraded UX.
- Recommendation:
  - Introduce ingestion layer + async enrichment pipeline.
  - Serve from internal normalized store first, then refresh asynchronously.

#### 5.2 Missing bulk endpoints for quote/analysis retrieval
- Evidence:
  - Current patterns often fetch per symbol repeatedly in loops.
- Bottleneck:
  - Repeated HTTP overhead and duplicated provider hits.
- Impact at scale:
  - Higher cost and latency for watchlists and portfolio views.
- Recommendation:
  - Add batch quote and batch analysis APIs with bounded payload size.

#### 5.3 Error handling favors fallback, but not load shedding
- Evidence:
  - Services fallback gracefully, but there is limited explicit load shedding under pressure.
- Bottleneck:
  - System keeps attempting expensive work during degraded provider states.
- Impact at scale:
  - Can worsen overload conditions.
- Recommendation:
  - Add adaptive load shedding, short-circuit cache, and degraded-mode contracts.

---

### 6) AI Pipeline Bottlenecks

#### 6.1 Inline OpenAI calls on critical interaction paths
- Evidence:
  - `backend/services/openaiService.js` and `backend/services/chatService.js` call OpenAI synchronously in API request flow.
- Bottleneck:
  - AI latency dominates response time and thread occupancy.
- Impact at scale:
  - Elevated tail latency and reduced throughput.
- Recommendation:
  - Shift non-critical AI synthesis to asynchronous jobs with polling/webhooks.
  - Keep synchronous path lightweight and cache-first.

#### 6.2 Large context payloads and verbose request/response logging
- Evidence:
  - `openaiService` logs serialized context and response snippets.
- Bottleneck:
  - CPU and I/O overhead plus log volume growth.
- Impact at scale:
  - Increased infra cost and potential sensitive-data risk in logs.
- Recommendation:
  - Log structured metadata only (token count, latency, status); sample payload logs under debug flag.

#### 6.3 Cache key based on full context JSON for AI
- Evidence:
  - `getCacheKey(symbol, context)` in `openaiService` concatenates full serialized context.
- Bottleneck:
  - Low cache locality due to high key variability.
- Impact at scale:
  - Frequent cache misses and more OpenAI spend.
- Recommendation:
  - Key by normalized state signature (symbol + rounded market features + context version).

---

## Priority Remediation Roadmap

### Phase 0 (Immediate: 1-2 weeks)
1. Add endpoint-level rate limits and concurrency guards for expensive routes (`/ai/analyze`, `/compare`, `/watchlist`, `/intelligence/*`).
2. Replace serial symbol loops with bounded parallelism in watchlist/comparison services.
3. Reduce OpenAI logging to metadata-only in production.
4. Add cache size caps and monitoring for all Map-based caches.

### Phase 1 (Near-term: 2-6 weeks)
1. Introduce Redis for shared caching and transient computation artifacts.
2. Implement shared frontend data layer (React Query/SWR) to remove duplicate polling.
3. Create batch quote and batch analysis backend endpoints.
4. Add stale-while-revalidate strategy for overview/dashboard intelligence payloads.

### Phase 2 (Medium-term: 6-12 weeks)
1. Move heavy intelligence and AI enrichment to background job workers (BullMQ/Temporal/queue-based).
2. Persist normalized market/intelligence snapshots; serve read APIs from precomputed data.
3. Introduce tenant/user partitioning for portfolio and intelligence state.
4. Add observability SLOs: p95 latency by endpoint, provider error budgets, cache hit ratio, queue lag.

### Phase 3 (Long-term)
1. Full event-driven ingestion and enrichment architecture.
2. Adaptive refresh policy by volatility and user activity (not fixed 60s global polling).
3. Multi-region readiness for provider failover and lower end-user latency.

---

## Suggested Metrics To Track Immediately
1. API latency: p50/p95/p99 by route.
2. External provider call count, error rate, and timeout rate by provider.
3. Cache hit/miss and memory footprint by cache namespace.
4. OpenAI token usage and cost per endpoint.
5. Frontend request count per screen per minute.
6. Portfolio summary compute time versus position count.

---

## Highest-Impact Changes (Top 10)
1. Convert serial watchlist/comparison loops to bounded parallelism.
2. Centralize frontend polling and dedupe requests.
3. Introduce distributed cache (Redis) with eviction and metrics.
4. Batch quote/analysis endpoints.
5. Move overview and AI heavy synthesis to async job pipeline.
6. Implement stale-while-revalidate for intelligence snapshots.
7. Add route-level throttling and provider circuit breakers.
8. Normalize AI/cache keys to reduce cardinality.
9. Reduce production logging payload size for AI services.
10. Add tenant/user data partitioning and relevant indexes.

This set of changes will materially improve throughput, reduce provider spend, stabilize tail latency, and make horizontal scaling predictable.