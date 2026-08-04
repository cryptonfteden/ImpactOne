# 3D Component Map

Real component inventory for `frontend/src/features/workspace3d/`, in dependency order (each depends only on components above it).

## Pure Logic (no three.js import — testable under plain jsdom)

### `orbitalConfig.js`
- `ORBITAL_MODULES` — the 7 real orbital modules (key → real screenMap-style key, label, color).
- `ORBIT_RADIUS`, `EARTH_RADIUS` — real scene-scale constants.
- `orbitalPosition(index, total, radius)` → `[x, y, z]` — deterministic, evenly-spaced circular layout.
- `focusedCameraFor(modulePosition)` → `{ position, target }` — camera placement that keeps the Earth (origin) between the camera and the focused module.
- `OVERVIEW_CAMERA` — the default, zoomed-out camera pose.
- `MISSION_CONTROL_CHAIN` — the 6-step real, ordered chain definition.

Consumed by every component below; has zero React or three.js dependency itself.

## 3D Scene Components (real `@react-three/fiber` elements — require a `<Canvas>` ancestor)

### `Earth.jsx`
- Renders the central 3D object: a lit base sphere, a translucent "clouds" shell, and an additive atmosphere glow.
- Owns its own slow rotation via `useFrame`.
- No props — always sits at the scene origin.

### `OrbitalNode.jsx`
- Props: `module` (one `ORBITAL_MODULES` entry), `position`, `isFocused`, `isDimmed`, `onSelect`.
- Renders one real, clickable sphere mesh at `position`, plus an `Html`-projected label.
- Pulses continuously (`useFrame`); pulses larger and dims siblings when focused/unfocused.
- Clicking the mesh calls `onSelect(module.key)` — the only way `Workspace3DFeature`'s focus state changes from inside the scene.

### `CameraRig.jsx`
- Props: `target` (`{ position, target }`, i.e. an `OVERVIEW_CAMERA`- or `focusedCameraFor`-shaped object).
- Renders nothing (`return null`) — its only job is a per-frame exponential lerp of the real `useThree().camera`'s position and look-at point toward `target`.
- See `CAMERA_SYSTEM.md` for the full mechanics.

### `MissionControlChain.jsx`
- No props — reads `MISSION_CONTROL_CHAIN` directly.
- Renders 6 labeled nodes connected by a `Line`, plus one small sphere that continuously travels the chain (`useFrame`) as the "live" pulse.
- Mounted only when Mission Control is the focused view.

### `Workspace3DScene.jsx`
- Props: `focusedModuleKey`, `onSelectModule`, `showMissionControlChain`.
- The real `<Canvas>` root: lighting (`ambientLight`, `directionalLight`, `pointLight`), `<Stars>` (ambient depth), `<Earth />`, one `<OrbitalNode>` per module, `<MissionControlChain>` (conditional), and `<CameraRig>`.
- Computes the current camera target (`OVERVIEW_CAMERA` vs. `focusedCameraFor(...)`) from `focusedModuleKey` and passes it to `CameraRig`.

## DOM/Presentation Components (plain React + CSS — no three.js)

### `GlassPanel.jsx`
- Props: `title`, `onClose`, `children`.
- The glassmorphism floating panel shell — header with title/close button, scrollable body.

### `moduleScreens.js`
- `MODULE_SCREENS` — maps each orbital module key to its real, pre-existing screen component (imported directly from each feature's own file, not the `features/index.js` barrel, to avoid a circular import).
- `MISSION_CONTROL_SCREEN` — `MissionControlHomeFeature`.

### `Workspace3DFeature.jsx` (top-level, default export)
- No props (mounted directly by `screenRegistry.js`'s `screenMap`).
- Owns the one real piece of state: `focusedModuleKey` (`null`, a module key, or the internal Mission Control sentinel).
- Renders `Workspace3DScene` plus, when a module is focused, `GlassPanel` hosting that module's real screen from `MODULE_SCREENS`/`MISSION_CONTROL_SCREEN`.
- Renders the "Mission Control" toolbar button that toggles the Mission Control view.

## Registration Points (outside `workspace3d/`, minimal touch)

- `layout/screenRegistry.js` — `Workspace3DFeature = lazy(() => import(".../Workspace3DFeature"))`; `screenMap["3D Workspace"]`.
- `layout/Sidebar.jsx` — `{ key: "3D Workspace", label: "3D Workspace" }` in `PRIMARY_ITEMS`.
- `layout/MainLayout.jsx` — one `Suspense` branch for `activeView === "3D Workspace"`, matching the existing `"Global Intelligence"` pattern.

## Dependency Graph

```
orbitalConfig.js (pure)
    ├─► Earth.jsx
    ├─► OrbitalNode.jsx
    ├─► CameraRig.jsx
    ├─► MissionControlChain.jsx
    └─► Workspace3DScene.jsx ──uses──► Earth, OrbitalNode, CameraRig, MissionControlChain

moduleScreens.js (imports 7 real existing feature components directly)
    └─► Workspace3DFeature.jsx ──uses──► Workspace3DScene, GlassPanel, moduleScreens
                                              │
                                     (registered in screenRegistry.js,
                                      Sidebar.jsx, MainLayout.jsx)
```
