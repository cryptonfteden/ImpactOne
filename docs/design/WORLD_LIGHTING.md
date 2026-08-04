# World Lighting — CINEMATIC-EXPERIENCE-002

Real lighting/reflection technique inventory and cost accounting for the Earth-centered scenes. Complements `VISUAL_OPTIMIZATION.md` and `PERFORMANCE_NOTES.md` (prior phases' material/shadow reasoning, unchanged here) and `PERFORMANCE_REVIEW.md` (prior phase's per-frame cost accounting, still current).

## Light Inventory (Flagship Screen)

| Light | Type | Cost | Purpose |
|---|---|---|---|
| Ambient | `ambientLight` | free (no shadow, no position) | Base fill so nothing is pure black |
| Key | `directionalLight`, `castShadow`, 1024×1024 shadow map | the one real shadow-map render pass in the scene | Earth's self-shadowing (from `FLAGSHIP-POLISH-001`) |
| Fill | `pointLight`, no shadow | one light, no shadow pass | Cool-toned "dark side" fill, prevents pure black |
| Reflection (new) | `pointLight`, no shadow, orbits Earth every 9s | one light, no shadow pass | Moving specular highlight on Earth's clearcoat — see below |

Every light's intensity that has a real data signal to scale from (ambient/key/fill on the Flagship screen) already scaled with `ambientState.intensity` as of `IMMERSIVE-INTERACTIONS-001` — unchanged this phase. The new reflection light's own color also reads `ambientState.color`.

## "Dynamic Reflections": What This Actually Is

A real, physically-accurate dynamic reflection would require either an environment map (a real texture asset — a cubemap or equirectangular HDR, adding real bundle weight and VRAM this codebase's procedural-Earth approach has deliberately avoided since `IMPACTONE-3D-WORKSPACE-001`) or a render-target-based reflection probe (rendering the scene a second time from the reflective surface's point of view every frame — a real, meaningfully more expensive technique).

This phase's actual implementation: one additional `pointLight`, continuously orbiting the Earth at a fixed radius and period, sharing the same real ambient color as everything else in the scene. As it orbits, it produces a real, moving specular highlight on the Earth's existing `meshPhysicalMaterial` `clearcoat` layer — a genuine, physically-real lighting response (the material really is reacting to a really-moving light source), just without the "reflects the actual surrounding scene" property a true environment-map reflection would have. This is disclosed honestly as an approximation, not represented as a full reflection system.

**Cost:** one additional light (no shadow casting), one `Vector3`/`Color` update per frame inside `Earth.jsx`'s already-existing `useFrame` callback (no new subscription). Negligible.

## "Volumetric Light": What This Actually Is

A real volumetric-scattering effect needs one of:
1. A dedicated postprocessing pass (screen-space "god rays," typically a radial-blur pass on an occlusion buffer) — this scene has deliberately carried no postprocessing pipeline since `IMPACTONE-3D-WORKSPACE-001` (see that phase's own disclosed "zero gimmicks"/bundle-weight reasoning), and adding one now would be a real, meaningfully larger GPU/dependency cost than this phase's budget.
2. A raymarched fog volume in a custom fragment shader — real, per-pixel-expensive, and would require hand-written GLSL this codebase has no existing precedent for.

This phase's actual implementation (`LightShaft.jsx`): one real, static, additive, transparent cone mesh, its orientation computed via real `Quaternion.setFromUnitVectors` vector math from the key light's position to the Earth's origin, rendered with a low, fixed opacity (`0.045`). It reads as a soft light shaft at a glance, at the cost of exactly one more draw call — a well-understood, honest approximation technique, not a real volumetric renderer.

**Cost:** one mesh, one draw call, zero per-frame JavaScript (the geometry/orientation is computed once via `useMemo`, not recomputed every frame — it's static, matching the key light's own fixed position).

## Ambient Fog

Three.js's own built-in `fogExp2` (attached via the `<fogExp2 attach="fog">` JSX shorthand `@react-three/fiber` supports) is a real, first-class renderer feature — computed per-pixel inside the standard material shaders the scene's meshes already use, with zero additional draw calls and zero additional CPU-side work per frame beyond the two scalar values (color, density) already being written when the ambient state changes. This is the cheapest possible way to add real atmospheric depth to a scene.

## Space Particles vs. Background Stars

`<Stars>` (existing, from `IMPACTONE-3D-WORKSPACE-001`) and the new `<Sparkles>` layer (`WorldAtmosphere.jsx`) are both single `Points`-based draw calls from `@react-three/drei` — GPU-instanced particle rendering, not one mesh per particle. Adding a second particle layer roughly doubles this specific cost, but that cost was already small (a single draw call moving a bounded number of vertices) — both layers combined remain one of the cheapest categories of geometry in the entire scene, well below the cost of the Earth's own shadow-casting.

## What Remains Deliberately Absent

- No environment map / HDR texture.
- No render-target-based reflection probes.
- No postprocessing pipeline (bloom, SSAO, screen-space god-rays, motion blur).
- No per-pixel custom shader code (every effect uses a built-in three.js/drei material or geometry).

Every one of these was evaluated against this scene's established, disclosed performance budget (60fps target, GPU-friendly, no unnecessary draw calls — this phase's own explicit requirement) and rejected as real, unjustified additional cost for a presentation-layer-only phase, in favor of the cheaper, honestly-disclosed approximations documented above.
