# Flagship Screen Layout

Real, exact spatial layout of `frontend/src/features/flagshipScreen/`.

## Overview Camera

`OVERVIEW_CAMERA` (reused from `features/workspace3d/orbitalConfig.js`): position `[0, 9, 14]`, looking at the origin `[0, 0, 0]` — the Earth's own position. All 10 panels are in frame simultaneously from this angle.

## The Earth

Sits at the scene origin `[0, 0, 0]`, radius `EARTH_RADIUS = 2` (from `workspace3d/orbitalConfig.js`) — unchanged from the 3D Workspace phase.

## The 10 Panel Ring

`FLAGSHIP_RADIUS = 8` (larger than the 3D Workspace's 7-module `ORBIT_RADIUS = 6`, since there are more nodes to fit legibly around the same Earth). Panels are placed via the same generic `orbitalPosition(index, total, radius)` function used by the 3D Workspace, evenly spaced around a full circle in the XZ plane:

```
angle = (index / 10) * 2π
x = cos(angle) * 8
y = 0
z = sin(angle) * 8
```

In mission order (`index` 0–9):

| Index | Panel | Approx. clock position (viewed from overview) |
|---|---|---|
| 0 | AI Market Summary | 3 o'clock (directly right of Earth) |
| 1 | Global Events | ~4:12 |
| 2 | Portfolio Health | ~5:24 |
| 3 | AI Recommendations | ~6:36 (front-lower) |
| 4 | Watchlist | ~7:48 |
| 5 | Fear & Greed | 9 o'clock (directly left) |
| 6 | Agent Consensus | ~10:12 |
| 7 | Macro Calendar | ~11:24 |
| 8 | Breaking News | ~12:36 (rear-upper) |
| 9 | Alerts | ~1:48 |

Every panel sits at `y = 0` — the same orbital plane as the Earth's equator — so no panel visually overlaps another when viewed from the default overview angle.

## Connecting Lines

Every one of the 10 panels has a real, always-rendered line (`@react-three/drei`'s `Line`) from `[0, 0, 0]` (the Earth) to that panel's position, drawn in the panel's own accent color at low opacity (`0.22`) — visible but not visually dominant, so the Earth and the panels themselves stay the focal point.

## Holding Connections (Conditional)

When real portfolio data reports affected holdings (`portfolioHealth.data.changes.length > 0`), up to 4 additional lines are drawn from the Earth to the Portfolio Health panel's own position (index 2's coordinates) — brighter (`#4fffb0`, opacity `0.35`) than the 10 static connecting lines, each with its own traveling pulse sphere, staggered by a fixed phase offset (`offset = index * 1.3` radians) so simultaneous holdings read as distinct, independent pulses rather than one blob.

## Mission Chain (Conditional)

When toggled on via the toolbar, `MissionControlChain` (reused from the 3D Workspace phase) renders its own 6-node horizontal chain at `y = 3.5`, centered above the Earth, spaced `2.2` units apart — positioned high enough to never visually collide with the panel ring at `y = 0`.

## Camera Transition Targets

`flagshipFocusedCamera(index)` (built on the shared `focusedCameraFor`) places the camera `3.5` units further from the origin than the panel itself, along the same ray from the origin through the panel — so focusing any of the 10 panels frames it with the Earth still visible directly behind it.

## Glass Panel (DOM Layer)

Reuses the exact glassmorphism panel shell/CSS from the 3D Workspace phase (`workspace3d.css`'s `.workspace3d-glass-panel`) — positioned top-right, `min(560px, 44vw)` wide, `backdrop-filter: blur(18px)`. Panel-specific content styling (lists, chips, stat rows, gauges) is new, scoped CSS in `flagshipScreen.css`.

## Toolbar

One button, top-left (`.workspace3d-toolbar`, reused): "Mission Chain" — toggles the chain visualization on/off, mutually exclusive with any focused panel (selecting a panel while the chain is open closes the chain, and vice versa, since both share the same single `focusedPanelKey`/sentinel state in `FlagshipScreen.jsx`).
