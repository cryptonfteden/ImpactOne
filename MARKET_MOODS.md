# MARKET_MOODS.md — 6 Market-Condition States

**Phase:** EMOTIONAL-DESIGN-001. Companion to [EMOTIONAL_DESIGN.md](EMOTIONAL_DESIGN.md). Each state below is bounded by a real, disclosed data threshold — never a fixed animation played irrespective of real conditions. All 8 required dimensions are specified per state.

---

## Calm Markets

**Real trigger**: `ambientState.tone === "neutral"` and `intensity` near its real floor (`NEUTRAL_AMBIENT_STATE.intensity = 0.3`, i.e., low portfolio-move magnitude and low active-event count).

| Dimension | Definition |
|---|---|
| Lighting | Even, soft, single key light at baseline intensity — no dramatic falloff |
| Color temperature | Neutral blue (`#4f8cff`), fully desaturated toward the void's own base tone |
| Motion | Slowest baseline across the whole scene — Earth's own idle rotation, nothing else animating beyond its resting rate |
| Camera behavior | Fully still between transitions; parallax response (`useParallax.js`) at its smallest real magnitude |
| Particle behavior | `WorldAtmosphere`'s Sparkles at minimum density/speed |
| Visual tension | None — every connecting line at its calmest, most even opacity |
| Material response | Earth's clearcoat highlight soft and diffuse, no sharp specular |
| Spatial atmosphere | Maximum depth-of-field softness on the background register — the scene feels spacious and unhurried |

## Bull Markets

**Real trigger**: `ambientState.tone === "bullish"` (`valueChangePct > 0.05`), `intensity` scaling with real magnitude.

| Dimension | Definition |
|---|---|
| Lighting | Brighter overall key-light intensity, scaling with real `intensity` |
| Color temperature | Green (`#4fffb0`) atmosphere/holding-pulse color, per `ambientState`'s real `TONE_COLORS` mapping |
| Motion | Holding-connection pulses (`EnergyBeam`) at a faster, energetic rate — directly reusing Opportunities' "energetic" signature from `DATA_VISUAL_DICTIONARY.md` |
| Camera behavior | Slightly quicker, more confident easing on scripted transitions (a small, bounded reduction in `cameraEasing.js`'s duration, never below the floor that keeps transitions legible) |
| Particle behavior | Sparkles density/speed scale upward with real `intensity` |
| Visual tension | Low — lines run bright and steady, no jitter |
| Material response | Clearcoat highlight sharper, slightly warmer-white kick per `COLOR_GRADING.md`'s highlight rule |
| Spatial atmosphere | Foreground register (Primary-tier nodes) reads noticeably more luminous than Ambient — a confident, expansive feeling |

## Bear Markets

**Real trigger**: `ambientState.tone === "bearish"` (`valueChangePct < -0.05`).

| Dimension | Definition |
|---|---|
| Lighting | Dimmer overall key-light intensity relative to Bull, scaling inversely with real magnitude |
| Color temperature | Red (`#ff5f5f`), per `ambientState`'s real mapping — desaturated toward Risk's "heavy" deep-red per `DATA_VISUAL_DICTIONARY.md`, not the bright alarm-red reserved for Panic below |
| Motion | Slower, heavier pulse rate on holding connections — directly reusing Risk's "heavy" signature, not Panic's turbulence |
| Camera behavior | Slightly slower, more deliberate easing — unchanged mechanism, marginally longer duration within the same bounded range as Bull's shortening |
| Particle behavior | Sparkles density unchanged from Calm's baseline, but color-tinted toward the real bearish hue |
| Visual tension | Moderate — Risk's real neighbor-scoped line-bending (`DATA_VISUAL_DICTIONARY.md`) becomes visible on the most-affected holdings |
| Material response | Clearcoat highlight duller, cooler — the opposite kick from Bull's warm highlight |
| Spatial atmosphere | Slightly reduced background depth-of-field softness — the scene feels marginally more "closed in" than Calm, without yet reaching Panic's compression |

## Panic

**Real trigger**: two independent real signals combined honestly, per `EMOTIONAL_DESIGN.md`'s "emotion must never lie" rule — `ambientState.intensity` at or near its real ceiling (large negative `valueChangePct` **and** high `globalEvents.length`) **and** a real Fear & Greed reading in its own extreme-fear range. Requiring both prevents a single noisy signal from triggering the platform's most dramatic state alone.

| Dimension | Definition |
|---|---|
| Lighting | High-contrast, unstable — key-light intensity itself carries a small, bounded real flicker tied to `globalEvents.length` changing between refetches (never random) |
| Color temperature | Saturated, urgent red — the one state permitted to use a brighter, more alarm-like red than Bear's deep, heavy tone |
| Motion | The fastest pulse rates in the whole system — reusing News's "explosive" shockwave signature, potentially queued/repeating per Rule 2 in `WORLD_INFORMATION_DESIGN.md` |
| Camera behavior | Parallax response at its real maximum bounded magnitude — the scene feels more reactive to the user's own presence, never uncontrolled |
| Particle behavior | `WorldAtmosphere`'s Sparkles at maximum density, `LightShaft` more visible |
| Visual tension | Maximum — multiple Risk-elevated holdings' line-bending simultaneously visible |
| Material response | Earth's clearcoat highlight sharp but unstable — small, bounded real flicker in specular position (tied to the real orbiting point light already in `Earth.jsx`, not new) |
| Spatial atmosphere | Foreground/background contrast at its real maximum per `COLOR_GRADING.md`'s S-curve — the scene compresses toward the Primary-tier crisis object |

## High Uncertainty

**Real trigger**: `cio.confidence` at `LOW_SPLIT` or `LOW_NO_SIGNAL` (`confidenceToIntensity` near its floor) **combined with** a real, roughly-even agree/disagree split in `memberRole()`'s output (no dominant majority) — distinct from Bear/Panic, since uncertainty is about the *AI's own conviction*, not market direction.

| Dimension | Definition |
|---|---|
| Lighting | Flatter, more even lighting than any directional state — nothing is lit with confidence |
| Color temperature | The neutral system-facing blue, per `VISUAL_SEMANTICS.md`'s rule that Confidence/Agreement never introduce their own hue |
| Motion | Irregular, low-amplitude jitter — reusing Conflict's "turbulent" signature from `DATA_VISUAL_DICTIONARY.md`, but subtler than Strong Disagreement (see `WORLD_STATES.md`) |
| Camera behavior | Unchanged from Calm — uncertainty is a property of the AI's reasoning, not a reason to change navigation feel |
| Particle behavior | Unchanged from Calm baseline |
| Visual tension | Moderate, diffuse — no single dominant object, several nodes reading similarly ambiguous |
| Material response | `ConfidenceHalo` rendered thin and dim, per its own real, low `confidenceToIntensity` scaling |
| Spatial atmosphere | No single Foreground-tier object dominates — the tier system (`VISUAL_HIERARCHY.md`) genuinely has no clear winner, which is itself the honest visual expression of uncertainty |

## Major Geopolitical Events

**Real trigger**: a real, large jump in `globalEvents.data.length` since the last fetch **and/or** a real Breaking News item count increase — the same real signal already firing the existing one-shot shockwave (`fd389a2`).

| Dimension | Definition |
|---|---|
| Lighting | A brief, real, bounded brightness spike coinciding with the shockwave's own onset — not a sustained state change like Bull/Bear, since a geopolitical event is News-shaped (event, not standing condition) per `VISUAL_SEMANTICS.md`'s motion-character rule |
| Color temperature | News's existing orange (`#ff9f4f`) — distinct from Panic's red, since a geopolitical event is not itself a portfolio-loss signal until/unless it also moves `ambientState.tone` bearish |
| Motion | The real, existing one-shot shockwave, exactly as built — this document formalizes it as this state's signature rather than proposing a new effect |
| Camera behavior | Unchanged scripted-transition mechanism; no camera reaction beyond the existing parallax |
| Particle behavior | A brief, bounded density increase in the Sparkles field radiating from the event's real origin point, decaying with the shockwave |
| Visual tension | Sharp and momentary — rises fast, fully resolves within the shockwave's own real, existing lifetime |
| Material response | No change to Earth/panel materials — this state is expressed entirely through the event-shaped shockwave, never a standing material shift |
| Spatial atmosphere | Momentarily draws Foreground attention to the Breaking News/Global Events register, then recedes back to whatever the underlying Calm/Bull/Bear state already is once the shockwave completes |
