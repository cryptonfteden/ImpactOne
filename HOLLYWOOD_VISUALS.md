# HOLLYWOOD_VISUALS.md — ImpactOne as a Frame From a High-Budget Film

**Phase:** HOLLYWOOD-FINISH-001. Documentation only — no production code changed (mission's own instruction: "No production code unless required to validate the experience"; none was required). Checked `git log` fresh first — one new, highly relevant commit since the last phase, `4c7670b` *"feat(frontend): make the flagship Earth scene physically interactive and data-driven"* — real drag-to-rotate Earth with momentum, eased hover, depth-of-field label blur on dimmed nodes, and `ambientState.js`, a real, tested module deriving `{tone, intensity, color}` from already-fetched portfolio/event data to drive the scene's lighting and color mood. Read alongside `IMMERSIVE_INTERACTIONS.md`, `SPATIAL_INTERACTION_GUIDE.md`, `PERFORMANCE_REVIEW.md`, and the real code (`Earth.jsx`, `OrbitalNode.jsx`, `ambientState.js`, `FlagshipEarthScene.jsx`).

**Scope discipline, stated up front per the mission's own words**: *"Do not redesign functionality. Do not redesign layout. Perfect execution only."* This phase's real implementation has already reached striking maturity — a physically-interactive globe with momentum, data-driven ambient lighting, per-panel status legible from line/pulse behavior alone. What follows is the final finishing pass: light, shadow, contrast, materials, and composition refined to their most premium possible expression of the exact same real layout and functionality, nothing added or moved.

---

## The brief, restated precisely: ILM + Apple + Bloomberg

Three real, distinct disciplines, each contributing one thing this document insists on:

- **ILM (Industrial Light & Magic)**: physically motivated light and shadow — every light source in the scene has an implied real position and behaves consistently with it; nothing is lit from "everywhere" or "nowhere." The real, already-enabled `shadows="soft"` directional light and the Earth's real self-shadowing (`fc2dac5`) are the literal foundation this principle builds on.
- **Apple**: extreme material and typographic restraint — a small number of materials (glass, physical globe surface), used with total consistency, never a fourth or fifth material introduced casually. Directly continuing `BRAND_VISUAL_RULES.md` Rule 6's glass/physical-material split.
- **Bloomberg**: information density that never sacrifices legibility — every one of the flagship screen's 10 real panels must remain instantly readable even as the surrounding scene becomes more cinematically rich; a beautiful frame that obscures real data is a failure of this brief, not a success.

## The one test for every recommendation below

**Every glow must have purpose. Every reflection must feel physical. Every component must cast presence.** Restated as a literal audit question per element: *(1) can I name the real data or real light source that causes this glow/reflection to look the way it does, and (2) does this element visually occupy real volume in the scene, or does it look pasted on top of it?* Anything failing either test is corrected, not merely dressed up further — this is the same discipline `PREMIUM_POLISH.md` and `BRAND_VISUAL_RULES.md` already established, now applied at final-finish precision.

## Foreground / midground / background — the mandatory structure for every screen

The mission requires every screen to read in three real depth registers. Mapped onto the real, current scene:

| Register | What lives here today (real) | Finish requirement |
|---|---|---|
| **Foreground** | The currently-focused glass panel (when open), or the single Primary-tier orbital node (per `VISUAL_HIERARCHY.md`'s tier system) | Must always read as physically nearest — sharpest focus, brightest light, the only register casting a visible contact shadow onto what's behind it |
| **Midground** | The Earth and the full 10-panel orbital ring | The scene's actual subject — correctly, already the most detailed, most lit register in the real implementation |
| **Background** | `<Stars>`, the void gradient, any dimmed/unfocused node | Must recede convincingly — the real `filter: blur(1px)` dimming (`4c7670b`) is the correct mechanism; `SPATIAL_COMPOSITION.md` specifies exactly how far this should extend |

## What this document set contains

- **[COLOR_GRADING.md](COLOR_GRADING.md)** — a literal color-grading pass (shadow/midtone/highlight tinting, contrast curve) layered on top of the real, already-correct `ambientState.js` tone system — never replacing it.
- **[SPATIAL_COMPOSITION.md](SPATIAL_COMPOSITION.md)** — the precise foreground/midground/background depth rules, scale relationships, and compositional framing for the real scene.
- **[PREMIUM_FINISH.md](PREMIUM_FINISH.md)** — the final, itemized light/shadow/material/motion audit checklist.

## One disclosed, carried-forward finding that a Hollywood-grade color pass makes newly urgent

`panelConfig.js`'s hardcoded green/red identity colors for `portfolioHealth`/`fearGreed` (first found in `FLAGSHIP_COMPONENT_SPEC.md`, still unresolved through `PREMIUM_POLISH.md` and `BRAND_VISUAL_RULES.md`) is now in even sharper conflict with the real, correct `ambientState.js` system built since: that module correctly computes green/red *only* from real portfolio direction, applied scene-wide. A film-grade color grade sitting on top of two independent, sometimes-contradicting color logics (one correct and data-driven, one fixed and decorative) would look like a continuity error to a trained eye — literally the kind of defect ILM's own color pipeline exists to catch. This remains the single highest-priority fix underneath any further visual work; see `COLOR_GRADING.md` for how it must be resolved before grading can be considered complete.
