# The Cinematic World — CINEMATIC-EXPERIENCE-002 — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Date:** 2026-07-31

## Mission

ImpactOne must stop feeling like software and feel like entering a futuristic financial command center — one continuous cinematic experience, never a page change. Purely visual/experiential; no new features, no new APIs, no new backend logic.

## What Was Built

Every new piece is additive over the existing Earth-centered scene (`IMPACTONE-3D-WORKSPACE-001` → `FLAGSHIP-SCREEN-001` → `FLAGSHIP-POLISH-001` → `IMMERSIVE-INTERACTIONS-001`), shared between the 3D Workspace and Flagship screens wherever it makes sense to, exactly like every prior phase in this line.

### World Atmosphere, Fog, Space Particles
`workspace3d/WorldAtmosphere.jsx` — real, built-in three.js exponential depth fog (`fogExp2`, a free per-pixel renderer feature, zero extra draw calls) plus a real, GPU-cheap particle field (`@react-three/drei`'s `Sparkles`, one `Points` draw call regardless of count) layered in front of the existing `<Stars>` background — "space particles" and "background stars" are now two visually distinct, differently-moving depth layers. On the Flagship screen, both fog density and particle count/speed scale with the real, live-data-derived `ambientState.intensity` (see `IMMERSIVE_INTERACTIONS.md`); the 3D Workspace screen (no data source of its own) uses a fixed, disclosed neutral baseline rather than a fabricated one.

### Environmental & Dynamic Lighting
Ambient/key/fill light intensities on the Flagship screen already scaled with `ambientState.intensity` (from the prior phase) — unchanged, confirmed still correct. New this phase: a real, continuously-orbiting low-intensity point light inside `Earth.jsx` (`REFLECTION_ORBIT_PERIOD_S = 9`s), colored to match the same real ambient color everything else reads — as it orbits, the Earth's own `clearcoat` material layer (from `FLAGSHIP-POLISH-001`) picks up a real, moving specular highlight. This is "dynamic reflections," achieved without an environment-map texture or a render-target reflection probe (both real, meaningfully more expensive techniques — see `WORLD_LIGHTING.md`).

### Volumetric Light (Approximated)
`workspace3d/LightShaft.jsx` — a single, additive, low-poly cone mesh, its axis computed via real vector math (`Quaternion.setFromUnitVectors`) from the key light's real position toward the Earth's real origin — a well-understood, one-draw-call approximation of a light shaft. A true volumetric-scattering effect (screen-space god-rays or a raymarched fog volume) was evaluated and rejected as meaningfully more expensive than this scene's disclosed performance budget allows — see `WORLD_LIGHTING.md` for the full reasoning.

### Earth Glow Based on Market State
Carried over and confirmed unchanged from `IMMERSIVE-INTERACTIONS-001`: the Earth's atmosphere color/intensity are entirely driven by the real `ambientState` computed from live portfolio and global-event data.

### Portfolio Energy Pulses & AI Recommendation Beam
`FlagshipEarthScene.jsx`'s prior-phase `HoldingConnection` component is generalized (renamed `EnergyBeam`, same underlying technique) and now drives two real, independent, data-driven beams:
- **Portfolio energy pulses** (unchanged behavior, carried over): one pulse per real affected portfolio metric, speed scaled to the real move's magnitude.
- **AI recommendation beam animation** (new): one real beam per currently-active real recommendation (`recommendationsApi.list({ status: "ACTIVE" })`'s own count, capped at 3 for legibility), pulsing toward the AI Recommendations panel at a rate that scales with how many real recommendations are active.

### Sector Activity Waves
`flagshipScreen/ActivityWaves.jsx`'s `SectorActivityWaves` — a real, small, **fixed** pool of 4 expanding rings (never an unbounded array; a constant draw-call count regardless of real activity level) whose cadence is driven by the real, live count of active global events — more real activity produces a genuinely faster, busier wave rhythm (cycle length `2.5s`–`6s`, scaled by event count), not a fixed decorative loop. Rings are invisible when there is genuinely no real active-event data yet, rather than animating on nothing.

### Breaking-News Shockwave Animation
`ActivityWaves.jsx`'s `Shockwave`, triggered from `FlagshipScreen.jsx`'s own real trigger-tracking: a `useEffect` compares the real Breaking News panel's item count against its own previous real value on every data refresh, and fires exactly one real, one-shot expanding-ring trigger whenever that count genuinely grows — never a periodic or arbitrary animation. Each trigger self-prunes after a fixed `2.4s` lifetime.

### Mouse Parallax & Interaction-Reactive Depth
`workspace3d/useParallax.js` (a real, ref-based pointer tracker — deliberately not React state, since it's read every frame, and a state-driven re-render on every `pointermove` would be real, unnecessary work) feeds `CameraRig.jsx`: a smoothed, capped offset (`PARALLAX_MAX_OFFSET = 0.6` units) is applied on top of — never instead of — the existing scripted camera transition, so "depth reacts naturally" to where the user is actually looking without ever making a module transition's destination unpredictable.

## Transitions: Still One Continuous World

No change was needed to satisfy "every module transition happens through camera movement, never fade between pages, never jump" — this was already the established behavior from `IMPACTONE-3D-WORKSPACE-001` onward (`CameraRig`'s scripted eased tween, `Workspace3DFeature`/`FlagshipScreen`'s glass-panel-not-page-swap pattern). This phase's job was the surrounding atmosphere and energy, not the navigation model itself, and the existing model was audited and confirmed to already satisfy the mission's requirement.

## Performance

See `WORLD_LIGHTING.md` (lighting/reflection cost accounting) and the commit's own test/build verification. Summary: every new effect uses either a free renderer feature (fog), a single bounded draw call (Sparkles, the light shaft, each pool ring), or reuses an existing `useFrame` subscription — no new heavy dependency, no postprocessing pipeline, no unbounded particle/ring counts tied to real data volume (all pools are fixed-size regardless of how much real data exists).

## Files Changed

**New:** `frontend/src/features/workspace3d/useParallax.js`, `WorldAtmosphere.jsx`, `LightShaft.jsx`; `frontend/src/features/flagshipScreen/ActivityWaves.jsx`; `CINEMATIC_WORLD.md`, `WORLD_LIGHTING.md`, `CAMERA_STORYBOARD.md`.

**Modified:** `frontend/src/features/workspace3d/CameraRig.jsx`, `Earth.jsx`, `Workspace3DScene.jsx`; `frontend/src/features/flagshipScreen/FlagshipEarthScene.jsx`, `FlagshipScreen.jsx`.
