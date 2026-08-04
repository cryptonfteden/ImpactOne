# ImpactOne — Five-Year Architecture Roadmap
## Sprint 19: Evolution Plan from 100 to 1,000,000 Users

**Status:** Design only. No code, migrations, or commits are part of this deliverable.
**Assumption:** ImpactOne succeeds and grows through five milestones — 100, 1,000, 10,000, 100,000, and 1,000,000 users.
**Continuity:** This roadmap assumes the foundations named in `IMPACTONE_CTO_REVIEW.md` are addressed early (auth, CI, Docker, secrets management — see the 100-user stage below) and evolves the five-engine platform defined in `INTELLIGENCE_PLATFORM_BLUEPRINT.md` (Research Intelligence, Knowledge Graph, Thesis, Alpha Attribution, Portfolio Intelligence) plus the existing Recommendation Engine/`DecisionTrace` synthesis layer, at each stage.

**A note on what does and doesn't scale with users, stated once up front because it shapes every stage below:** the Research Intelligence Engine's core ingestion (SEC filings, macro releases, 13F, patents, government data, most news) is a *shared corpus* — its cost is roughly independent of user count. What scales with users is *personalization*: per-user/per-portfolio query fan-out, Thesis evidence-binding against more active theses, Recommendation Engine runs, and committee synthesis. Every stage's cost and bottleneck analysis below reflects this split, not a naive "more users = proportionally more of everything" assumption.

---

## Milestone: 100 users

This stage is less about load and more about building the foundations named in the CTO review before real users arrive — it is the migration from prototype to a small, correct, real system.

- **Infrastructure.** One to two app instances behind a basic load balancer, containerized (Docker + docker-compose), deployed to a single managed PaaS/container host (e.g., a single ECS service, Fly.io, or Render — no Kubernetes yet; that would be premature complexity for this load).
- **Databases.** Single managed Postgres instance (small tier). Add nullable `userId`/`tenantId` columns to every table now, even though usage is still effectively single-tenant — this is the cheapest point in the platform's life to do this migration, and the CTO review named it explicitly as urgent-while-cheap.
- **Caching.** Replace the in-memory `Map()` caches with a single small Redis instance. Cheap, and removes the single biggest correctness blocker to any future horizontal scaling.
- **Queueing.** Introduce a lightweight Redis-backed queue (e.g., BullMQ) and move `POST /recommendations/run` off the synchronous request path now — before UI code hardens around "await and refresh," which gets progressively more expensive to unwind.
- **AI orchestration.** Still single-provider (OpenAI), the existing 4-6 LLM touchpoints, deterministic-fallback discipline unchanged. Begin embedding-based classification using the `pgvector` extension on the existing Postgres instance — no new infrastructure required to start replacing keyword matching.
- **Research pipeline.** RIE ingestion begins with the cheapest, highest-value, most structured sources first — SEC filings, 13F, Form 4 insider filings, macro/government calendars — all free or low-cost and user-count-independent. Social sources (Reddit, X) are introduced with tight pre-filtering from day one, since even at 100 users an unfiltered social firehose is disproportionately expensive.
- **Knowledge Graph.** Bootstrapped from seed reference data (sector classifications) plus first evidence-derived edges from the structured sources above. Relational model inside the existing Postgres instance — no separate system.
- **DecisionTrace evolution.** Mechanism unchanged (immutable Postgres rows). Volume is trivial; no partitioning needed yet, but the retention policy is written down now, even if not yet enforced by infrastructure.
- **Committee evolution.** Single shared/global committee run, as today — fine at this volume, personalization is not yet worth its cost.
- **Alpha Attribution evolution.** Not yet automated. A manual/scripted quarterly grading pass against the (still small) `DecisionTrace` history is sufficient; the schema exists per the Sprint 18 design, but the pipeline can be semi-manual.
- **Cost optimization.** The dominant real cost lever at this stage is LLM/provider API calls, not infrastructure (infra is a rounding error, a few hundred dollars/month). Pre-filtering and caching matter more than any infra decision here.
- **Team structure.** One to three engineers, full-stack generalists. This team should execute the CTO review's top-15 foundational cleanup items (CI, secrets manager, Docker, dependency pinning, rate limiting) alongside or before onboarding first real users.
- **Deployment architecture.** Dev + prod split at minimum. CI (GitHub Actions) running the existing test suite on every PR — currently entirely absent and the single highest-ROI item available.
- **Multi-region.** None. Single region, accepted explicitly as a tradeoff, not an oversight.
- **Disaster recovery.** Automated daily Postgres backups with point-in-time recovery on the managed provider. This is table-stakes the moment real portfolio (money-shaped) data exists and should not be skipped even at this size.
- **Bottlenecks.** None from load. The only bottleneck at this stage is the set of missing foundations named in the CTO review (auth, secrets, CI, deployment) — this milestone exists to close them, not to handle scale.
- **Migration strategy.** This entire stage *is* the migration — from a single-tenant local prototype to a small, correctly-foundationed, multi-tenant-ready, queued, cached, containerized system. Every later stage's velocity depends on getting this one right rather than skipped in the rush to "just ship."

---

## Milestone: 1,000 users

- **Infrastructure.** Two to four stateless app instances behind a real load balancer — genuinely needed now, not premature, because the app tier is already stateless from the 100-user Redis/queue migration.
- **Databases.** Still a single Postgres primary, but add a read replica for read-heavy endpoints (dashboard, portfolio views) and introduce connection pooling (PgBouncer or equivalent).
- **Caching.** Redis becomes load-bearing rather than optional — cache hit-rate monitoring introduced so cache effectiveness is visible, not assumed.
- **Queueing.** The Redis-backed queue now carries not just `/run` but the full RIE ingestion and Thesis evidence-binding event stream from the Sprint 18 design. Queue depth becomes a real metric to watch.
- **AI orchestration.** A second LLM provider is introduced for genuine resilience (not just deterministic-text fallback) — both cost concentration and outage risk are now real at this volume. Prompt caching adopted to control spend.
- **Research pipeline.** Full 14-category RIE source coverage is now justified. Ingestion cost is still largely user-count-independent, but personalized query fan-out (news/Reddit/X per watchlist) needs the shared-cache decoupling designed into RIE (fetch once, personalize downstream) to avoid the cost curve going linear with users.
- **Knowledge Graph.** Graph size grows meaningfully with broader source coverage. Still relational Postgres; exposure-path precomputation becomes a real scheduled job rather than an incidental one.
- **DecisionTrace evolution.** First partitioning pass (by month/quarter), applying the retention policy defined at the 100-user stage rather than deferring it further.
- **Committee evolution.** Light personalization begins — committee runs segmented by user cohort (e.g., dominant watchlist sector) rather than one fully global run, a cheap first step short of full per-user compute cost.
- **Alpha Attribution evolution.** The grading sweep is automated (a real scheduled job, no longer manual). Enough graded volume now exists for the first genuinely meaningful recalibration proposals.
- **Cost optimization.** Per-user/per-cohort LLM budget caps become necessary, not optional, as a real cost-governance layer.
- **Team structure.** Four to eight engineers. First semi-dedicated roles emerge: one engineer leaning into the data/ML pipeline (RIE/Knowledge Graph), one leaning into infra/SRE, part-time.
- **Deployment architecture.** CI/CD becomes a hard merge gate (not advisory). A real staging environment, distinct from production, is introduced.
- **Multi-region.** Still single region. DR posture upgrades to include a documented, tested restore drill — not just backups existing untested.
- **Disaster recovery.** First real DR test: restore from backup into a clean environment and verify.
- **Bottlenecks.** The scheduler and cache correctness assumptions from the 100-user stage get their first real test under concurrent load — this is the first honest signal on whether those foundations actually hold.
- **Migration strategy.** Purely incremental — no rewrites. Replica, second provider, partitioning, and CI gate are layered onto the same architecture validated at 100 users, not a re-architecture.

---

## Milestone: 10,000 users

- **Infrastructure.** Full horizontal autoscaling app tier. Container orchestration (Kubernetes or a managed equivalent — ECS/Fargate/Cloud Run) is now genuinely justified rather than premature.
- **Databases.** Read replicas scaled further; the first real conversation about sharding or tenant/time partitioning for the largest tables (`Recommendation`, `DecisionTrace`, `Event`). Managed Postgres tier upgraded substantially.
- **Caching.** Redis graduates to a proper cluster (not a single node), with eviction and monitoring audited for correctness under real concurrency.
- **Queueing.** Likely graduates from a Redis-backed queue to a more durable, higher-throughput broker (managed SQS-class, or managed Kafka) — flagged as *likely*, contingent on measured throughput, not assumed on a fixed timeline.
- **AI orchestration.** Multi-provider routing matures into real cost/quality-based routing, not just failover. If `pgvector`'s performance ceiling is reached by embedding volume, a dedicated vector store is evaluated — contingent on measurement, not assumed in advance.
- **Research pipeline.** Ingestion cost remains largely user-count-independent (the core insight preserved from the 1,000-user stage); the dominant cost driver shifts to personalization/consumption-side compute (Thesis evidence-binding, per-user ranking). This is the stage where the platform's cost curve bends from ingestion-dominated to personalization-dominated — worth naming explicitly for budgeting.
- **Knowledge Graph.** The stage where a dedicated graph database becomes worth evaluating in earnest, per Engine 2's own design ("revisit only if traversal patterns outgrow the relational model") — Thesis Engine and Portfolio Intelligence Engine traversal volume likely justifies the migration now.
- **DecisionTrace evolution.** Full time-based partitioning enforced; older partitions rolled to a cheaper storage tier. Never deleted — immutability preserved, only storage tiering changes.
- **Committee evolution.** Real per-user (or per-portfolio) personalized committee runs become feasible and expected — cohort-batching from the 1,000-user stage is no longer sufficient once holdings diversity across the user base is high.
- **Alpha Attribution evolution.** The recalibration loop (Sprint 18, Engine 4) is fully live — enough graded history exists for statistically meaningful automated proposal generation. The human-approval gate is likely still retained; this is the stage where enough real data exists to responsibly revisit that governance decision, not before.
- **Cost optimization.** LLM/provider spend is now a genuine budget line item. Dedicated cost-monitoring dashboards and anomaly alerts are required, not optional.
- **Team structure.** Fifteen to thirty-plus engineers. Dedicated platform/infra team; dedicated data/ML team owning RIE + Knowledge Graph + Alpha Attribution; dedicated product engineering team(s). A real team topology emerges.
- **Deployment architecture.** Services are likely extracted from the monolith where operational boundaries demand it (e.g., RIE ingestion workers deployed separately from the main API) — extraction is justified case-by-case, not a blanket microservices rewrite.
- **Multi-region.** First real multi-region conversation, likely starting with read replicas in a second region for latency — not yet active-active writes.
- **Disaster recovery.** DR drills become routine and scheduled (quarterly); RTO/RPO targets formally defined and tested against, not just aspirational.
- **Bottlenecks.** Single-region write availability, aggregate LLM provider rate limits, Knowledge Graph traversal latency, and `DecisionTrace`/`Event` table size are all real now, not theoretical.
- **Migration strategy.** The first stage requiring genuinely sequenced live migrations (sharding, DB tier upgrades, possible service extraction). This needs a real migration playbook, feature flags, and rollback plans — additive changes alone are no longer sufficient.

---

## Milestone: 100,000 users

- **Infrastructure.** A mature multi-service architecture (ingestion, thesis/graph processing, recommendation synthesis, and the portfolio engine likely separate deployable services by now). Full autoscaling; infrastructure-as-code is mandatory given the operational surface area, not optional.
- **Databases.** Sharding or tenant-partitioning likely necessary for the largest tables. Historical/analytical data (graded outcomes, aged `DecisionTrace` records) likely moves to a dedicated analytical (columnar/OLAP) store, separate from the OLTP path, since the two workloads' access patterns have diverged sharply by this size.
- **Caching.** Multi-region cache topology if multi-region compute is live. Cache invalidation correctness becomes a first-class engineering discipline with its own tooling and monitoring, not an implicit assumption.
- **Queueing.** A managed, durable, high-throughput broker (Kafka-class or equivalent) fully in place, likely with multiple topic domains (ingestion, thesis-binding, notification, recalibration) rather than one shared queue.
- **AI orchestration.** Plausibly the stage where a proprietary/fine-tuned model — trained on the platform's own accumulated `DecisionTrace` and Alpha Attribution outcome data — becomes viable. The moat data asset named since Sprint 17 likely has enough volume by now to train something genuinely differentiated, not just inform weight recalibration.
- **Research pipeline.** Ingestion is now industrial-scale data engineering in its own right, with dedicated ownership and likely direct commercial data-provider relationships for the highest-value sources, not just public APIs.
- **Knowledge Graph.** Dedicated graph database fully justified and likely already migrated by this point; graph scale and query complexity warrant their own operational discipline, distinct from the OLTP database.
- **DecisionTrace evolution.** Hot → warm → cold archival tiering fully automated. Queryable historical analytics served from the separate analytical store rather than the live partitioned OLTP tables directly.
- **Committee evolution.** Specialized sub-committees likely introduced (per asset class, per strategy style) rather than one generic committee — matching the strategy diversity of a 100,000-user base.
- **Alpha Attribution evolution.** Track-record data is mature enough that it plausibly becomes an external-facing product surface itself (the "second business line" named as future evolution for Engine 4) — a real product decision to make at this stage, not before there's enough track record to make it credible.
- **Cost optimization.** A dedicated FinOps function/role. Reserved-capacity and committed-use pricing negotiated with cloud and LLM providers, given a now-predictable baseline volume.
- **Team structure.** Sixty to one-hundred-fifty-plus engineers. A full platform organization: infra, data/ML, multiple product engineering teams, an SRE/on-call rotation, a security team, and FinOps — genuinely a mid-size engineering organization by this point.
- **Deployment architecture.** Progressive delivery (canary/blue-green) is standard, not optional, given the blast radius of a bad deploy at this user count.
- **Multi-region.** Active-active or active-passive multi-region for both compute and (with real care) data — driven by both latency and, plausibly, data-residency/regulatory requirements if the user base is now international.
- **Disaster recovery.** Formal DR runbooks, automated failover tested regularly, RPO/RTO targets tightened relative to the 10,000-user stage.
- **Bottlenecks.** Cross-region data consistency; true-scale LLM cost (the single largest financial risk absent the proprietary-model investment above); organizational coordination overhead itself becomes a real bottleneck (Conway's-law territory, not a purely technical one).
- **Migration strategy.** Migration discipline is now a *standing practice*, not a one-time event — the team should have a real, reusable migration/rollout framework in place by now, not be inventing one under pressure during an incident.

---

## Milestone: 1,000,000 users

- **Infrastructure.** A full-scale distributed system, leaning on managed platform services wherever plausible rather than reinventing infrastructure the team doesn't need to own. Global edge presence for static and API-adjacent surfaces.
- **Databases.** A mature, sharded, multi-region, genuinely polyglot-persistence architecture — OLTP for live portfolio/trace data, OLAP/columnar for analytics and attribution, a graph store for the Knowledge Graph, a vector store for embeddings, object storage for raw archival — each piece justified by measured need at this point, not adopted speculatively earlier.
- **Caching.** A globally distributed cache layer; cache correctness and consistency are a dedicated, ongoing engineering discipline, not a solved-once problem.
- **Queueing.** An enterprise-grade streaming backbone (Kafka-class, at real scale) serves as the platform's central nervous system, connecting all five engines' event flows to one another.
- **AI orchestration.** Proprietary model(s) trained on the platform's own outcome data are plausibly a core product differentiator by now — this is the realization of the moat thesis first named in Sprint 17. Multi-model orchestration (proprietary plus best-of-breed third-party) with real cost/quality/latency-based routing.
- **Research pipeline.** RIE is, by now, enterprise data-engineering infrastructure in its own right — a credible candidate to spin into the "second business line" (licensing the structured, cross-validated event stream) named as a future-evolution option in the Sprint 18 design.
- **Knowledge Graph.** Large-scale distributed graph processing, likely with its own specialized team, distinct from the core data/ML organization.
- **DecisionTrace evolution.** The accumulated corpus is now a genuinely valuable, large-scale training dataset. Its stewardship — governance, access control, potential external research partnerships — is a real institutional concern by this point, not purely an engineering one.
- **Committee evolution.** Potentially many specialized, continuously-tuned committees, each itself calibrated by Alpha Attribution's outcome data — the "committee" concept has fully evolved from a fixed five-agent prompt template into a continuously recalibrated ensemble.
- **Alpha Attribution evolution.** The recalibration loop is the platform's central nervous system for self-improvement at this scale — likely running continuous (not batch/periodic) recalibration, with tight automated guardrails and backtesting given the stakes of getting it wrong at this volume.
- **Cost optimization.** A continuous, dedicated discipline with real enterprise negotiating leverage. The proprietary-model investment above is itself the biggest lever against per-call third-party LLM cost at this volume.
- **Team structure.** Several hundred engineers; full organizational structure with dedicated leadership per major engine/domain — a real Conway's-law alignment between the org chart and the five-engine architecture, not an incidental resemblance.
- **Deployment architecture.** A mature internal developer platform; deployment is a solved, largely self-service problem for product teams by this point.
- **Multi-region.** Full global multi-region active-active. Data residency and regulatory compliance are a first-class, continuous concern, not a one-time project.
- **Disaster recovery.** Continuous, exercised via regular chaos-engineering practice rather than periodic scheduled drills alone.
- **Bottlenecks.** At this scale, the bottleneck shifts from technology to organizational and data/model-quality concerns. If the foundations from earlier stages were honored, the technical architecture itself should not be the limiting factor — the limiting factor becomes whether the platform's accumulated data and model advantage is real and defensible, i.e., whether the moat thesis actually paid off.
- **Migration strategy.** Migrations are executed by a dedicated platform team as a standing discipline, with zero-downtime as a hard requirement given the user base and stakes involved.

---

## Which architectural decisions should NEVER change

- **The advisory-only invariant.** No engine, at any scale, gains direct trade-execution or broker-connectivity authority without an entirely separate, explicitly-scoped initiative and governance decision. This is a product-safety commitment, not a technical one, and it should be treated as immutable across every stage of this roadmap.
- **`DecisionTrace` immutability.** Never gains an update path, at any scale — only ever superseded by new records, never mutated in place. This is what makes the entire Alpha Attribution/calibration flywheel trustworthy; mutating it once compromises both the audit chain and the moat it's meant to build.
- **Explainability by default.** Every recommendation carries a structured, human-readable explanation and a transparent, decomposed quality score — never a bare black-box output, regardless of how sophisticated the underlying models eventually become (including any proprietary model built at the 100K-1M stage). This is a product-trust commitment established in Sprint 16 that should outlive any specific implementation.
- **Deterministic-fallback-first for external dependencies.** The system should never hard-fail to a user because a provider is down. Graceful degradation with explicit staleness/completeness signaling is a permanent design principle, not a stage-specific workaround to be "cleaned up" later.
- **Contradiction is preserved as signal, never silently resolved.** A core epistemic commitment across the Knowledge Graph, Thesis Engine, and cross-source validation — disagreement between sources must never be quietly averaged away or hidden for a cleaner-looking UI.
- **Recalibration requires an auditable, backtested approval path.** Even if automatic-apply is eventually permitted at scale (plausibly by the 100,000-1,000,000-user stage), the backtest-and-audit-trail requirement itself never goes away — only the identity of the approver (human vs. automated-with-guardrails) may change.

## Which decisions should intentionally remain flexible

- **Specific database technology per workload** (whether a dedicated graph database, which vector store, which OLAP engine) — revisited at each stage against actually measured need, never locked in early on an assumption of future scale.
- **LLM provider(s) and the proprietary-vs-third-party model mix** — kept swappable via multi-provider routing from the 1,000-user stage onward; no permanent single-vendor commitment.
- **Queue/broker technology** (Redis-backed → managed broker → streaming backbone) — an intentionally evolving choice across the roadmap, not a single decision made once and fixed.
- **Team topology and org structure** — should track the five-engine architecture loosely, not rigidly, and be revisited at each milestone rather than fixed early.
- **Committee structure and composition** (agent count, specialization) — explicitly designed to evolve continuously based on Alpha Attribution's findings, never treated as a fixed, permanent product spec.
- **Deployment/orchestration platform** (PaaS → managed containers → full platform engineering) — matched to actual operational need at each stage, not chosen aspirationally ahead of it.
- **Multi-region topology and timing** — driven by actual latency and regulatory need as it emerges, not a fixed calendar date on this roadmap.

## Technologies likely to be replaced over the next five years

| Today | Likely replacement path |
|---|---|
| In-memory `Map()` caches | Redis (near-term — already a named blocker) |
| In-process `node-cron` scheduler | Leader-elected distributed scheduler → managed workflow orchestrator as job complexity grows across five engines |
| Hardcoded keyword-matching / 8-row historical-analog table | `pgvector` embeddings → dedicated vector database at higher scale |
| Single NewsAPI-only integration | Multi-provider news/data aggregation → direct commercial data licensing by the 100,000-user stage |
| Relational-only Knowledge Graph | Dedicated graph database at the 10,000-100,000-user stage |
| Redis-backed BullMQ | Managed broker (SQS-class) → streaming backbone (Kafka-class) as throughput grows |
| Single-provider (OpenAI-only) orchestration | Multi-provider routing → proprietary fine-tuned/trained models at large scale |
| Ad hoc, throwaway Playwright verification scripts | A real, committed, CI-integrated E2E suite — a near-term correction that should happen at the 100-user stage, not a five-year one |
| `.env`-file secrets | A real secrets manager — near-term and security-critical, the single most urgent item named in the CTO review |
| Single global Postgres instance | Read replicas → sharded/multi-region/polyglot persistence (a continuous evolution across every stage above, not one swap) |
| Manual/local deployment | Docker/PaaS → managed containers → full internal developer platform (also continuous, not one swap) |
