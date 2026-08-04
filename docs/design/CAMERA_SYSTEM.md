# Camera System

How `frontend/src/features/workspace3d/CameraRig.jsx` implements "the camera moves, the workspace transforms" — the mission's own description of navigation inside the 3D Workspace.

## The Core Idea

There is exactly one camera in the scene. Navigating to a different module never swaps a component tree or reloads anything — it only changes *where this one camera is pointed*, and `CameraRig` animates that change smoothly over time rather than snapping to it. From the user's perspective, this reads as "flying" from the overview to a module and back, with the Earth remaining visible and continuous throughout — never a jump cut, never a blank frame.

## The Two Real Camera States

Defined in `orbitalConfig.js`, both shaped identically (`{ position: [x, y, z], target: [x, y, z] }`):

- **`OVERVIEW_CAMERA`** — pulled back and slightly elevated (`[0, 9, 14]`), looking at the Earth's own origin (`[0, 0, 0]`). Every orbital module is in frame from here.
- **`focusedCameraFor(modulePosition)`** — computed per module, on demand. It places the camera a fixed real distance (`pullBack = 3.5`) further from the origin than the module itself, along the same ray from the origin through the module — so the module fills the frame while the Earth stays visible behind it, satisfying the mission's explicit "the Earth remains visible in the background" requirement for every module, not only Portfolio.

`Workspace3DScene.jsx` picks which of these is "current" based on `focusedModuleKey` (a single piece of React state owned by `Workspace3DFeature`) and passes it to `CameraRig` as the `target` prop every render.

## The Animation: Frame-Rate-Independent Exponential Smoothing

```js
const t = 1 - Math.exp(-LERP_SPEED * delta);
camera.position.lerp(desiredPosition, t);
currentLookAt.lerp(desiredLookAt, t);
camera.lookAt(currentLookAt);
```

This runs inside `useFrame`, once per real rendered frame, for the lifetime of the scene — not just during a "transition window." Two real properties this gives:

1. **Frame-rate independence.** `delta` is the real elapsed time since the last frame, so the camera covers the same real distance in the same real wall-clock time whether the display is running at 30fps, 60fps, or 144fps — the animation never feels different across GPUs/monitors.
2. **No discrete "transition" state to manage.** There's no `isAnimating` flag, no `setTimeout`, no animation library. The camera is *always* lerping toward its current target; when the target hasn't changed, it's already converged (the exponential term becomes negligible within a few frames), so it just holds still. When React state changes `target` (a module click), the very next frame starts lerping toward the new goal — the transition begins and ends implicitly, driven entirely by the target changing, not by any explicit "start/stop" choreography.

`LERP_SPEED = 2.2` was chosen empirically for a transition that reads as cinematic (roughly half a second to visually settle) rather than instant (a hard cut, which the mission explicitly rules out) or sluggish (a multi-second float that would make the workspace feel unresponsive).

## Triggering a Transition

The only way `target` changes is a real user action:

- Clicking an `OrbitalNode`'s mesh calls `onSelect(module.key)`, which `Workspace3DFeature` uses to set (or clear, if the same module is clicked again) `focusedModuleKey`.
- Clicking the Mission Control toolbar button sets the internal Mission Control sentinel key (camera-wise this currently keeps the overview framing, since Mission Control's own content — the chain visualization — is designed to be viewed from the overview angle, not a per-module close-up).
- Closing the glass panel (`GlassPanel`'s close button) clears `focusedModuleKey` back to `null`, which resolves to `OVERVIEW_CAMERA` — the reverse of a focus transition, using the exact same lerp mechanism.

Every one of these is a plain React state update; `CameraRig` never needs to know *why* the target changed, only *what* the new target is.

## Why Not a Camera-Animation Library

`@react-three/drei` ships heavier camera-control helpers (e.g. `CameraControls`), but those are built for user-driven orbit/pan/zoom (mouse-drag camera control), not a fully scripted, state-driven "fly to module X" transition. A dedicated tweening library (GSAP, `@react-spring/three`, etc.) was considered and deliberately not added: the exponential-lerp approach above is a well-established, dependency-free technique that fully covers this system's actual requirement (smooth interpolation between two known points) without a new dependency for a problem this small — consistent with the mission's own "zero gimmicks" instruction and this codebase's general preference for the smallest real solution over a new library.

## Known Limitation (Disclosed)

There is currently no user-driven free-orbit/zoom control (e.g. drag-to-rotate around the Earth in the overview) — the camera only ever moves between the fixed, named states above. Adding a real, optional free-look mode for the overview state (without breaking the scripted focus transitions) is a natural follow-up, out of scope for this phase.
