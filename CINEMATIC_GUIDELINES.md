# CINEMATIC_GUIDELINES.md — The Cinematic Language of ImpactOne

**Phase:** CINEMATIC-EXPERIENCE-001. Documentation only — no production code changed (mission's own instruction: "No production code unless required to validate the visual direction"; none was required). Checked `git log` fresh first — one new, highly relevant commit since the last phase, `306b4a5` *"feat(frontend): add the flagship screen (Earth-centered, 10 real intelligence panels)"* — the real, live implementation this whole document set elevates. Read alongside it: `FLAGSHIP_SCREEN.md`, `FLAGSHIP_LAYOUT.md`, `FLAGSHIP_IMPLEMENTATION.md`, and the underlying real code (`frontend/src/features/flagshipScreen/`, `frontend/src/features/workspace3d/`).

**Scope discipline, stated up front per the mission's own words**: *"Do not redesign functionality. Only redesign the experience."* Every guideline below is a presentation-layer elevation of the real, already-built, already-tested Flagship Screen and 3D Workspace — nothing here proposes a new panel, a new data source, a new API call, or a changed navigation model. Where a real defect is identified that undermines "every pixel communicates premium quality," it is named as a defect to fix, not a new feature to add.

---

## The one sentence that governs this whole phase

**ImpactOne's flagship screen is not a screen you look at — it is a room you walk into.** The mission's own emotional goal — *"the user should feel they entered the control room of global financial intelligence"* — is the literal design target for every principle below. A control room has: one unmistakable center of gravity (the Earth), instruments arranged with purpose around it (the 10 real panels), and an operator who commands it with deliberate, weighted gestures (the camera) — never a spectator scrolling a feed.

## Camera storytelling

The real, existing camera system (`CameraRig.jsx`'s frame-rate-independent exponential lerp, `LERP_SPEED = 2.2`) already gives every transition real physical weight — this document does not propose replacing it. What it elevates is **what the camera does when nothing has been clicked yet**:

- **A scripted entrance move, played exactly once per session-visit**, not looping: camera starts further back and slightly higher than `OVERVIEW_CAMERA`, then lerps into the real overview position over roughly 2.5-3 seconds as the scene's other elements resolve (see `FIRST_IMPRESSION.md` for the full timed sequence). This reuses the exact same real lerp mechanism already in the codebase — a different *starting* camera state, not new animation infrastructure.
- **No idle autonomous camera drift ever** — between the scripted entrance and any real user click, the camera holds perfectly still. Motion always means "you did something" or "you just arrived," never "the software is idly showing off." This directly continues the "nothing moves unnecessarily" discipline already established in `FLAGSHIP_COMPONENT_SPEC.md`.
- **Every panel-to-panel transition remains a single continuous camera move**, per the real, existing mechanism — this document adds no new transition type, since the real one already satisfies "cinematic transitions" and "natural timing" correctly.

## Stronger depth and floating layers

The real scene already has 3 real depth registers (Earth at origin, the 10-panel ring at `FLAGSHIP_RADIUS = 8`, the optional Mission Chain at `y = 3.5`) — all currently sitting in flat, single-value planes. Elevation:

- **A small, deterministic per-panel vertical stagger** (a fixed, tiny y-offset derived from each panel's own existing index — no new randomness, no new data dependency) breaks the perfectly flat ring into a shallow 3D arrangement, giving every camera angle real depth rather than only reading as "flat" from directly above.
- **A far, dim fourth register** behind the panel ring — sparse, non-interactive ambient light-points (reusing the existing, real, cheap `<Stars>` geometry already in the scene, simply extended in radius) — giving the whole environment a felt sense of extending beyond what's actually rendered, without adding new interactive geometry.

## Ambient atmosphere and volumetric feeling

Directly continuing (not replacing) `FLAGSHIP_STYLE_GUIDE.md`'s already-proposed lighting elevation (wide secondary gradient sweep, sparse volumetric light-shafts) — restated here as this phase's own binding requirement, since this mission names "volumetric feeling" as a first-class focus area in its own right: the environment itself, not just individual objects, must read as filled with something (soft light, faint drifting particulate/dust motes at the Horizon register) rather than being a perfectly clean, empty void with objects floating in it. This is what separates "control room" from "diagram."

## Purposeful, physical motion

Every animation in the elevated scene must pass the same test already established in `FLAGSHIP_COMPONENT_SPEC.md`: *name the real thing it communicates, or remove it.* This phase adds one new, explicit physical-motion rule: **any object that moves must decelerate before it stops** — no motion in this scene ever ends abruptly at a hard linear stop; every real animation (camera arrival, panel entrance, orbital pulse) already uses an ease-out-shaped curve, and this document makes that a permanent, non-negotiable rule for any future addition, since abrupt stops are the single fastest way to make a "premium, physical" scene feel cheap.

## What this document explicitly defers to its companions

- Exact typography/spacing/rhythm rules → [VISUAL_HIERARCHY.md](VISUAL_HIERARCHY.md).
- The concrete, area-by-area polish checklist (materials, glass, metal, light, reflections, gradients) → [PREMIUM_POLISH.md](PREMIUM_POLISH.md).
- The literal, second-by-second first-10-seconds sequence → [FIRST_IMPRESSION.md](FIRST_IMPRESSION.md).
