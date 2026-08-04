# PREMIUM_POLISH.md — The Area-by-Area Polish Checklist

**Phase:** CINEMATIC-EXPERIENCE-001. Companion to [CINEMATIC_GUIDELINES.md](../design/CINEMATIC_GUIDELINES.md). Every item is stated as **current (real, shipped in `306b4a5`/`10a3b73`) → polish (proposed)** — this is a concrete implementation checklist for a future phase, not new invention. Organized by the mission's own 5 Focus Areas.

---

## Typography

| Current (real) | Polish |
|---|---|
| Panel `h3` 16px/700, no defined type family beyond the platform default | Adopt `FLAGSHIP_STYLE_GUIDE.md`'s already-proposed display face for panel headers specifically (not body text), 16px, 0.01em tracking |
| Stat numbers 22px/700, gauge 32px/800 — no tabular-figure enforcement | Apply `font-variant-numeric: tabular-nums` to every real numeric stat/gauge so real values never visually jitter in width as they update on refetch |
| Orbital/panel node labels 12px, no letter-spacing rule | 12px, 0.02em tracking, per `FLAGSHIP_STYLE_GUIDE.md`'s existing label spec — now applied consistently to Flagship panel labels too, not only the original 3D Workspace's 7 module labels |

## Layout

| Current (real) | Polish |
|---|---|
| Ad hoc per-element spacing values across `flagshipScreen.css` | Convert to the `rhythm-*` scale defined in [VISUAL_HIERARCHY.md](../design/VISUAL_HIERARCHY.md) |
| All 10 panels equal visual weight regardless of real content | Apply the 3-tier hierarchy system from [VISUAL_HIERARCHY.md](../design/VISUAL_HIERARCHY.md), driven by each panel's own real `useFlagshipData.js` state |
| Glass panel fixed at `min(560px, 44vw)` regardless of real content density | Allow a real, data-driven height (not width) variance within a capped range — a panel with an honestly empty list (e.g., no active Alerts) should not reserve the same vertical space as one with a real, dense 8-item list |

## 3D

| Current (real) | Polish |
|---|---|
| Panel ring flat at `y = 0` (`FLAGSHIP_RADIUS = 8`) | Shallow per-panel vertical stagger, per `CINEMATIC_GUIDELINES.md`'s depth elevation |
| `<Stars>` at a single fixed radius | Extend radius range for a felt sense of a far, dim fourth register (`CINEMATIC_GUIDELINES.md`) |
| Static screen-space Earth grounding shadow: **not yet present** | Add per `FLAGSHIP_STYLE_GUIDE.md`'s already-specified cheap CSS radial-gradient reflection beneath the Earth |
| Connecting lines fixed opacity `0.22` regardless of panel tier | Brightness driven by the panel's real tier (Primary/Secondary/Ambient), per [VISUAL_HIERARCHY.md](../design/VISUAL_HIERARCHY.md)'s reading-order cue |

## Motion

| Current (real) | Polish |
|---|---|
| `OrbitalNode`'s idle pulse plays identically for every node regardless of real underlying data | **Still open from `FLAGSHIP_COMPONENT_SPEC.md` — repeated here as this phase's own binding requirement, not a new finding**: pulse amplitude must become a real function of that panel's own current real Attention/urgency (directly reusable as the same signal driving the Tier system above — one real computation, two visual consequences, never two separately-invented ones) |
| No scripted entrance sequence; scene appears fully resolved on first paint | Add the entrance sequence specified in [FIRST_IMPRESSION.md](FIRST_IMPRESSION.md) |
| Camera transitions already ease-in-out (`CameraRig.jsx`) | Kept unchanged — already satisfies "natural timing" |
| Holding-connection pulses already independently phased (`offset = index * 1.3`) | Kept unchanged — already satisfies "purposeful" (directly tied to real portfolio delta data) |

## Visual Identity (materials, glass, metal, light, reflections, gradients)

| Current (real) | Polish |
|---|---|
| Glass panel: `blur(18px) saturate(140%)`, layered shadow, thin border — good, real glassmorphism | Add the single top-edge highlight from `FLAGSHIP_STYLE_GUIDE.md` |
| Toolbar (`Mission Chain` button): translucent pill, no metal treatment | Apply the brushed-metal treatment from `FLAGSHIP_STYLE_GUIDE.md`, scoped to toolbar/panel-header chrome only |
| Background: single radial gradient (`#0b1230` → `#05070f`) | Add the wide secondary gradient sweep and sparse volumetric light-shafts from `FLAGSHIP_STYLE_GUIDE.md`/`CINEMATIC_GUIDELINES.md` |
| **A real, still-unresolved color-semantics risk, carried forward from `FLAGSHIP_COMPONENT_SPEC.md` and now confirmed present in the shipped `panelConfig.js`**: `portfolioHealth`'s identity color is hardcoded `#4fffb0` (green) and `fearGreed`'s is hardcoded `#ff5f5f` (red) — **permanent per-panel identity colors, not live positive/negative state.** This directly violates the mission's own stated rule ("green only for positive signals, red only for warnings") a second time, now in real, shipped code rather than only a prior design proposal. | **This is the single highest-priority item in this whole polish pass.** Reassign both panels' identity colors to neutral hues (the same correction already specified in `FLAGSHIP_STYLE_GUIDE.md`); reserve green/red exclusively for the real live data already rendered correctly elsewhere in the same codebase (`.flagship-panel__stat .is-positive`/`.is-negative`, which *are* real, live-data-driven and correctly scoped — the bug is in the panel's fixed identity color, not in its real stat coloring). |

## Priority order for implementation

1. The color-semantics identity-color fix (above) — a real, disclosed rule violation, not a subjective polish preference.
2. The 3-tier hierarchy system + tied motion-amplitude signal ([VISUAL_HIERARCHY.md](../design/VISUAL_HIERARCHY.md), Motion table above) — one real computation driving two real visual outcomes.
3. Everything else in this document — pure visual refinement with no dependency ordering between items.
