# INTELLIGENCE_VISUAL_LANGUAGE.md — A Visual Grammar for Every Kind of Intelligence

**Phase:** INTELLIGENCE-VISUAL-LANGUAGE-001. Documentation only — no production code changed (mission's own instruction: "No production code unless required for validation"; none was required). Checked `git log` fresh first — one new, highly relevant commit since the last phase, `fd389a2` *"feat(frontend): build a cinematic, continuous world around the Earth scenes"* — real, data-driven world atmosphere (`WorldAtmosphere.jsx`'s fog + `Sparkles`), a generalized `EnergyBeam` component (already used for both portfolio pulses and AI recommendation beams), `ActivityWaves.jsx`'s fixed-pool sector-activity rings, a real one-shot breaking-news shockwave, and mouse parallax layered on top of (never replacing) the scripted camera. This phase's document set treats these real, already-built primitives as the actual visual vocabulary this new intelligence-type language must be assembled from — not a parallel, disconnected effects system.

**Scope discipline, stated up front**: *"Do not redesign layout. Do not redesign functionality. Only define visual meaning."* Nothing here proposes a new panel, a new orbital position, or a new camera behavior — every rule below assigns *meaning* (shape, motion character, material, color temperature) to intelligence categories that already exist in this platform's real backend, expressed through real, already-shipped rendering primitives.

**One carried-forward note, briefly**: `panelConfig.js`'s hardcoded green/red identity colors (`portfolioHealth`, `fearGreed`) remain unfixed as of this phase — flagged at length across four prior phases (`FLAGSHIP_COMPONENT_SPEC.md` onward); not re-litigated in full detail here, but directly relevant to §Risk/§Opportunities below, since a fixed decorative color on a panel undermines exactly the kind of data-driven visual meaning this phase defines.

---

## The core idea: a data type's *feel* is a combination of 4 real, independent variables

Every one of the mission's 11 named intelligence categories is defined not by a single new color or icon, but by a consistent combination of four real, already-controllable rendering variables — the same four this whole scene already exposes through its real code (`ambientState.js`'s intensity, `EnergyBeam`'s pulse rate, `Earth.jsx`'s material properties, `ActivityWaves`' cadence):

1. **Motion character** — the qualitative shape of its animation curve (explosive one-shot vs. slow continuous breathing vs. jittery competing signals).
2. **Material weight** — how "solid," "heavy," or "ethereal" it reads (opacity, emissive intensity, edge sharpness).
3. **Color temperature** — where on the existing purple/blue/green/red palette (never a new hue family, per `BRAND_VISUAL_RULES.md` Rule 4) it sits, and how saturated/desaturated.
4. **Spatial behavior** — whether it stays put, radiates outward, pulls other elements toward it, or recedes into the background.

**A data type's "feel" is the specific, named combination of these four** — defined precisely, per category, in [DATA_VISUAL_DICTIONARY.md](DATA_VISUAL_DICTIONARY.md). The underlying rule system that generates consistent combinations (so a 12th future intelligence type can be added without inventing a fifth variable) is in [VISUAL_SEMANTICS.md](VISUAL_SEMANTICS.md). How multiple simultaneous types coexist in one real frame without visual conflict is in [WORLD_INFORMATION_DESIGN.md](WORLD_INFORMATION_DESIGN.md).

## Why this is possible without touching layout or functionality

Every real intelligence category the mission names already has a real, disclosed backend source in this codebase:

| Mission category | Real backend source already in this platform |
|---|---|
| Macro Intelligence | The real Macro domain agent; `altDataApi.getEvents()` (Macro Calendar panel) |
| News | The real News domain agent; `claimsApi.listOvernightChanges()` (Breaking News panel) |
| AI | `recommendationsApi`/AI Recommendations panel; the real Claim Intelligence Layer |
| Portfolio | `portfolioEngineApi.getPerformanceDelta()`; the real holding-connection pulses |
| Risk | Real per-claim risk signals; the real Fear & Greed reading |
| Opportunities | Real active `recommendationsApi` entries with a positive real thesis |
| Agent Agreement | `committeeIntelligenceApi.convene()`'s real Agent Consensus panel |
| Conflict | The real Claim Intelligence Layer's own disclosed contradiction detection |
| Historical Similarity | `historicalSimilarityService.js`'s real similarity scoring (post-`AI-TRUST-001`'s honest-zero fix) |
| Confidence | The real Claim Intelligence Layer's confidence value (kept separate from probability, per this platform's own long-standing discipline) |
| Importance | `autonomousMarketService.js`'s real, already-computed Importance Score |

Because every one of these is a real, already-fetched or already-computable value, every visual rule in this document set is a **presentation-layer mapping from an existing real number/category to an existing real rendering primitive** — never a new computation, never fabricated intensity.
