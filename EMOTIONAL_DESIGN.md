# EMOTIONAL_DESIGN.md — The Emotional Language of ImpactOne

**Phase:** EMOTIONAL-DESIGN-001. Documentation only — no production code changed (mission's own instruction: "No production code unless required for validation"; none was required). Checked `git log` fresh first — one new, highly relevant commit since the last phase, `7ab2f41` *"feat(frontend): turn real financial intelligence into spatial visual objects"* — real, tested `visualizationMappings.js` (`confidenceToIntensity`, `memberRole`, `recommendationActionColor`) plus 7 new components (`AgentConstellation`, `ConfidenceHalo`, `CompanyClusters`, `ClaimNetwork`, `HistoricalTimeline`, `ImportancePulse`, `CapitalFlowLines`). This phase's document set treats these — plus every earlier real primitive (`ambientState.js`, `EnergyBeam`, `ActivityWaves`, `WorldAtmosphere`, `LightShaft`) — as the real instrument this emotional language is played on, not a new, separate effects system.

**Scope discipline, stated up front**: *"No new functionality. No layout changes. Only emotional design."* Every state defined in this document set is a specific, named combination of settings applied to real, already-shipped rendering primitives, driven by real, already-computed data (`ambientState.computeAmbientState`, `confidenceToIntensity`, `memberRole`) — never a new component, never a new API call, never fabricated intensity.

---

## Why markets have emotions, and why this platform should render them

A market is not a spreadsheet — it has moods, real ones, measurable in real data: volatility, event density, agent disagreement, confidence dispersion. ImpactOne already computes several of these honestly (`ambientState.js`'s tone/intensity, `chiefInvestmentOfficerService.js`'s `cio.confidence` categories, the committee's real agreement/disagreement structure). **This document set's entire job is to make those already-real numbers legible as a feeling, before a user reads a single word of text.**

## The governing constraint: emotion must never lie

Every prior phase in this engagement has repeatedly found and fixed cases where a visual signal implied more (or less) certainty/urgency than the real underlying data supported (the Daily Feed's fabricated-explanation bug, the still-unresolved `panelConfig.js` fixed-identity-color issue). **This document is the single highest-stakes place that discipline could be violated**, since it explicitly asks for emotional, felt design — the temptation to manufacture drama where the real data is calm (or vice versa) is real and must be named as the primary risk to guard against. The rule, stated once, binding for every state defined in the companion documents: **a state's visual intensity is always a direct, disclosed function of a real data value crossing a real, named threshold — never a fixed "this is what panic should look like" animation played regardless of what the real data says.**

## What this document set contains

- **[MARKET_MOODS.md](MARKET_MOODS.md)** — the 6 market-condition states the mission names (Calm, Bull, Bear, Panic, High Uncertainty, Major Geopolitical Events), each fully specified across the mission's 8 required dimensions.
- **[WORLD_STATES.md](WORLD_STATES.md)** — the 6 AI/agent/portfolio states (AI High Confidence, AI Low Confidence, Strong Agreement, Strong Disagreement, Portfolio Gains, Portfolio Losses), same 8 dimensions.
- **[EMOTIONAL_LANGUAGE.md](EMOTIONAL_LANGUAGE.md)** — the underlying grammar: how these 12 states are computed from real data, how they blend when several are true at once, and how transitions between them are paced so the scene never feels like it's flickering between moods.

## The real data spine every state in this document set reads from

| Real source | What it already computes |
|---|---|
| `ambientState.computeAmbientState()` | `{ tone: bullish/bearish/neutral, intensity: 0..1 }` from real portfolio `valueChangePct` and real active-event count |
| `chiefInvestmentOfficerService.js`'s `cio.confidence` | `HIGH_UNANIMOUS` / `MODERATE_MAJORITY` / `LOW_SPLIT` / `LOW_NO_SIGNAL` — mapped via `confidenceToIntensity()` |
| `committee.agreement`/`disagreement` | Real per-member agree/disagree/neutral roles, via `memberRole()` |
| `globalEvents.data.length` | Real active-event density — the same real signal already driving `ActivityWaves`' cadence |
| `portfolioHealth.data.valueChangePct`/`changes` | Real portfolio direction/magnitude — already driving holding-connection pulses |
| Real Fear & Greed reading (`marketApi.getQuote("SPY").fearGreed`) | An additional, independent real corroborating signal for Panic/Calm, not the sole source (see `MARKET_MOODS.md`'s Panic definition for how two real signals are combined honestly) |

No new field is introduced anywhere in this document set — every state is a named region of the space these already-real numbers occupy.
