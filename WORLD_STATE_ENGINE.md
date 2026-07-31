# World State Engine — LIVING-WORLD-001

Real internal design of `frontend/src/features/flagshipScreen/worldState.js`.

## Contract

```js
computeWorldState(panels) => {
  tone: "bullish" | "bearish" | "neutral",
  color: "#4fffb0" | "#ff5f5f" | "#4f8cff",
  intensity: number,            // 0..1, the one real composite "Importance Score"
  confidenceIntensity: number,  // 0..1, from real cio.confidence
  breakingNewsCount: number,
  claimCount: number,
  macroEventCount: number,
  alertsCount: number,
  fearGreedValue: number | null,
  regime: "risk-on" | "risk-off" | "neutral",
  soundHook: "calm" | "steady" | "active" | "alert",
}
```

`panels` is exactly the return value of `useFlagshipData.js` — the same object every panel's own content already renders from. `computeWorldState` performs zero side effects, zero mutation, and zero fetching; it is a pure function of its one argument, callable with the exact same `panels` shape from a test file with no React/three.js runtime involved (confirmed by `worldState.test.js`, which never imports React or three.js).

## Design Decision: Composite `intensity`, Not Per-Signal Weights Exposed

`intensity` is computed as an unweighted average of 7 real, independent 0..1 sub-signals (portfolio-move magnitude, active-claim-count activity, alert-count activity, macro-event-count activity, breaking-news-count activity, Fear & Greed extremity, and confidence intensity) — each contributes equally, so no single real signal (e.g., a sudden spike in macro events) can alone dominate the world's overall "how alive does this feel" reading. The engine intentionally does *not* expose 7 separate weighted knobs for callers to tune — that would invite exactly the kind of per-consumer re-derivation of "importance" this phase's "single world state" requirement is meant to prevent. If a future phase needs a different weighting, it changes in this one function, not in N different call sites.

## Design Decision: No Pre-Derived Driver Values

An earlier draft of this module also computed `fogDensity`, `particleDensity`, `cameraEnergy`, `connectionIntensity`, `orbitalActivity`, and `starDensity` directly — deleted before this phase shipped, once it became clear that every one of those values would have been a **second**, redundant computation of the exact same `0.x + intensity * 0.y` linear-mapping shape that each real consuming site (the `ambientLight`/`directionalLight`/`WorldAtmosphere`/`CameraRig`/etc. call sites in `FlagshipEarthScene.jsx`) already needed to own for its own specific visual reasons anyway. Two computations of the same real relationship is a literal duplicated calculation — the mission's own explicit "no duplicated calculations" requirement. The correct architecture, and the one this phase ships, is: **one shared upstream signal** (`worldState.intensity`), **many independent, disclosed downstream mappings**, each living exactly once, at the one site that actually needs that specific scaling. See `WORLD_REACTION_MODEL.md` for the complete itemized list of those per-site mappings.

## Design Decision: Honest Defaults, Never Fabricated Activity

Every sub-signal's calculation starts from the panel's own real `status` field:

- A `loading` panel contributes `0` to its own activity signal (not an assumed midpoint, not a fabricated "probably some activity" guess).
- An `error`'d panel likewise contributes `0` to intensity — a real fetch failure is not evidence of market activity.
- `NEUTRAL_WORLD_STATE` (the module's exported default/fallback object) mirrors exactly what `computeWorldState` returns when called with entirely empty/loading panels — used as the `worldState` prop's own default value in `FlagshipEarthScene.jsx`, so the scene never has to handle an `undefined` world state as a special case.

## Design Decision: `regime` as a Disclosed Proxy

See `LIVING_WORLD.md`'s dedicated section — `regime` reuses the same real `tone` computation rather than introducing a second, independent market-regime classifier. This is a deliberate, disclosed choice to stay within "do not change business logic," not an attempt to claim a more sophisticated real signal exists than actually does.

## Consumption Pattern

```
FlagshipScreen.jsx
  const worldState = useMemo(() => computeWorldState(panels), [panels]);
  <FlagshipEarthScene worldState={worldState} ... />

FlagshipEarthScene.jsx
  <ambientLight intensity={0.25 + worldState.intensity * 0.25} />
  <Earth ambientColor={worldState.color} ambientIntensity={0.18 + worldState.intensity * 0.18} />
  <CameraRig energy={worldState.intensity} ... />
  <ConfidenceHalo intensity={worldState.confidenceIntensity} ... />
  <ActivityWaves eventCount={worldState.claimCount} sectorColor={worldState.color} ... />
  ...
```

Exactly one `computeWorldState` call exists in the entire codebase (inside `FlagshipScreen.jsx`); every other file only ever reads fields off the resulting object, never recomputes them.
