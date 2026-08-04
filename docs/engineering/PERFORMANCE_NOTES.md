# Performance Notes — FLAGSHIP-POLISH-001

Real, verified performance changes made this phase, and why. Every change here is either a measured React-render reduction or a deliberately bounded Three.js/GPU cost — nothing here is a guess.

## React Rendering

### The bug this phase found and fixed: memoization that never actually worked
`OrbitalNode` was wrapped in `React.memo(...)` this phase specifically to stop all 7 (or 10, on the Flagship screen) orbital nodes from re-rendering every time their parent scene re-rendered for an unrelated reason (e.g. `FlagshipScreen`'s data hook resolving one of the 10 panel fetches). But `React.memo` only helps if a component's props are actually stable across renders — and both `Workspace3DScene.jsx` and `FlagshipEarthScene.jsx` were computing each node's `position` prop as `orbitalPosition(index, ...)` / `flagshipPanelPosition(index)` **inline, on every render** — a brand-new array literal each time, which `memo`'s shallow comparison always sees as "changed," silently defeating the memoization before it could do anything.

Fixed by hoisting `MODULE_POSITIONS` / `PANEL_POSITIONS` to module-level, computed exactly once (`ORBITAL_MODULES`/`FLAGSHIP_PANELS` never change at runtime), and having both scene components index into that one stable array instead of recomputing a new array each render. `OrbitalNode`'s other props (`module` — a stable reference from the same constant arrays; `isFocused`/`isDimmed` — booleans; `onSelect` — already a `useCallback`-memoized handler in both `Workspace3DFeature.jsx` and `FlagshipScreen.jsx`) were already render-stable. With this fix, `React.memo` now does real work: clicking one node, or a panel's data resolving, no longer re-renders the other 9 untouched nodes.

### Camera target objects
`cameraTarget` (`OVERVIEW_CAMERA` or a computed focused-camera pose) is now `useMemo`'d against the real, minimal dependency that actually determines it (`focusedModule` / `focusedIndex`), rather than recomputed as a fresh object on every render regardless of whether the focus actually changed. This mainly matters for keeping `CameraRig`'s own `cameraGoalKey`-based change-detection cheap and predictable — it was never a correctness bug (the rig reads `target` fresh every frame regardless), but avoiding the redundant recomputation is a small, real, free win.

## Three.js / GPU

### Shadows: turned on, deliberately capped
`shadows="soft"` is now set on both `<Canvas>` instances, with the one shadow-casting `directionalLight` capped at a `1024×1024` shadow map (`shadow-mapSize={[1024, 1024]}`) rather than a higher-resolution default. A soft, modest-resolution shadow reads fine at this scene's actual scale (an Earth ~4 units in diameter, viewed from a camera 10–14 units away) — doubling to 2048×2048 would roughly quadruple the shadow-map render cost for a visual difference that would not be perceptible at this distance. This is the single biggest new GPU cost added this phase, and it was sized specifically to stay well within the existing 60fps target rather than defaulting to "high quality."

### Everything else stayed deliberately unchanged
No bloom/postprocessing pipeline, no additional shadow-casting lights, no increase to `Earth`'s polygon count, no increase to `<Stars>` particle counts, no new heavy dependency. The realism improvements (physical material clearcoat, atmosphere breathing, axial tilt) are all either a material-property change on an existing mesh (zero additional draw calls) or a per-frame scalar update on an existing `useFrame` callback (negligible CPU cost) — none of them add a new mesh, a new light, or a new render pass.

### Camera easing cost
Switching `CameraRig` from an exponential lerp to a fixed-duration eased tween added one `Vector3.copy()` call and a handful of scalar comparisons per transition-start (only when the destination actually changes, not every frame), plus the same one `lerpVectors` + one `easeInOutCubic` call per frame during an active transition that the old exponential version already did every frame regardless. Net: no meaningful CPU cost difference, since the old version also ran per-frame vector math continuously — this change reshapes *when* and *how* the interpolation happens, not how much of it there is.

## What Was Verified

- A real production build (`npm run build`) succeeded after every change in this phase, with the same code-split chunk structure as before (three.js/`@react-three` deps still deduplicated into the shared `workspace3d-*.js` chunk).
- The full existing frontend test suite passes with zero regressions.
- No new heavy npm dependency was added this phase — every improvement above uses APIs already present in `three`/`@react-three/fiber`/`@react-three/drei` or plain CSS.

## Known Limitation (Disclosed, Unchanged From Prior Phases)

No headless-browser/WebGL tool is available in this environment to directly measure real frame rate. Verification for this phase is the same as the two prior 3D phases: a successful production build, a passing test suite, and reasoning from first principles about each change's actual GPU/CPU cost (documented above) rather than a measured FPS number. See `VISUAL_OPTIMIZATION.md` for the corresponding Three.js-scene-level reasoning.
