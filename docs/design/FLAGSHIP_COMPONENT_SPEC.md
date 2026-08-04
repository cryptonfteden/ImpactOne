# FLAGSHIP_COMPONENT_SPEC.md — Concrete Component Elevation Specs

**Phase:** FLAGSHIP-UI-001. Companion to [FLAGSHIP_STYLE_GUIDE.md](FLAGSHIP_STYLE_GUIDE.md) and [FLAGSHIP_EXPERIENCE.md](FLAGSHIP_EXPERIENCE.md). Each real component in `frontend/src/features/workspace3d/` is specified here as **current (real, shipped)** vs **flagship elevation (proposed)** — nothing below has been implemented; this is a specification for a future implementation phase to build against.

---

## Motion governing rule for every component below

The mission's own 3 motion principles — "every object has weight, every animation has purpose, nothing moves unnecessarily" — are applied as a literal test per component: **any current or proposed animation that cannot name the real thing it communicates is removed, not kept for spectacle.** This is stricter than the prior phase's own motion rule and is applied below even where it means flagging an existing real animation as needing correction.

## Earth (`Earth.jsx`)

- **Current**: 3 stacked spheres (base `#1b3a6b`/emissive `#0a1a33`, cloud shell `#dfe9ff` at 0.08 opacity, atmosphere glow `#4f8cff` at 0.12 opacity), continuous rotation (`delta * 0.05` base, `delta * 0.07` clouds).
- **Elevation**: add the static screen-space reflection described in `FLAGSHIP_STYLE_GUIDE.md` (a DOM-layer CSS gradient beneath the canvas, not a new mesh — zero added render cost). Rotation speed unchanged (already purposeful: "this is a live, real world, always turning" is a real, nameable meaning, passing the motion test above). No new geometry, no texture asset — continuing the real, deliberate "no new binary asset" discipline already documented.

## Orbital Node (`OrbitalNode.jsx`)

- **Current**: continuous sinusoidal scale-pulse (`1 + sin(...) * 0.08`) on every node, always, regardless of any real underlying data — per-node phase offset only prevents visual lockstep.
- **Flagship correction (not just elevation)**: this idle pulse, as it exists today, **fails this document's own motion test** — it does not currently communicate anything real; it plays identically whether or not that module has anything noteworthy happening. Proposed fix: the pulse's *amplitude* becomes a real, disclosed function of that module's own current real Attention/Importance value (already computed elsewhere in this platform, per `VISUAL_LANGUAGE.md`'s Mission Control precedent) — a module with nothing urgent right now holds nearly still (amplitude near 0), a module with a real, current high-attention item pulses noticeably. This is the single most important correction in this whole document set: it turns a decorative idle animation into "every animation has purpose," using an approach this engagement has already validated works (the identical principle already proposed for Mission Control cluster brightness in the prior visual-direction phase).
- **Color**: identity color reassigned per `FLAGSHIP_STYLE_GUIDE.md`'s green/red correction — Portfolio and Alerts no longer hardcode `#4fffb0`/`#ff5f5f` as permanent identity; a neutral identity color is used for the resting node, with green/red reserved for a real live-data overlay state only.
- **Focus scale**: current `pulse * 1.35` on focus kept unchanged — a real, purposeful state change (communicates "this is the one you selected"), passes the motion test as-is.

## Mission Control Chain (`MissionControlChain.jsx`)

- **Current**: 6 labeled nodes connected by a line, one glowing pulse traveling the full chain on a deterministic loop.
- **Elevation**: per `FLAGSHIP_VISUAL.md`, the chain's spatial layout arcs upward through the frame's vertical center (a real, disclosed layout change to the existing component's node positions, not new logic) so it reads as the composition's spine in a still frame. The traveling pulse's motion is unchanged — it already passes the motion test outright (it is the literal, real visualization of an event moving through the platform's own real reasoning pipeline; nothing about it is decorative).
- **New, narrow addition**: an optional "hold" state — when the flagship screen is used for a still image/screenshot (per `FLAGSHIP_EXPERIENCE.md`'s App Store treatment), the pulse should be capable of being paused at a specific, chosen position along the chain (e.g., mid-way, on "Sector Impact") rather than only ever mid-loop at an arbitrary random moment — a small, real, disclosed capability needed specifically because this screen must also work as a non-animated static asset.

## Glass Panel (`GlassPanel.jsx` / `.workspace3d-glass-panel`)

- **Current**: `blur(18px) saturate(140%)`, layered box-shadow, 0.4s ease scale/opacity entrance (respecting `prefers-reduced-motion`).
- **Elevation**: add the single top-edge highlight and (for the toolbar/header specifically) the brushed-metal treatment from `FLAGSHIP_STYLE_GUIDE.md`. Entrance animation duration/easing kept unchanged — already purposeful (communicates "this panel just opened in response to your click") and already respects reduced motion, nothing to correct.

## Toolbar (`.workspace3d-toolbar__button`)

- **Current**: pill button, translucent fill, hover `translateY(-1px)`, active-state glow.
- **Elevation**: brushed-metal background treatment (`FLAGSHIP_STYLE_GUIDE.md`). Hover/active motion kept unchanged — already minimal and purposeful.

## Background / environment (`.workspace3d-root`)

- **Current**: single radial gradient, `<Stars>` (1200-point cheap geometry).
- **Elevation**: add the wide secondary gradient sweep and sparse volumetric light-shaft accents from `FLAGSHIP_STYLE_GUIDE.md` — both static/CSS, zero added render cost, zero new WebGL geometry, preserving the real, disclosed 60fps performance target `IMPACTONE_3D_ARCHITECTURE.md` already established.

## What remains explicitly unspecified here

Exact numeric values for the new gradient/light-shaft/reflection treatments (precise gradient stops, opacity curves) are left to an implementation pass with real visual iteration in a browser — this document specifies *what* each element is and *why* it exists, not pixel-perfect final constants, consistent with this being a design specification rather than production code.
