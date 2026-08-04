# ImpactOne Agent Platform — Next-Generation Architecture

**Phase:** POST-MVP-ARCHITECTURE-001. Companion to [POST_MVP_ARCHITECTURE.md](POST_MVP_ARCHITECTURE.md). Documentation only — a forward-looking design proposal, not an implementation. Every recommendation below is explicitly sequenced by dependency and scoped to close a specific, concretely-verified gap from the companion review, not a speculative rewrite.

---

## Guiding principle

**Every recommendation in this document closes a real, confirmed gap between this platform's own already-designed architecture and its currently-shipped reality — none proposes inventing a new architectural concept from scratch.** The Claim Intelligence Layer, the Unified Stock Intelligence engine's orchestrator-reuse pattern, and `scoringVocabulary.js`'s "one canonical registry" intent are all already well-designed; the work ahead is **connecting** what already exists correctly, not redesigning it.

---

## 1. Close the Engine → Bus → Claim gap (the single highest-value change)

**The problem (from `POST_MVP_ARCHITECTURE.md` §2, §4, §5):** 13 real domain agents exist; zero of them publish to the Intelligence Bus or form Claims. The platform's own best-designed reasoning layer (confidence-vs-probability separation, dominance caps, governance, lifecycle, append-only audit trail — all independently re-verified as excellent in this engagement's own `AI-CORE-001-REVIEW`) sits unused.

**Recommended approach — a proof-of-concept, not a big-bang migration:**
1. Pick **one** already-real agent with a clean, already-well-modeled confidence breakdown (the Options Agent is the natural choice: it is the oldest real agent, its `optionsAnomalyConfidence` is already a registered `scoringVocabulary.js` entry, and it is the one domain this engagement's own `AI-CORE-001-REVIEW` explicitly cited as the intended first real Bus publisher).
2. Wire its real execution path to call `intelligenceBusService.publishEvent()` with its real signal, exactly matching the event shape already exercised by `intelligenceBusService.test.js`'s own fixtures (`optionsSweepEvent()` — confirmed this session to be a realistic, already-well-formed shape).
3. Let `claimFormationService.ingestBusEvent()` (already real, already tested against this exact event shape) form a real Claim from it — no new Claim-Layer code is needed, only a new caller.
4. **Explicitly do NOT migrate all 13 agents at once.** Validate the one real end-to-end path first (a single domain agent → Bus → Claim → `DecisionTrace.evidenceReferences`), confirm it in production with real traffic, and only then extend to a second agent.

**Why this is sequenced first:** every other recommendation in this document either depends on this connection existing (the confidence-calibration work in §3 is far more valuable once Claims — not raw per-agent confidence numbers — are the unit of comparison) or is independent of it (the registry/scheduler work in §4-§5) — this is the one item that unlocks the most other value per unit of effort.

## 2. Make `agentSelector.js` registry-driven, not hand-maintained

**The problem (`POST_MVP_ARCHITECTURE.md` §1, §9):** `technical` and `fibonacci` are silently absent from Unified Stock Intelligence's `TARGET_AGENT_IDS`, and this class of gap is structurally possible again for any future agent whose implementation phase forgets to also touch `agentSelector.js`.

**Recommended design:** invert the list from an **inclusion allowlist** to an **exclusion denylist** — default to "every currently-registered agent with a per-symbol-relevant `category`" (all except the market-wide `sentiment` id, which already has a documented, deliberate exclusion reason) and require a new agent to be *explicitly excluded*, not explicitly included, to be left out of Unified Stock Intelligence. This makes the "a new real agent silently isn't included anywhere" failure mode structurally impossible rather than merely unlikely, while preserving the exact same "never fabricated, honestly shorter if one is missing" behavior `selectUnifiedIntelligenceAgents()` already documents.

**Immediate, zero-risk fix regardless of the above redesign's timeline:** add `"technical"` and `"fibonacci"` to the existing `TARGET_AGENT_IDS` array today — a one-line change closing the cheapest, most concrete gap in this whole review, independent of whether the larger inclusion-model redesign is ever pursued.

## 3. Establish a genuine cross-agent confidence-calibration contract

**The problem (`POST_MVP_ARCHITECTURE.md` §4, §5):** 13 independently-designed confidence formulas exist, each individually honest and well-documented, but mutually incomparable.

**Recommended approach — documentation and registration, not formula unification:** do **not** force all 13 agents onto one shared numeric formula (their underlying data-availability shapes are genuinely too different — Institutional's manager-coverage-based approach and Macro's data-source-availability approach are each correctly suited to their own domain). Instead:
1. **Register each agent's real confidence formula as a new `scoringVocabulary.js` `SCORE_DEFINITIONS` entry** (e.g., `institutionalConfidence`, `macroConfidence`), documenting its real formula/weights/fallback exactly as `optionsAnomalyConfidence` already does — this alone makes the 13 formulas *discoverable and comparable-in-principle* without requiring any of them to change.
2. **Add one new, thin, shared field to every agent's output**: a `confidenceBasis` enum (e.g., `DATA_AVAILABILITY_WEIGHTED` / `COVERAGE_AND_CONVICTION_WEIGHTED` / `SOURCE_QUALITY_WEIGHTED`) — this does not change any agent's number, but lets any consumer (the Unified Stock Intelligence engine, a future dashboard) immediately see *which kind* of confidence claim it's looking at, directly extending this platform's own established "disclose the basis, don't fabricate false precision" discipline.
3. **Defer true numeric calibration** (making a 62 from Institutional genuinely equivalent in meaning to a 62 from Macro) until real Outcome-grading history exists for each agent — this mirrors the already-established, correct precedent in this platform's own Institutional research (`SmartMoneyScore`'s `verifiedTrackRecordWeight`, defaulting to 0 until earned) and the Claim Layer's own methodology-versioning discipline. Attempting to force-calibrate 13 formulas today, without real outcome data, would replace an honest "these aren't directly comparable yet" state with a false one.

## 4. Registry: move toward a shared-state-ready design without a premature migration

**The problem (`POST_MVP_ARCHITECTURE.md` §6):** the registry is a per-process singleton; horizontal scaling would silently fragment it.

**Recommended sequencing (do NOT jump straight to Redis):**
1. **Now:** no action required at current traffic — this remains correctly deferred, consistent with this whole engagement's own `AGENT_SCALABILITY.md`'s explicit "move to shared state before horizontal scaling, not before it's needed" sequencing.
2. **Before the first horizontal-scaling deployment:** introduce a thin `RegistryStateProvider` interface (in-process `Map` implementation today, a Redis-backed implementation later) so the *call sites* (`registerAgent`, `getRegisteredAgents`) never need to change again once a shared-state implementation is introduced — this is a pure interface-extraction refactor, safely doable at any time, with zero behavior change.
3. **Only once real multi-instance deployment is imminent:** implement the Redis-backed provider and cut over.

## 5. Scheduler: close the one remaining verification gap, then consider tiered concurrency

1. **Immediate:** directly confirm whether `agentScheduler.js`'s call to `metrics.reset()` (line 286) is a genuine periodic/bounded-growth safeguard or a narrower lifecycle-specific reset — this is a fast, cheap verification, not a design change, and should be resolved before any further scheduler work is prioritized.
2. **Once confirmed either way:** if unbounded growth is still possible in any real request path, add a simple fixed-size ring-buffer cap to `waitMsSamples`/`execMsSamples` (the same class of fix already correctly applied to `AgentExecutionLog`'s own `DEFAULT_MAX_RECORDS`).
3. **Longer-term (not urgent at today's scale):** consider a tiered concurrency model — the flat `DEFAULT_CONCURRENCY=20` treats a fast, cheap agent (e.g., Coverage Score's peer-percentile lookup) identically to a slow, expensive one (e.g., a real-time securities-lending vendor call) — a priority/cost-aware scheduling tier would be a natural evolution once real agent execution-time data (already collected by `schedulerMetrics.js`) shows a genuine, material spread.

## 6. Provider registry: add a queryable metadata layer

**The problem (`POST_MVP_ARCHITECTURE.md` §3):** 22 providers in one flat array, with no way to query "give me only the real, configured ones."

**Recommended design:** extend `baseProviderContract.js`'s existing shape validation with 2-3 new, already-informally-present-but-unstructured metadata fields, formalized: a `status` enum (`REAL` / `STUB_HONEST` / `FIXTURE_ONLY`, directly derivable from whether a provider uses `honestStubFetch` today), and reuse each provider's already-real `configurationRequirement` string field (confirmed present on `tipranksProvider.js` and others) as a first-class, queryable property rather than only a code comment. This is a metadata-layer addition, not a contract-breaking change — every existing provider continues to work unmodified.

## Explicitly out of scope for now

- **Do not attempt to force all 13 agents' confidence formulas into one shared numeric computation** (§3) — their underlying domains are genuinely different enough that this would replace honest heterogeneity with false uniformity.
- **Do not migrate the registry to Redis before a real multi-instance deployment is imminent** (§4) — this would be solving a problem that does not yet exist, at real engineering cost.
- **Do not wire all 13 agents into the Claim Layer simultaneously** (§1) — validate one real end-to-end path first.
