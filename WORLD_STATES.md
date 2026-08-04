# WORLD_STATES.md — 6 AI, Agreement, and Portfolio States

**Phase:** EMOTIONAL-DESIGN-001. Companion to [EMOTIONAL_DESIGN.md](EMOTIONAL_DESIGN.md). Same 8-dimension structure as [MARKET_MOODS.md](MARKET_MOODS.md), covering the mission's remaining 6 named states — all system-facing (about the platform's own reasoning) or portfolio-facing (about the user's own real position), never about the market as a whole.

---

## AI High Confidence

**Real trigger**: `cio.confidence === "HIGH_UNANIMOUS"` → `confidenceToIntensity()` returns `1`.

| Dimension | Definition |
|---|---|
| Lighting | Sharp, directional, unambiguous — the AI Recommendations panel's `EnergyBeam` renders at full brightness |
| Color temperature | AI's existing purple (`#b06bff`), fully saturated, no desaturation |
| Motion | Steady, minimal variance — reusing Agent Agreement's "stable" signature (near-zero jitter), since high confidence and agreement are closely related real signals |
| Camera behavior | Unchanged — confidence does not alter navigation |
| Particle behavior | Unchanged baseline |
| Visual tension | None — the defining feeling of this state is the *absence* of visual ambiguity |
| Material response | `ConfidenceHalo` at its real maximum radius/brightness (`confidenceToIntensity() = 1`) |
| Spatial atmosphere | The AI Recommendations panel/node reads as unmistakably Foreground-tier when this state is real and current |

## AI Low Confidence

**Real trigger**: `cio.confidence === "LOW_NO_SIGNAL"` → `confidenceToIntensity()` returns `0.15`.

| Dimension | Definition |
|---|---|
| Lighting | Dim, diffuse — the beam's brightness scales down with the same real intensity value |
| Color temperature | The same purple hue, desaturated toward gray — per `VISUAL_SEMANTICS.md`'s rule that Confidence modulates brightness/saturation of its host's existing hue, never introduces a new one |
| Motion | Slightly irregular, uncertain — a small, bounded flicker rather than Agreement's rock-steady glow |
| Camera behavior | Unchanged |
| Particle behavior | Unchanged baseline |
| Visual tension | Low-to-moderate — a visibly thin, uncertain `ConfidenceHalo` is itself the tension cue, no need for additional turbulence |
| Material response | `ConfidenceHalo` at its real minimum radius/brightness |
| Spatial atmosphere | This node should not compete for Foreground tier on confidence alone — low confidence is not urgency; if it also carries real Importance, tier is decided by that separate signal, not by low confidence itself |

## Strong Agreement

**Real trigger**: `memberRole()` returns `"agree"` for a real, large majority of committee members (`committee.agreement.members` covers most of the real, disclosed committee roster).

| Dimension | Definition |
|---|---|
| Lighting | Even, symmetric illumination across every `AgentConstellation` node — no single member lit differently from the rest |
| Color temperature | Green (`#4fffb0`) applied uniformly across the real agreeing members, per `recommendationActionColor`-style real data-driven convention already established in `visualizationMappings.js` |
| Motion | The least motion of any state in this whole document set — Agent Agreement's defining "stable" signature, directly reusing `DATA_VISUAL_DICTIONARY.md`'s definition |
| Camera behavior | Unchanged |
| Particle behavior | Unchanged baseline |
| Visual tension | None by definition — this is the calibration point every other agreement-adjacent state is judged against |
| Material response | `AgentConstellation` nodes render smooth, evenly lit, no competing highlight direction |
| Spatial atmosphere | The whole constellation reads as one coherent, settled shape rather than a scattered field |

## Strong Disagreement

**Real trigger**: `memberRole()` returns a real, roughly even mix of `"agree"` and `"disagree"` (`committee.disagreement.contraryMembers` real and substantial relative to `supportiveMembers`).

| Dimension | Definition |
|---|---|
| Lighting | Uneven, competing — two real clusters of `AgentConstellation` nodes lit from what visually reads as opposing directions |
| Color temperature | The only state permitted a real, bounded blend of green and red simultaneously in the same local cluster, capped by the real `MAX_SINGLE_EVIDENCE_WEIGHT`-style dominance discipline so neither side visually overwhelms the other, per `DATA_VISUAL_DICTIONARY.md`'s Conflict definition |
| Motion | Real, bounded jitter between the two real opposing clusters — Conflict's "turbulent" signature at its fullest, most legible expression |
| Camera behavior | Unchanged |
| Particle behavior | Unchanged baseline |
| Visual tension | Maximum among the system-facing states — this is the intended, honest visual expression of genuine committee disagreement, not something to soften |
| Material response | Two overlapping, semi-transparent surfaces per `DATA_VISUAL_DICTIONARY.md`'s Conflict material rule, never fully resolving into one |
| Spatial atmosphere | The constellation reads as visibly split into two real groups — never a single, falsely unified blob |

## Portfolio Gains

**Real trigger**: `portfolioHealth.data.valueChangePct > 0` (real, live), independent of overall `ambientState.tone` (a user could hold gains while the broader market/`ambientState` reads neutral or even bearish, and vice versa — this state is about the user's own real position specifically).

| Dimension | Definition |
|---|---|
| Lighting | Warm, close-proximity glow specifically on the Portfolio panel/holding-connection register — per Portfolio's "personal" signature in `DATA_VISUAL_DICTIONARY.md`, this warmth is localized, not scene-wide (scene-wide belongs to `ambientState.tone`, a separate real signal) |
| Color temperature | Green, scaled by real magnitude (`portfolioMagnitude` in `ambientState.js`) — applied specifically to the holding-connection pulses, per the real, existing mechanism |
| Motion | Energetic, quick holding-pulse rate — reusing Opportunities' energetic signature, scoped to the user's own real positions only |
| Camera behavior | Unchanged |
| Particle behavior | Unchanged baseline (Portfolio does not affect world-scope atmosphere directly beyond its real, existing contribution to `ambientState`'s blended tone) |
| Visual tension | Low — gains read as confident and settled, not urgent |
| Material response | Holding-connection lines rendered brighter, thicker within their existing real opacity range |
| Spatial atmosphere | The Portfolio panel's own proximity to the Earth (already the closest orbital ring) is what makes this feel personal rather than market-wide — unchanged layout, per this phase's own constraint, simply lit warmer |

## Portfolio Losses

**Real trigger**: `portfolioHealth.data.valueChangePct < 0` (real, live), same independence from broader `ambientState.tone` as Gains above.

| Dimension | Definition |
|---|---|
| Lighting | The same localized, close-proximity treatment as Gains, inverted — dimmer, cooler-red on the Portfolio register specifically |
| Color temperature | Red, scaled by real magnitude — same mechanism as Gains, opposite hue |
| Motion | Slower, heavier holding-pulse rate — reusing Risk's "heavy" signature, scoped to the user's own real positions |
| Camera behavior | Unchanged |
| Particle behavior | Unchanged baseline |
| Visual tension | Moderate — real, bounded line-bending on the specific real affected holdings (`FLAGSHIP_LAYOUT.md`'s existing holding-connection mechanism), never scene-wide turbulence from a personal loss alone (that would conflate the user's own position with a market-wide Panic state, which must remain a separate, independently-triggered condition) |
| Material response | Holding-connection lines dimmer, thinner within their existing real range |
| Spatial atmosphere | Localized weight on the Portfolio panel only — a real personal loss should feel personally heavier without implying the whole world is in crisis, which is precisely why this state's scope is deliberately narrower than Bear/Panic's world-scope in `MARKET_MOODS.md` |
