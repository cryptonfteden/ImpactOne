# SPATIAL_COMPOSITION.md — Depth, Scale, and Framing

**Phase:** HOLLYWOOD-FINISH-001. Companion to [HOLLYWOOD_VISUALS.md](HOLLYWOOD_VISUALS.md). Precise rules for how the real scene's existing elements (Earth, 10-panel ring, glass panels, chain) occupy foreground/midground/background, and how scale and framing communicate presence.

---

## The three registers, precisely bounded

Extending `HOLLYWOOD_VISUALS.md`'s table with exact, real, implementable boundaries:

- **Foreground** — anything within the camera's near third of visible depth: the focused glass panel (when open, per the real `focusedCameraFor` camera state) and, in the resting overview state, whichever single orbital node currently holds Primary tier (`VISUAL_HIERARCHY.md`). Foreground elements are the only ones permitted the sharpest render (no blur), the brightest highlight, and — new in this document — a real, cast **contact shadow onto the midground** (a soft, dark ellipse where the focused panel's implied position would occlude the Earth/ring behind it, achievable as a cheap CSS radial-gradient darkening layered just behind the glass panel's DOM position, not a real-time 3D shadow).
- **Midground** — the Earth and the full orbital ring at `y ≈ 0`, always in full, un-blurred detail. This register never recedes, never blurs, regardless of what's focused — it is the scene's permanent subject, per `BRAND_VISUAL_RULES.md` Rule 1's Earth-as-center invariant.
- **Background** — `<Stars>`, the void gradient, and any node currently in Ambient tier. This is the *only* register permitted the real depth-of-field blur already implemented (`4c7670b`'s `filter: blur(1px)` on dimmed labels) — this document extends that same treatment to the Ambient-tier node's own mesh material (a slightly reduced emissive intensity and a very small amount of render-side softness via reduced material roughness contrast), not just its label.

## Scale relationships (what "cast presence" means, concretely)

"Every component must cast presence" is operationalized as a strict, real scale hierarchy — nothing in the scene may be visually ambiguous about its own relative importance:

| Element | Real current scale | Presence rule |
|---|---|---|
| Earth | `EARTH_RADIUS = 2`, fixed, never changes | The permanent scale reference every other object's presence is judged against — this must never change per screen (`BRAND_VISUAL_RULES.md` Rule 1) |
| Focused/Primary orbital node | `1.35×` base (focused) / enlarged per `VISUAL_HIERARCHY.md`'s Primary tier | Must always be the single largest non-Earth object in frame at any moment — if two nodes are ever visually the same enlarged size simultaneously, the hierarchy has failed |
| Secondary-tier node | Baseline scale | Reads as "present but not the point" — exactly the scene's existing default node size, unchanged |
| Ambient-tier node | Baseline scale, dimmed emissive, blurred label | Must read as smaller *in presence* even though its literal mesh radius is identical to Secondary — achieved entirely through the light/blur/opacity treatment above, never by literally shrinking the geometry (shrinking would break the real, tested `orbitalPosition()` math's assumption of uniform node scale) |

## Composition: framing the overview

The real `OVERVIEW_CAMERA` (`[0, 9, 14]` looking at the origin) already produces a reasonably balanced frame. Refinement: the Earth's own screen-space position within this framing should sit **slightly below and left of true center** (a classic rule-of-thirds placement, not dead-center) — achievable as a small, disclosed adjustment to the existing camera position/target constants, giving the composition real visual asymmetry (which reads as "composed" rather than "centered/generic") while keeping every orbital node fully in frame, which the existing `OVERVIEW_CAMERA` values already guarantee and this adjustment must preserve.

## Composition: framing a focused panel

`focusedCameraFor`'s real rule (camera pulled back along the Earth-to-panel ray, panel filling frame, Earth visible behind) already produces the mission's own explicit "Earth remains visible behind it" requirement correctly. Refinement: the glass panel's own real screen position (`workspace3d-glass-panel`'s `inset: 5% 5% 5% auto; right: 5%`) should be confirmed to always leave the Earth's own lit face at least partially visible in the remaining left/lower frame — this is already true at typical desktop widths per the real CSS, but should be explicitly verified against the panel's own `min(560px, 44vw)` width rule at narrower desktop breakpoints where 44vw could plausibly crowd the Earth out of frame entirely.

## Spatial storytelling: what the eye is meant to do, second by second

Directly continuing (not duplicating) `FIRST_IMPRESSION.md`'s entrance sequence: once resting, the eye's path should be **Earth → brightest orbital node (Primary tier) → that node's connecting line → back to Earth**, a closed visual loop rather than a scan that trails off into empty space. This is achievable entirely through the existing real elements (Earth's fixed presence, Primary tier's real brightness, the connecting line's real per-status opacity from `4c7670b`) — no new object is needed, only the disciplined application of brightness/scale already specified above.

## What this document does not touch

No change to the real orbital radius, panel count, panel order, or navigation mechanics — per the mission's own "do not redesign layout," every rule above operates entirely through light, scale-of-emphasis (not literal geometry), and camera framing constants, never through moving where a panel actually sits in the ring.
