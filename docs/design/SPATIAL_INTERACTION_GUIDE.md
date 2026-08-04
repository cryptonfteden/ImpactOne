# Spatial Interaction Guide

Real, exact interaction mechanics added or refined in `IMMERSIVE-INTERACTIONS-001`. Complements `CAMERA_SYSTEM.md` (which still fully describes the scripted camera-transition system, unchanged this phase) and `FLAGSHIP_LAYOUT.md` (spatial layout, unchanged this phase).

## Earth: Drag-to-Rotate With Momentum

**Where:** `frontend/src/features/workspace3d/Earth.jsx` — applies to both the 3D Workspace and Flagship screens (shared component).

**Trigger:** `pointerdown` directly on the Earth (or its invisible, slightly larger pointer-target sphere at `EARTH_RADIUS * 1.05`).

**During drag:** every `pointermove` (listened on `window`, not just the mesh, so the drag survives the pointer briefly leaving the Earth's screen-space bounds) computes `deltaX = event.clientX - lastPointerX`, converts it to a rotation delta (`deltaX * DRAG_SENSITIVITY`, `DRAG_SENSITIVITY = 0.008`), and both applies it immediately to the Earth's manual rotation and records it as the current `dragVelocity` (so the very last real drag movement is what determines the momentum on release).

**On release (`pointerup`):** dragging stops, but `dragVelocity` is not reset to zero — it decays smoothly every frame:

```
damping = MOMENTUM_DAMPING_PER_SECOND ** (delta * 60)   // MOMENTUM_DAMPING_PER_SECOND = 0.94
manualRotation += dragVelocity
dragVelocity *= damping
```

The exponent normalizes the per-frame damping factor to real elapsed time (`delta`), so the deceleration feels identical regardless of display refresh rate — the same frame-rate-independence principle `CameraRig` already established. Below a small velocity threshold (`0.00005` rad/frame), velocity is snapped to exactly zero rather than asymptotically approaching it forever.

**Cursor feedback:** `grab` while hovering (not dragging), `grabbing` while actively dragging, `auto` otherwise — mirrors the existing `pointer` cursor convention `OrbitalNode` already established for clickable nodes.

**Independence from camera:** this rotation is applied to a dedicated `interactionRef` group wrapping the Earth/clouds/pointer-target meshes, entirely separate from `CameraRig`'s own camera-position animation — dragging the globe never fights with or gets overridden by a scripted camera transition; both can be happening at once without conflict.

## Orbital Node Hover: Eased, Not Binary

**Where:** `frontend/src/features/workspace3d/OrbitalNode.jsx`.

**Mechanic:** a real `hoverAmount` ref smoothly approaches its target (`1` when hovered, `0` when not) every frame using the same exponential-approach curve `CameraRig` uses for camera transitions:

```
hoverAmount += (target - hoverAmount) * (1 - exp(-10 * delta))
scale = focused ? pulse * 1.35 : pulse * (1 + hoverAmount * 0.12)
```

This means moving the pointer on and off a node quickly produces a real, smooth "settle" rather than a flicker between two fixed scales — the node's scale is always mid-transition toward wherever the pointer currently is, never snapped.

## Focus Dimming: Depth-of-Field Cue

**Where:** `frontend/src/features/workspace3d/workspace3d.css`, `.workspace3d-node-label.is-dimmed`.

**Mechanic:** a dimmed node's label now carries both reduced opacity (existing) and a real `filter: blur(1px)` (new) — the same combination a real camera's depth-of-field produces for an out-of-focus subject, reinforcing "this is not what you're currently looking at" beyond a flat opacity change alone.

## Connection Lines & Pulses: Reading the Scene's State at a Glance

**Where:** `frontend/src/features/flagshipScreen/FlagshipEarthScene.jsx`.

| Signal | Real source | Visual effect |
|---|---|---|
| Per-panel line opacity | that panel's own `useFlagshipData` status (`live`/`loading`/`error`) | live: `0.28`, loading: `0.12` (quiet), error: `0.4` (more visible) |
| Per-panel node pulse amplitude | same per-panel status | live: `0.08` (normal), loading: `0.03` (nearly still), error: `0.14` (noticeably more active) |
| Holding-connection pulse speed | real `Math.abs(portfolio.valueChangePct)`, normalized | `0.7 + min(magnitude, 1) * 1.8` — a bigger real daily move pulses visibly faster |
| Atmosphere/lighting/holding-pulse color & intensity | `ambientState` (see below) | bullish: green (`#4fffb0`), bearish: red (`#ff5f5f`), neutral: blue (`#4f8cff`); intensity scales ambient/key/fill light strength |

A user glancing at the scene can read, without opening any panel: which panels are currently loading vs. live vs. erroring (line brightness), how big today's real portfolio move is (pulse speed and scene color/brightness), and how much real global activity is happening right now (overall scene brightness) — all from the same real data already being fetched for the panels themselves.

## Ambient State: The One New Pure Module

**Where:** `frontend/src/features/flagshipScreen/ambientState.js`.

`computeAmbientState(panels)` reads two already-fetched fields — `portfolioHealth.data.valueChangePct` (when `hasComparison` is real and true) and `globalEvents.data.length` — and returns `{ tone, intensity, color }`. Full rules and edge cases (neutral band around zero, honest defaults with no live data yet, clamping) are documented in the module's own tests (`ambientState.test.js`, 8 tests). This is the single source of truth every visual "mood" signal in the scene reads from — no component computes its own separate interpretation of the same data.

## What Remains Purely Scripted (Not Physical), By Design

Camera transitions between the overview and a focused panel (`CameraRig.js`) remain a fixed-duration, eased tween rather than a physics-driven "throw" — this is intentional: a scripted, predictable, always-completes-in-0.9s transition is what makes "the camera moves, the workspace transforms" legible and repeatable across every panel, whereas a momentum-based camera throw (like the Earth's own drag) would make the destination arrival time unpredictable, which is the wrong tradeoff for wayfinding-critical navigation (as opposed to the Earth itself, which is an exploratory, no-destination object where momentum-based motion is the more physical, appropriate choice).
