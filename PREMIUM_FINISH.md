# PREMIUM_FINISH.md — The Final Itemized Finish Checklist

**Phase:** HOLLYWOOD-FINISH-001. Companion to [HOLLYWOOD_VISUALS.md](HOLLYWOOD_VISUALS.md), [COLOR_GRADING.md](COLOR_GRADING.md), [SPATIAL_COMPOSITION.md](SPATIAL_COMPOSITION.md). Every item: **current (real, as of `4c7670b`) → finish (proposed)**. This is the final 10% pass — the real implementation is already sophisticated (physical drag-momentum, data-driven ambient lighting, per-status connection behavior); nothing below is a foundational gap, only a finishing refinement.

---

## Light

| Current (real) | Finish |
|---|---|
| One real directional light, `shadows="soft"`, `1024×1024` map, intensity driven by `ambientState.intensity` | Add a second, much dimmer, fixed-position fill light (near-zero shadow cost — no `castShadow`) on the frame's opposite side, purely to keep the Earth's dark hemisphere from ever going to pure unlit black — a real, motivated "bounce light" cue, standard in any graded film frame, at negligible render cost |
| Earth's atmosphere glow color/intensity driven by `ambientState` | No change — already correctly data-driven, already the reference-correct pattern this whole document set holds up as the standard `panelConfig.js` must be corrected to match |

## Shadow

| Current (real) | Finish |
|---|---|
| Earth self-shadows, orbital nodes cast onto Earth (`castShadow`/`receiveShadow`, now actually rendered since `fc2dac5`) | No change to the 3D shadow system — already correctly scoped and cheap |
| No cast shadow from the focused glass panel onto the scene behind it | Add the cheap CSS contact-shadow layer specified in `SPATIAL_COMPOSITION.md` |

## Contrast

| Current (real) | Finish |
|---|---|
| Uniform contrast treatment across all three depth registers | Apply the register-aware S-curve from `COLOR_GRADING.md` — background crushed slightly, foreground allowed the most contrast |

## Scale

| Current (real) | Finish |
|---|---|
| Focused node `1.35×`, hover `+0.12` eased, all other nodes at one baseline scale regardless of tier | Apply `VISUAL_HIERARCHY.md`'s 3-tier scale/presence system precisely per `SPATIAL_COMPOSITION.md`'s table |

## Composition

| Current (real) | Finish |
|---|---|
| `OVERVIEW_CAMERA` frames the Earth near dead-center | Rule-of-thirds offset per `SPATIAL_COMPOSITION.md` |
| Focused-panel framing already keeps Earth visible behind it (real, correct) | Verify/preserve at narrow desktop breakpoints per `SPATIAL_COMPOSITION.md`'s panel-width note |

## Color grading

| Current (real) | Finish |
|---|---|
| `ambientState.js`'s tone/intensity/color system — correct, real, data-driven | Extend with the shadow-tint tone-shift in `COLOR_GRADING.md`; **no other change** — this module is the reference-correct pattern |
| `panelConfig.js`'s fixed green/red identity colors — **the single highest-priority open item across four consecutive phases** | Fix before considering any color-grading work complete, per `COLOR_GRADING.md` |

## Typography

| Current (real) | Finish |
|---|---|
| Orbital/chain labels: functional default sizing, no dedicated display treatment yet | Apply the previously-specified display-face/tracking treatment (`FLAGSHIP_STYLE_GUIDE.md`) — still not yet implemented in real code as of this phase; repeated here as a live, open item, not a new one |

## Materials

| Current (real) | Finish |
|---|---|
| Earth: `meshPhysicalMaterial` with real clearcoat (`fc2dac5`) | No change — already correct, physically-motivated |
| Glass panels: layered shadow, top-edge highlight, blur/saturation (`fc2dac5`) | No change — already correct |
| Brushed metal (toolbar/panel-header chrome) — specified in `FLAGSHIP_STYLE_GUIDE.md`, never implemented | Still open; lowest priority of all open items since its absence does not create a visible inconsistency the way the color-identity bug does |

## Motion

| Current (real) | Finish |
|---|---|
| Earth drag-momentum, eased hover, per-status connection pulse/opacity, ambient-state-driven intensity — all real, all purposeful, all pass the "nameable cause" test | No change — this is the reference-correct standard the rest of the product should be measured against |
| Scripted camera transitions remain fixed-duration, non-physical (deliberately, per `SPATIAL_INTERACTION_GUIDE.md`'s own disclosed reasoning) | No change — correctly, deliberately not physics-based, for wayfinding predictability |

## Spatial storytelling

| Current (real) | Finish |
|---|---|
| No explicit foreground/midground/background register discipline stated anywhere in prior docs | Formalized in `HOLLYWOOD_VISUALS.md`/`SPATIAL_COMPOSITION.md` as a permanent structural rule for every current and future orbital screen |

## Priority order

1. **Fix `panelConfig.js`'s hardcoded green/red identity colors** — now flagged across four consecutive design phases with zero code movement; every further color/lighting refinement in this document is undermined until this lands.
2. **Apply the 3-tier scale/presence and register-aware contrast system** — the biggest single visible improvement remaining, and it composes directly with work already shipped (`ambientState`, per-status pulse/opacity).
3. Everything else in this checklist — independent, no further sequencing required.
