# Camera Storyboard — CINEMATIC-EXPERIENCE-002

A real, exact walkthrough of a session inside the Flagship screen, describing what the camera and world actually do at each step. Complements `CAMERA_SYSTEM.md` (the underlying transition mechanics, unchanged this phase) and `SPATIAL_INTERACTION_GUIDE.md` (interaction mechanics from the prior phase, unchanged this phase).

## Scene 1 — Arrival (Overview)

The user opens the Flagship screen. The camera starts at `OVERVIEW_CAMERA` (`[0, 9, 14]`, looking at the Earth's origin). The Earth is already rotating (its own established "alive" identity motion), the reflection light is already orbiting it, the light shaft is visible from the key light toward the Earth, fog and space particles give the space around it real depth, and all 10 panels' connecting lines are visible at whatever real opacity their current fetch status implies (`live`/`loading`/`error`). If real portfolio or global-event data is already in from a previous session's cache, the atmosphere's color/intensity and the ambient lighting are already reflecting it — the world doesn't wait for a separate "loading" moment to start looking alive.

## Scene 2 — The User Looks Around (Parallax, No Camera Move)

Before clicking anything, the user moves the mouse. `useParallax.js` tracks it; `CameraRig` applies a small, smoothed offset (capped at `0.6` units) on top of the overview position — the world subtly shifts with the pointer, reinforcing that this is one continuous physical space, not a static image. No module transition has occurred; `activeKey` in `CameraRig` hasn't changed, so the base eased-tween logic is untouched by this — parallax is purely additive.

## Scene 3 — Selecting a Panel (Scripted Camera Move)

The user clicks the Portfolio Health node. `FlagshipScreen`'s `focusedPanelKey` changes; `FlagshipEarthScene` computes a new `cameraTarget` (`flagshipFocusedCamera`); `CameraRig` snapshots the camera's current pose (including whatever parallax offset was already applied) as the tween's start and eases, over a real, fixed `0.9s`, to the new destination — Earth still visible behind the panel, per the established rule. Simultaneously, a glassmorphism panel slides in with the real Portfolio Health data. No fade, no unmount/remount of the 3D scene, no route change — the mission's own "never fade between pages, never jump" requirement, already satisfied by the existing architecture and confirmed unchanged by this phase's audit.

## Scene 4 — The World Reacts (If the Portfolio Is Genuinely Moving)

If the real portfolio data shows a genuine move today, the panel's own `changes` drive real, animated energy-pulse beams from the Earth to the Portfolio node, their speed scaled to the real move's magnitude — visible in the background even while the glass panel is open, since the 3D scene keeps rendering behind it (never paused or hidden).

## Scene 5 — Closing the Panel (Return Tween)

Closing the panel clears `focusedPanelKey`; the camera target resolves back to `OVERVIEW_CAMERA`; `CameraRig` eases back using the identical mechanism as Scene 3, just in reverse — no special-cased "return" animation needed, since the tween is symmetric by construction (it only ever cares about "current pose" → "current goal").

## Scene 6 — A Real Sector Wave Passes

Independent of anything the user clicks, if the real Global Events panel currently has active items, `ActivityWaves`' `SectorActivityWaves` continuously emits a slow, low-opacity expanding ring from the Earth — its cadence genuinely faster on a day with more real active events. This is visible from the overview and from any focused-panel camera angle (it's part of the base scene, not tied to a specific panel's focus state).

## Scene 7 — Breaking News Arrives Mid-Session

If a background data refresh reveals the real Breaking News panel's item count has genuinely grown since the last check, `FlagshipScreen`'s trigger effect fires exactly one real, one-shot shockwave — a brighter, faster-expanding ring than the ambient sector waves, visually distinct so it reads as "something just happened" rather than blending into the ambient rhythm. It self-removes after `2.4s`; no camera move accompanies it (it's an ambient event, not a navigation action) — the user's current view (wherever the camera happens to be) simply gets this one real, temporary visual event layered into it.

## Scene 8 — Mission Chain

The user clicks the "Mission Chain" toolbar button. `MissionControlChain` (unchanged from `IMPACTONE-3D-WORKSPACE-001`) renders above the Earth; the camera does not move to a new target for this (it stays at whatever the current overview/parallax pose is, since the chain is designed to be legible from the standard overview angle) — a deliberate, unchanged design choice from the original phase, reconfirmed by this phase's audit rather than altered.

## What Never Happens (By Design, Reconfirmed This Phase)

- No `<Suspense>` fallback flash between panels (the 3D scene and its `Canvas` never unmount when switching focus — only the DOM glass-panel content and the camera's destination change).
- No CSS page-transition fade on the 3D canvas itself (the glass panel has its own entrance animation, established in `FLAGSHIP-POLISH-001`, but the world behind it is continuous throughout).
- No camera "teleport" — `CameraRig`'s `cameraGoalKey` change-detection guarantees every destination change goes through the same real eased tween, with zero code path that sets `camera.position` directly outside of it.
