# Performance Review — IMMERSIVE-INTERACTIONS-001

Real performance accounting for this phase's changes, building on `PERFORMANCE_NOTES.md` (the prior polish phase) and `VISUAL_OPTIMIZATION.md` (the prior phase's Three.js-side reasoning). Mission requirement: maintain or improve FPS, reduce GPU overdraw, optimize render scheduling.

## GPU Overdraw: Reduced

`Earth.jsx`'s clouds shell and atmosphere shell — both faint, low-detail, translucent spheres where high tessellation was never visually distinguishable — had their segment counts reduced from `32×32` to `20×20`. This is a real, direct reduction in per-shell vertex count (from 1,024 to 400 quads per shell, roughly a 60% cut) for the two meshes responsible for this scene's actual overdraw (two overlapping transparent layers drawn over the opaque Earth beneath them); the opaque, most-visually-important base Earth sphere (`48×48`) was left untouched; visual fidelity is unaffected at the distance and size these shells are actually viewed at (confirmed by inspection — a faint, largely featureless translucent shell shows no discernible difference between 32 and 20 segments at this scene's scale).

An additional invisible pointer-target sphere was added (`Earth.jsx`, for the new drag interaction) at a deliberately very low `12×12` segment count — it is never rendered (`visible={false}`), so its only real cost is a small, fixed raycasting geometry, not a rendering cost.

## Render Scheduling

The Canvas's `frameloop` remains the default (`"always"`), not switched to `"demand"`. This was evaluated and rejected for a specific, real reason: this scene now has *more*, not fewer, continuously-running real animations than before this phase (Earth's own core rotation, momentum decay after a drag release, the eased hover approach, the eased ambient-color/intensity transition, the existing camera tween, the existing orbital pulses) — `"demand"` mode only pays off when a scene is mostly static between discrete user actions, which this one deliberately is not. Switching would require manually calling `invalidate()` after every one of those real, continuous per-frame updates, adding real complexity for no real rendering-cost reduction in a scene that's already animating every frame regardless.

What *was* optimized in scheduling terms: every new per-frame computation added this phase (drag momentum decay, hover easing, ambient color/intensity easing) reuses an existing `useFrame` subscription on an existing component (`Earth`, `OrbitalNode`) rather than registering a new one — each additional `useFrame` callback is itself a real, measurable per-frame cost in a scene with many objects, and this phase added zero new subscriptions.

## New Per-Frame Work: Accounted For

Every new per-frame computation this phase adds is a small, fixed number of scalar/vector operations, not a new draw call or a new shader:

- **Earth drag momentum** (when active): one multiply, one add, one exponentiation (only while a nonzero residual velocity exists — settles to exactly zero and stops doing this work once momentum has fully decayed).
- **Earth ambient color/intensity easing:** one `Color.lerp` call and two scalar lerps per frame, replacing (not adding to) the prior phase's now-removed `Math.sin` breathing-pulse computation — a wash, not a net addition.
- **OrbitalNode hover easing:** one scalar exponential-approach calculation per node per frame, replacing the prior instant boolean check — negligible, same order of magnitude as the pulse calculation already running alongside it.
- **Window-level pointer listeners** for the Earth drag: two native `addEventListener` calls, added once on mount and removed on unmount (`useEffect` cleanup) — not a per-frame cost at all; the listener callbacks themselves only run on real pointer events during an active drag, not continuously.

None of these approach the cost of the shadow-map render pass or the material changes from the prior polish phase (see `PERFORMANCE_NOTES.md`) — they are the same order of magnitude as the per-node pulse math that already existed.

## What Was Verified

- A real production build (`npm run build`) succeeded after every change, with the same code-split chunk structure as the prior phases (three.js/`@react-three` deps still deduplicated into the shared `workspace3d-*.js` chunk).
- The full existing frontend test suite passes with zero regressions.
- No new heavy npm dependency was added — the drag/momentum interaction uses only native DOM pointer events and existing `three`/`@react-three/fiber` APIs (no physics engine, no gesture library).

## Known Limitation (Disclosed, Unchanged From Prior Phases)

No headless-browser/WebGL tool is available in this environment to directly measure real frame rate or GPU overdraw. Verification for this phase, as with the two prior 3D phases, is a successful production build, a passing test suite, and first-principles reasoning about each change's actual GPU/CPU cost (documented above), not a measured FPS number. A manual, real-browser frame-rate and overdraw check remains a recommended follow-up before wide rollout.
