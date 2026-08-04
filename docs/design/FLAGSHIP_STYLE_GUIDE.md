# FLAGSHIP_STYLE_GUIDE.md — Materials, Lighting, Typography, Color

**Phase:** FLAGSHIP-UI-001. Companion to [FLAGSHIP_VISUAL.md](FLAGSHIP_VISUAL.md). Every rule below is stated as **current (real, in `workspace3d/`) → flagship elevation (proposed)**, so it is always clear what already exists and what this phase is adding.

---

## Materials

### Glass
**Current, real**: `GlassPanel`/`workspace3d.css`'s `.workspace3d-glass-panel` — `backdrop-filter: blur(18px) saturate(140%)`, translucent `rgba(16, 22, 44, 0.55)` fill, a soft layered box-shadow, a thin `rgba(255,255,255,0.16)` border. This is already good, real glassmorphism.
**Flagship elevation**: add a single, thin **inner top-edge highlight** (a 1px `rgba(255,255,255,0.25)` gradient fading after ~20% of the panel's height) — the one detail that makes glass read as a physical pane catching light from above rather than a flat translucent rectangle. Cheap (a CSS `::before` pseudo-element), no new dependency, no performance cost.

### Brushed metal
**Current, real**: not present anywhere in the current scene — the mission introduces this material fresh.
**Flagship elevation, scoped narrowly and deliberately**: reserved *exclusively* for the toolbar (`.workspace3d-toolbar__button`) and the glass panel's header bar — a subtle vertical brushed-metal gradient (fine, low-contrast repeating linear-gradient noise, `#1a2038` to `#232a48` at a few-degree angle) behind the existing translucent fill, never applied to the Earth, the orbital nodes, or the chain. This keeps metal as a deliberate "instrument panel" cue for controls specifically, distinct from the "living space" materials (glass, glow) used for content — directly satisfying "everything belongs to one visual system" by giving each material family exactly one job, never overlapping.

### Soft reflections
**Current, real**: none (no real-time reflection pass — a deliberate, disclosed performance decision in `IMPACTONE_3D_ARCHITECTURE.md`, which this document does not reopen).
**Flagship elevation, cheap and honest**: a static, pre-baked-looking soft reflection **only under the Earth** — a simple, screen-space CSS radial gradient anchored to the Earth's rendered screen position (not a real ray-traced reflection, and never presented as one) suggesting the Earth "sits" in the space rather than floating with no visual grounding. This is a cheap illusion, deliberately scoped to one object, not a general reflections system.

### Ambient glow
**Current, real**: already extensive and good — Earth's atmosphere shell (`Earth.jsx`, additive `#4f8cff` at `opacity 0.12`), each orbital node's own emissive material, the toolbar's active-state glow (`box-shadow: 0 0 18px rgba(79,140,255,0.4)`).
**Flagship elevation**: tie glow *intensity*, not just presence, to a real data value wherever one exists — e.g., an orbital node's glow should be measurably brighter when that module has a real, current high-Attention item, dimmer otherwise — directly continuing the prior phase's own "never decorative, always a disclosed function of real data" discipline (`VISUAL_LANGUAGE.md`, `3D_EXPERIENCE_GUIDELINES.md` §4) rather than a fixed decorative glow value.

### Premium typography
**Current, real**: the scene's own labels (`.workspace3d-node-label`, `.workspace3d-chain-label`) use the platform's existing default UI font at 11-12px, functional but not distinctive.
**Flagship elevation**: a single, deliberate display typeface reserved *only* for the flagship screen's own labels (module names, chain-step names) — a geometric, slightly condensed sans with generous letter-spacing on the small chain labels specifically (improves legibility at the small sizes 3D-projected text requires, and reads as more "instrument display" than default body text). This is a scoped typographic choice for this one screen's labels, not a proposal to change the platform's real, existing body/UI typography elsewhere.

## Lighting

- **Dark environment**: already real and correct (`.workspace3d-root`'s `radial-gradient(#0b1230 → #05070f)`) — kept unchanged as the base.
- **Large cinematic gradients**: elevation — widen the existing radial gradient's outer stop into a very large, extremely subtle secondary gradient sweep (a barely-perceptible purple-to-blue diagonal wash across the full canvas, `opacity` under 0.06) behind the existing radial base, giving the void real atmospheric variation instead of perfect radial symmetry, without competing with any real content.
- **Subtle volumetric light**: elevation — a few, sparse, very faint conical light-shafts (2-3 max, CSS-only, fixed position, never following the camera) implied to originate from off-frame, crossing behind the Earth — reusing the same "cheap CSS over expensive real-time volumetrics" discipline the real implementation already correctly applies to shadows/reflections.
- **Purple and blue accents**: already the real, dominant palette (`#4f8cff` Market Intelligence/Earth atmosphere, `#b06bff` AI Analysis) — kept and reinforced as the *only* non-semantic accent hues used anywhere in this screen's chrome (toolbar, glow, gradients).
- **Green only for positive signals / Red only for warnings**: **the single most important rule in this whole document, and one already partially at risk in the real current code.** `orbitalConfig.js`'s real `ORBITAL_MODULES` list currently assigns `#4fffb0` (green) to Portfolio and `#ff5f5f` (red) to Alerts **as fixed, permanent module-identity colors**, not as live positive/negative signals. **This must be corrected before flagship treatment, not merely dressed around**: a module's *identity* color (used for its resting-state glow/label) must be reassigned to a neutral palette color (proposed: Portfolio → the same blue family as Market Intelligence, distinguished by position/label only; Alerts → amber/orange, matching News' existing `#ff9f4f` family or a distinct neutral), reserving green/red *exclusively* for a real-time data state layered on top (e.g., Portfolio's node brightens green only when real aggregate P&L is positive right now, red only when negative) — directly the same class of color-semantics bug this whole engagement has found and fixed before (Confidence/Attention/Status badge-tone collisions in earlier phases) and must not reintroduce here.

## Color reference (flagship screen only)

| Role | Value | Rule |
|---|---|---|
| Void background | `#05070f` → `#0b1230` (existing, unchanged) | Base only, never text |
| Purple accent | `#b06bff` (existing, AI Analysis) | Chrome/glow only |
| Blue accent | `#4f8cff` (existing, Earth atmosphere/Market Intelligence) | Chrome/glow only |
| Positive (live data only) | `#4fffb0` | Never a fixed module identity color — see rule above |
| Risk/negative (live data only) | `#ff5f5f` | Never a fixed module identity color — see rule above |
| Brushed metal base | `#1a2038` → `#232a48` | Toolbar/panel header only |

## Typography reference (flagship screen only)

| Element | Treatment |
|---|---|
| Orbital node label | Display face, 12px, 0.02em tracking, weight 600 |
| Chain step label | Display face, 11px, 0.03em tracking, weight 600, uppercase |
| Panel title | Existing platform UI font, unchanged (real screen content inside the panel keeps its own real typography — this style guide governs the 3D scene's own chrome only, never the real feature screens rendered inside it) |
