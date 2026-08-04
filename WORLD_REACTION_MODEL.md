# World Reaction Model — LIVING-WORLD-001

The complete, itemized mapping from the mission's 10 named "Drive" targets to the exact real `worldState` field and exact real formula that drives each one, and exactly where in the code that mapping lives (always exactly one place per target).

| Drive target | `worldState` field(s) used | Real formula | Where it lives |
|---|---|---|---|
| World lighting | `intensity`, `color` | `ambientLight`: `0.25 + intensity * 0.25`; `directionalLight`: `1.2 + intensity * 0.5`; fill `pointLight`: `0.2 + intensity * 0.3`, colored `worldState.color` | `FlagshipEarthScene.jsx` |
| Atmosphere | `intensity` | Fog density `0.012 + intensity * 0.01`; particle count `40 + intensity * 80`; particle speed `0.15 + intensity * 0.2` | `WorldAtmosphere.jsx` (unchanged since `CINEMATIC-EXPERIENCE-002` — already read a single upstream intensity, now that upstream value is `worldState.intensity`) |
| Earth glow | `color`, `intensity` | `ambientColor={worldState.color}`, `ambientIntensity={0.18 + intensity * 0.18}`, eased smoothly toward the target every frame (unchanged mechanism from `IMMERSIVE-INTERACTIONS-001`) | `Earth.jsx` (via props from `FlagshipEarthScene.jsx`) |
| Fog density | `intensity` | Same fog formula as "Atmosphere" above — one calculation, not two | `WorldAtmosphere.jsx` |
| Camera energy | `intensity` | `energyScale = 0.5 + clamp01(intensity) * 0.8`, multiplying the existing pointer-parallax offset magnitude | `CameraRig.js` (new `energy` prop this phase) |
| Connection intensity | `intensity` | Each of the 10 panel lines' opacity: `panelLineOpacity(status) * (0.7 + intensity * 0.6)` — the existing per-status base value, now also world-intensity-scaled | `FlagshipEarthScene.jsx` |
| Particle density | `intensity` | Same particle-count formula as "Atmosphere" above | `WorldAtmosphere.jsx` |
| Orbital activity | `intensity` (blended with each panel's own `status`) | `panelPulseAmplitude(status, intensity) = statusBase * (0.6 + intensity * 0.8)` | `FlagshipEarthScene.jsx` |
| Background stars | *(see Known Limitation below)* | — | — |
| Ambient sound hooks (state only) | `soundHook` | `alertsCount > 0 && tone === "bearish" ? "alert" : intensity > 0.66 ? "active" : intensity < 0.25 ? "calm" : "steady"` | `worldState.js` (computed; not yet consumed by any audio system, since this phase plays no actual sound — see below) |

## Known Limitation: Background Stars

`<Stars>` (`@react-three/drei`) generates its particle field's geometry once, sized by its `count` prop; varying `count` on every real world-state change would mean regenerating that geometry buffer on a real-data refresh — a real, avoidable GPU/CPU cost for a background layer whose *count* changing is far less perceptible than its color or the foreground `Sparkles` layer's own density changing (which *does* already react to `worldState.intensity`, via `WorldAtmosphere.jsx`, unchanged this phase). Background star density was evaluated and deliberately left at its existing fixed baseline (`count={1500}`) rather than wired to `worldState`, in favor of a real, cheaper existing mechanism: `WorldAtmosphere`'s real fog already partially occludes the more distant stars as its density increases with `worldState.intensity`, so background star *visibility* does still honestly respond to world state — indirectly, through fog, rather than through a second, more expensive direct geometry-regeneration path. This is a disclosed, deliberate tradeoff, not an oversight.

## Known Limitation: Ambient Sound Hooks

The mission's own wording — "ambient sound hooks (state only)" — is read literally: `worldState.soundHook` is a real, computed, named state value (`"calm"`/`"steady"`/`"active"`/`"alert"`), available for any future audio layer to key off of, but this phase adds no actual audio playback, no `<audio>` element, and no sound asset. Building real audio would be a genuine new feature (new user-facing behavior, likely needing a mute/volume control, autoplay-policy handling, and a real sound asset) — squarely outside "do not add features." The state exists and is real; only the sound itself is deliberately not wired.

## What Does Not Yet React (Disclosed, Not Silently Skipped)

- **Background star density/visibility**: reacts indirectly via fog, not directly via particle count — see above.
- **Actual ambient audio**: state computed, no playback wired — see above.

Every other item in the mission's "Build the world reacts to" list (Breaking News, Macro, Market Regime, Fear & Greed, Claim Intelligence, Agent Consensus, Portfolio Health, Importance Score, Confidence, Alerts) and every other item in "Drive" (World lighting, Atmosphere, Earth glow, Fog density, Camera energy, Connection intensity, Particle density, Orbital activity) is genuinely, directly wired to the one shared `worldState` object as of this phase.
