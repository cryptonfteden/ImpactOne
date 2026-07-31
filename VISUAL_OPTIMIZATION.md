# Visual Optimization Notes — FLAGSHIP-POLISH-001

How this phase's visual improvements were chosen to raise perceived quality without raising the actual GPU/CPU budget beyond what the existing 60fps target can absorb. Complements `PERFORMANCE_NOTES.md` (React-side) and `FLAGSHIP_POLISH.md` (what changed).

## The Governing Principle

Every visual improvement in this phase was chosen from the same short list of "cheap wins" already established in the prior two phases (`IMPACTONE_3D_ARCHITECTURE.md`, `FLAGSHIP_IMPLEMENTATION.md`): a material-property change on an existing mesh, a CSS change on existing DOM, or a per-frame scalar update on an existing animation loop. Nothing in this phase adds a new mesh, a new light, a new postprocessing pass, or a new heavy dependency — the same disclosed tradeoff (no bloom/motion-blur pipeline, no per-pixel shaders) that let the original scenes hit 60fps on modest GPUs still holds after this phase.

## Material Changes (Zero New Draw Calls)

`Earth.jsx`'s base mesh switched from `meshStandardMaterial` to `meshPhysicalMaterial` with `clearcoat={0.35}` / `clearcoatRoughness={0.4}`. `MeshPhysicalMaterial` is a real, built-in three.js material — a superset of `MeshStandardMaterial` — so this is a drop-in property change on the *same single mesh* that already existed, not an additional mesh or an additional render pass. The clearcoat layer does add a small, fixed per-pixel cost to that one mesh's own shader (a second specular lobe), but it's a well-understood, GPU-native feature designed for exactly this kind of subtle "coated" look at negligible cost — not a custom shader with unknown cost.

## Shadows: The One Real New GPU Cost, Deliberately Bounded

Enabling `shadows="soft"` is the one genuinely new cost this phase introduces (see `PERFORMANCE_NOTES.md` for the sizing rationale — capped at a 1024×1024 shadow map on the single existing `directionalLight`, not a higher default). Two things kept this bounded:

1. **Only one light casts shadows.** The scene's other two lights (`ambientLight`, the cool-blue fill `pointLight`) were never shadow-casting and remain so — adding shadow-casting to every light would multiply the shadow-map render cost per additional light; this phase adds it to exactly the one light that already requested it via `castShadow` (which, until this phase, was a no-op — see `FLAGSHIP_POLISH.md`).
2. **Few shadow-casting/receiving objects.** Only `Earth` (`castShadow` + `receiveShadow`) and each `OrbitalNode` (`castShadow`) participate — there is no ground plane, no large receiving surface, and no attempt to add one. A shadow-map render pass's cost scales with the number and complexity of objects it has to draw, not just its resolution; keeping the shadow-casting set small was as deliberate as keeping the resolution modest.

## Per-Frame Animation Additions (Negligible CPU Cost)

Three new/changed per-frame updates were added this phase, each a single scalar operation inside a `useFrame` callback that was already running every frame regardless:

- Earth's atmosphere shell opacity (`Math.sin(...)` — one trig call, one assignment).
- `OrbitalNode`'s hover-driven scale multiplier (`isHovered ? 1.12 : 1` — one boolean check already sitting inside the pulse calculation that existed before).
- `CameraRig`'s eased-tween math (`easeInOutCubic` — a handful of arithmetic operations, replacing rather than adding to the prior exponential-lerp math that also ran every frame during a transition).

None of these introduce a new `useFrame` subscription (a real, measurable cost in scenes with many objects, since each subscription is called once per object per frame) — they all extend an existing one.

## What Was Deliberately Not Done

- **No increase to Earth's polygon count** (still 48×48/32×32/32×32 segment spheres) — the realism gain came from material properties and lighting, not geometry density.
- **No bloom/glow postprocessing pass** — the atmosphere "glow" is still the same cheap additive transparent shell from the prior phase, just with an animated opacity; a real bloom pass would be a full-screen postprocessing effect with a meaningfully higher, harder-to-bound cost.
- **No increase to `<Stars>` particle count** (1200/1500, unchanged) — ambient depth was already cheap; this phase didn't touch it.
- **No texture assets added** — Earth remains fully procedural (no image download, no additional VRAM for a texture, no impact on the already-measured lazy-loaded bundle size from the prior phases).

## Verification

Same disclosed constraint as the two prior 3D phases: no headless-browser/WebGL tool is available in this environment to directly screenshot or frame-rate-profile the live scene. Verification here is a real production build succeeding, the full test suite passing, and the reasoning above tracing every new visual effect back to a known-cheap three.js technique rather than an unbounded one. A manual, real-browser frame-rate check remains a recommended follow-up before wide rollout, exactly as noted in `IMPACTONE_3D_ARCHITECTURE.md` and `FLAGSHIP_IMPLEMENTATION.md`.
