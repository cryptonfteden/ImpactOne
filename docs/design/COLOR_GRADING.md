# COLOR_GRADING.md — The Final Color Pass

**Phase:** HOLLYWOOD-FINISH-001. Companion to [HOLLYWOOD_VISUALS.md](HOLLYWOOD_VISUALS.md). A literal cinematic color-grading specification layered on top of — never replacing — the real, already-correct `ambientState.js` tone system (`computeAmbientState`'s `{tone, intensity, color}`, driven by real portfolio/event data).

---

## Grading philosophy: one real light source, one real mood signal, everything else derived

A film's color grade is not "add more color" — it is disciplined tonal shaping around a small number of real, motivated sources. ImpactOne already has exactly the right foundation for this: **one real ambient mood** (`ambientState`'s tone: bullish/bearish/neutral) and **one real light source** (the directional light plus the Earth's own emissive glow). Every additional grading move below must derive from one of these two real sources — never introduce a third, independent color decision.

## Shadow / midtone / highlight tinting (new, proposed)

A restrained three-zone grade applied to the void background and glass panel shadows (CSS-only, no WebGL change required):

| Zone | Current | Grade |
|---|---|---|
| Shadows (void background, panel drop-shadows) | Flat near-black (`#05070f`) | Shift very slightly toward deep indigo (`#080a1c`) — shadows are never pure neutral black in a graded frame; a faint cool tint keeps them feeling lit-by-something rather than an absence of render |
| Midtones (glass panel fills, dimmed/ambient-tier nodes) | Neutral translucent navy | No shift — this register is intentionally the calibration point; everything else grades relative to it |
| Highlights (Earth's lit face, focused/Primary-tier node glow, the traveling chain pulse) | `ambientState`'s real tone color, applied directly | Add a small, real "warm kick" only on the single brightest highlight in frame at any moment (the Earth's sun-facing clearcoat highlight) — a subtle, `+3-5%` shift toward white-warm rather than pure hue, which is what makes a real physical highlight (versus a flat emissive) read as reflecting an actual light source |

## Contrast curve

**Current, real**: the scene's dynamic range is already reasonably wide (near-black void, bright emissive nodes) but applied uniformly — every register contrasts against the void equally.
**Grade**: an S-curve applied conceptually across the three depth registers from `HOLLYWOOD_VISUALS.md`'s foreground/midground/background table — background (Stars, dimmed nodes) crushed slightly darker/flatter than today, midground (Earth, ring) unchanged, foreground (the focused panel/Primary node) allowed to be the single brightest, highest-contrast element in frame. This is a compositional contrast hierarchy, not a global brightness/contrast slider — it must never make any real panel's actual content harder to read (directly bounded by `HOLLYWOOD_VISUALS.md`'s Bloomberg legibility requirement).

## The tone system, extended (not replaced)

`ambientState.js`'s three tones (bullish/bearish/neutral) are correct and must remain the sole source of any green/red anywhere in the graded frame. This document adds exactly one new, disclosed extension: **the shadow-zone indigo tint above should itself shift very slightly warmer when tone is bearish and cooler when tone is bullish** (a few percent, barely perceptible) — a real, disclosed, data-driven grade extension consistent with the existing module's own contract (`computeAmbientState`'s return shape does not need to change; the consuming CSS/material simply reads the existing `tone` field one additional time). This is the *only* place this document proposes extending real logic, and it is a read of an existing field, not new computation.

## The one grading rule that cannot be finished until a real bug is fixed

**Color grading fundamentally assumes there is exactly one source of truth for what a color means in a given frame.** `panelConfig.js`'s hardcoded `portfolioHealth: "#4fffb0"` / `fearGreed: "#ff5f5f"` identity colors are a second, independent, fixed source of green/red that the grade described above cannot correctly account for — a bearish `ambientState` tone (correctly rendering the whole scene with a red-shifted mood) sitting next to a Portfolio Health node that is *always* green regardless of that mood is a real, visible contradiction, not a subtle one. **This document formally states: the color-grading pass specified here cannot be considered complete or correct until `panelConfig.js`'s fixed identity colors are corrected to neutral hues**, exactly as already specified in `FLAGSHIP_STYLE_GUIDE.md` and re-flagged in every visual-design phase since. This is now the fourth phase to identify this same real, unresolved defect.

## What is explicitly not being proposed

No LUT (look-up table), no post-processing color-grade pass (e.g., a full-screen tone-mapping shader), and no bloom/vignette pipeline — consistent with this whole engagement's own repeated, correct performance discipline (`IMPACTONE_3D_ARCHITECTURE.md`, `PERFORMANCE_REVIEW.md`) of achieving "premium" through cheap, targeted material/CSS choices rather than an expensive rendering pipeline this platform has already deliberately and correctly decided against.
