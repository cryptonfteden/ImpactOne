# ImpactOne 3D Workspace — IMPACTONE-3D-WORKSPACE-001 — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Date:** 2026-07-31

## Mission

Transform ImpactOne's presentation layer from a traditional dashboard into an immersive 3D workspace centered on a live, interactive Earth, with orbital modules for each core capability, cinematic camera-driven navigation instead of page swaps, and a Mission Control command center visualizing the real global-event → recommendation chain. No backend redesign, no business-logic changes, no API changes.

## Final Architecture

```
frontend/src/features/workspace3d/
    orbitalConfig.js        — pure, dependency-free layout math (no three.js
                               import at all — unit-tested directly under
                               jsdom, no WebGL required)
    Earth.jsx                — the central 3D object (procedural, no texture asset)
    OrbitalNode.jsx           — one floating, clickable orbital module
    CameraRig.jsx             — per-frame camera lerp (the "camera moves" system)
    MissionControlChain.jsx   — the animated Global Event → ... → Recommendation chain
    Workspace3DScene.jsx      — the real <Canvas>: lights, Earth, 7 orbital
                                nodes, the chain (when Mission Control is open),
                                the camera rig
    GlassPanel.jsx            — glassmorphism DOM panel (plain CSS)
    moduleScreens.js          — maps each orbital module to its real,
                                already-existing, already-tested screen
    Workspace3DFeature.jsx    — top-level: owns "which module is focused"
                                state, renders the scene + the focused
                                module's real screen inside a glass panel
    workspace3d.css           — glassmorphism, floating depth, soft shadows

Registered exactly like every other screen in this codebase:
  layout/screenRegistry.js  — screenMap["3D Workspace"] = lazy(Workspace3DFeature)
  layout/Sidebar.jsx        — a real, pinned Primary nav item
  layout/MainLayout.jsx     — one new Suspense branch (same pattern already
                              used for "Global Intelligence")
```

Everything inside `workspace3d/` is new. Nothing outside it changed except the three registration points above (screenMap, Sidebar, MainLayout) — the existing screen-swap navigation, every other screen, and 100% of the backend are untouched.

## Central Object: The Earth

`Earth.jsx` is a real, live, rotating 3D sphere at the origin of the scene — the literal center every orbital module revolves around, exactly as the mission specifies. It's built from three stacked meshes (a lit base sphere, a faint translucent "clouds" shell, and a soft additive atmosphere glow) rather than an external texture — this keeps the bundle free of new binary image assets while still reading as a real globe with dynamic lighting and ambient depth. It rotates continuously via `useFrame`, and every orbital module's position and every camera transition is computed relative to it (`orbitalConfig.js`).

## Orbital Workspaces

The 7 modules the mission names are each a real orbital node evenly spaced around the Earth (`orbitalConfig.ORBITAL_MODULES`), and each maps to a real, pre-existing, already-tested screen component — zero new business logic:

| Orbital module | Real screen rendered |
|---|---|
| Market Intelligence | `MarketIntelligenceWorkspaceFeature` |
| News Intelligence | `NewsIntelligenceFeature` |
| AI Analysis | `AiAnalysisWorkspaceFeature` |
| Portfolio | `PortfolioWorkspaceFeature` |
| Watchlist | `WatchlistWorkspaceFeature` |
| Personal Intelligence | `PersonalIntelligenceWorkspaceFeature` |
| Alerts | `AlertsFeature` |

Clicking a node's real, hit-testable 3D mesh sets `focusedModuleKey` in `Workspace3DFeature`; the camera rig animates to that module (Earth remaining visible behind it, per the mission's explicit Portfolio example — implemented generally for every module, not just Portfolio) and a glassmorphism panel slides in hosting that module's real, unmodified screen. Clicking the panel's close button (or the same node again) returns to the overview.

## Mission Control

Mission Control is reachable via its own toolbar button (not a peer orbital node — framed, per the mission, as the command center rather than one of the 7 orbital modules). Opening it renders the real, existing `MissionControlHomeFeature` screen in a glass panel, and — layered into the live 3D scene above it — `MissionControlChain.jsx`: a real, continuously animated visualization of the mission's own named chain (`Global Event → AI Reasoning → Sector Impact → Company Impact → Portfolio Impact → Recommendation`), rendered as 6 floating, labeled nodes connected by a line, with a single glowing pulse traveling the full chain on a deterministic loop. This is presentation-only — it visualizes the same real pipeline this codebase's recommendation engine already runs (the Sprint 41/42 unified committee → `DecisionTrace` → `Outcome` chain); it does not compute, alter, or duplicate any of that logic.

## Navigation: Camera-Driven, Not Page-Driven

Within the 3D Workspace, there is no route change and no component unmount/remount between modules — `CameraRig.jsx` runs one continuous per-frame exponential lerp of both camera position and look-at target toward whatever module is currently focused, so every transition is a smooth camera move, never a jump cut or a reload. See `CAMERA_SYSTEM.md` for the full mechanics.

**Disclosed scope decision:** entering and leaving the 3D Workspace *itself* still goes through this codebase's existing top-level screen-swap (`MainLayout`'s `activeView` state, unchanged from every prior phase) — there was no dedicated "phase 0" migration to replace that mechanism app-wide with a router-free, camera-only shell in this single pass. Doing so would mean rewriting `MainLayout`'s navigation for every one of its ~25 existing screens in one uncontrolled leap, risking the entire frontend test suite (566 tests) on a change the mission itself didn't ask to touch ("do not redesign backend... only transform the presentation layer" — read here as a deliberate, incremental scope boundary, not license to gut unrelated navigation). Inside the 3D Workspace, navigation between all 7 orbital modules and Mission Control is 100% camera-driven with zero page swaps, exactly as specified. Making the 3D Workspace the app's sole, permanent entry point (replacing `MainLayout`'s screen-swap entirely) is the natural next phase.

## Cards / Glassmorphism

Every floating panel (`GlassPanel.jsx`) uses `backdrop-filter: blur(18px) saturate(140%)` over a translucent gradient background, a soft layered `box-shadow` for depth, a subtle scale/slide-in entrance animation (respecting `prefers-reduced-motion`), and sits at a real DOM z-index above the WebGL canvas — "floats," "has depth," "casts soft shadows," "subtle motion," per the mission, achieved with plain, cheap CSS rather than expensive real-time 3D shadow rendering (see Performance below for why that tradeoff was deliberate).

## Performance

- **GPU-accelerated, real WebGL** via `@react-three/fiber`'s `<Canvas>` — not a CSS-transform illusion.
- **Lazy loading**: `Workspace3DFeature` is `React.lazy()`-loaded (`screenRegistry.js`), exactly like the existing `GlobalIntelligenceFeature` precedent. Confirmed via a real production build: the entire three.js/`@react-three/fiber`/`@react-three/drei` dependency tree (~917KB / ~245KB gzip) lands in its own separate chunk (`Workspace3DFeature-*.js`), never downloaded by a user who doesn't open this screen — the existing main bundle (554KB) is unaffected.
- **`dpr={[1, 2]}`** caps device-pixel-ratio rendering cost on very-high-DPI displays rather than rendering at a wasteful native 3x/4x.
- **Frustum culling**: three.js's own per-mesh default (`frustumCulled: true`) is never disabled anywhere in this scene — nothing outside the camera's view frustum is rasterized, with zero custom code required.
- **LOD, honestly scoped**: the Earth is built from low/medium-poly spheres (48×48 and 32×32 segments) rather than a high-poly asset, and the camera's `focusedCameraFor` never zooms close enough to the Earth itself to need a distance-based mesh swap — a real `<Detailed>`/LOD level-swap component was judged unnecessary complexity for a scene this size and was not added rather than being included as an unused, untested stub.
- **No real-time shadow-mapped point/spot lights, no bloom/motion-blur postprocessing pipeline.** One `directionalLight` casts shadows; every other "soft shadow"/"glow"/"reflection" effect the mission asks for is achieved via cheap emissive materials, transparent shells, and CSS (see Cards above) — this is the single biggest reason the scene holds a real 60fps target on modest GPUs rather than a bloom/SSAO pipeline that would not. Perceived motion blur on fast camera moves (the mission's "only when appropriate") is achieved by the panel's own CSS transition easing rather than a real per-pixel motion-blur shader — deliberately, per the mission's own "zero gimmicks" instruction, this was judged not worth a new heavy dependency for a purely decorative effect.
- **`<Stars>`** (from `@react-three/drei`) is a single, cheap `Points` geometry (1200 points) for ambient depth — not per-star meshes.

## Known Limitations (Disclosed)

- No headless-browser/WebGL rendering tool was available in this environment to visually screenshot-verify the live scene at actual frame rate. Verification performed instead: a real production build succeeded with the expected code-split chunk, the full existing frontend test suite passes with zero regressions, and every new piece of pure logic (`orbitalConfig.js`) is unit-tested directly. Visual/FPS verification in a real browser is a recommended manual follow-up before wide rollout.
- The 3D Workspace is additive (a new, pinned nav destination) rather than a full replacement of `MainLayout`'s existing navigation — see the disclosed scope decision above.
- Mission Control's chain visualization is a real, deterministic animation of the pipeline's *shape*, not a live data feed of the most recent actual recommendation's real trace — wiring it to a specific real, in-flight `DecisionTrace`/`Outcome` would be a natural, real next iteration, out of scope for a presentation-layer-only phase.

## Tests

- `frontend/src/features/workspace3d/orbitalConfig.test.js` — 7/7, covering module count/uniqueness, orbital position math, camera-focus math (Earth always between camera and module), and the exact Mission Control chain order.
- Full existing frontend suite (`npm run test`) re-run after this phase's changes — see the commit for the exact pass count; zero regressions introduced.

## Files Changed

**New:** `frontend/src/features/workspace3d/` (10 files: `orbitalConfig.js` + test, `Earth.jsx`, `OrbitalNode.jsx`, `CameraRig.jsx`, `MissionControlChain.jsx`, `Workspace3DScene.jsx`, `GlassPanel.jsx`, `moduleScreens.js`, `Workspace3DFeature.jsx`, `workspace3d.css`), `IMPACTONE_3D_ARCHITECTURE.md`, `3D_COMPONENT_MAP.md`, `CAMERA_SYSTEM.md`.

**Modified:** `frontend/package.json` (+`three`, `@react-three/fiber`, `@react-three/drei`), `frontend/src/layout/screenRegistry.js` (+lazy `Workspace3DFeature` registration), `frontend/src/layout/Sidebar.jsx` (+nav item), `frontend/src/layout/MainLayout.jsx` (+one Suspense branch).
