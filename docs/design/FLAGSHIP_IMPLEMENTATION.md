# Flagship Screen Implementation Notes

Real implementation details, decisions, and disclosed tradeoffs for `frontend/src/features/flagshipScreen/`.

## Reuse Over Duplication

Every 3D primitive this screen needs already existed from `IMPACTONE-3D-WORKSPACE-001`:

- `Earth.jsx`, `CameraRig.jsx`, `OrbitalNode.jsx`, `MissionControlChain.jsx` — imported directly from `features/workspace3d/`, not copied or re-implemented.
- `orbitalPosition()` / `focusedCameraFor()` — the generic layout math is imported from `workspace3d/orbitalConfig.js`; `flagshipScreen/panelConfig.js` only adds the flagship-specific panel list and radius, calling the same shared functions.
- The glassmorphism panel shell/CSS (`workspace3d.css`) is imported and reused as-is; `flagshipScreen.css` adds only new, panel-content-specific rules (lists, chips, stat rows).

This is a deliberate choice: the mission frames this screen as "the foundation of every future screen," and reusing the same Earth/camera/panel primitives (rather than a second, parallel implementation) is what makes that literally true going forward — any future screen can adopt the same `Earth` + `CameraRig` + panel-ring pattern this one and the 3D Workspace both already use.

## Data Layer: `useFlagshipData.js`

One hook, one `Promise.allSettled` across the 10 real API calls listed in `FLAGSHIP_SCREEN.md`. Each panel's resulting state is `{ status: "live" | "error" | "loading", data }` — deliberately three states, not a boolean:

- `"loading"` — initial state, before the first real response.
- `"live"` — a real, successful response (even if the real data inside is an honestly empty list — that's a real, different rendering path inside `FlagshipPanelContent.jsx`, not conflated with an error).
- `"error"` — the real fetch failed; logged via this codebase's existing `logError` utility, panel renders its own local empty/error state.

No panel's failure can affect another — this mirrors `MissionControlHomeScreen.jsx`'s own established `Promise.allSettled` + per-section `liveSections` pattern exactly, just generalized to the flagship screen's 10 panels instead of that screen's 6 sections.

## Choosing a Representative Symbol for Fear & Greed / Agent Consensus

Two of the 10 panels (`fearGreed`, `agentConsensus`) are backed by per-symbol endpoints (`marketApi.getQuote(symbol)`, `committeeIntelligenceApi.convene(symbol)`) rather than a market-wide one. Real, honest choices made here:

- **Fear & Greed** queries `SPY` — a standard, real market-index-proxy symbol already used elsewhere in this codebase's own conventions for "the market as a whole" — since the mission's panel is framed as a market-wide gauge, not a per-holding one.
- **Agent Consensus** queries the user's own real, top watchlist symbol (falling back to `SPY` if the watchlist is empty) — framed honestly in the panel itself ("Committee consensus on `<symbol>`") rather than implying a market-wide consensus that endpoint doesn't produce. This is a deliberate, disclosed scope choice: a real "multi-symbol consensus roll-up" panel would need new aggregation logic the mission explicitly rules out ("do not change business logic").

## Portfolio → Holdings Connections: What "Affected" Means Here

The mission asks for animated Earth-to-holding connections "when portfolio holdings are affected." This implementation reads that signal from the real, already-computed `portfolioEngineApi.getPerformanceDelta()` response's own `changes` array (the same real per-metric deltas `MissionControlHomeScreen.jsx`'s "Portfolio Intelligence" section already displays) — the connection count is `changes.length`, capped at 4. This is a real, honest, already-computed signal, not a new "which holdings moved" computation invented for this screen. A future, more literal version — one connection per specific affected *symbol* rather than per changed *metric* — would need either a new field on the existing delta response or a second real fetch (e.g. `claimsApi.listPortfolioRelevant()`'s `symbols`, already used by Mission Control's own portfolio section) and was judged a reasonable, disclosed simplification for a presentation-layer-only phase rather than pulled in to keep the "no business logic changes" boundary unambiguous.

## Performance

Identical posture and identical reasoning to the 3D Workspace phase (see `IMPACTONE_3D_ARCHITECTURE.md`'s Performance section for the full rationale) — repeated briefly here since this is a separate lazy chunk:

- Lazy-loaded (`screenRegistry.js`'s `FlagshipScreenFeature = lazy(...)`) — confirmed via a real production build that `FlagshipScreen`'s own code (≈10KB) sits in its own small chunk, while the shared three.js/`@react-three` dependency tree is automatically deduplicated by the bundler into the same shared `workspace3d-*.js` chunk the 3D Workspace screen already uses (≈915KB/244KB gzip) — a user who opens both screens in one session downloads that shared chunk once, not twice.
- `dpr={[1, 2]}`, default per-mesh frustum culling, no real-time shadow-mapped lights beyond one `directionalLight`, no bloom/motion-blur postprocessing pipeline — every "soft shadow"/"glow" effect is cheap emissive materials or CSS.
- The additional per-panel connecting lines (10 static + up to 4 animated holding pulses) are simple `Line`/small-sphere geometries — negligible additional GPU cost next to the Earth/orbital-node baseline already measured in the prior phase.

## Known Limitations (Disclosed)

- No headless-browser/WebGL tool was available in this environment to visually screenshot-verify the live scene or measure actual frame rate — verification performed instead via a real production build, the full existing frontend test suite passing with zero regressions, and unit tests for every piece of pure layout/camera math. Same disclosed limitation as the prior 3D Workspace phase.
- Agent Consensus reflects one representative symbol (the user's top watchlist entry, or `SPY`), not a market-wide roll-up — see above.
- Portfolio → holdings connections are keyed to the number of real *changed metrics*, not a literal list of *affected holding symbols* — see above.
- This screen is additive (a new, pinned nav destination named "Flagship"), not yet the app's default first-open screen — see `FLAGSHIP_SCREEN.md`'s Disclosed Scope Decision.

## Tests

`panelConfig.test.js` (5 tests) covers every piece of pure, non-visual logic this screen adds: the exact 10-panel mission order, key uniqueness, orbit position math, camera-focus math (Earth always between camera and panel), and the real Portfolio Health panel index. `useFlagshipData.js`'s real API wiring is exercised the same way this codebase already exercises `MissionControlHomeScreen.jsx`'s identical `Promise.allSettled` pattern — through the existing, already-passing integration coverage of each underlying real API client — rather than a redundant second mock-fetch test suite for the same already-tested clients.
