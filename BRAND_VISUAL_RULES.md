# BRAND_VISUAL_RULES.md — What Must Never Be Violated

**Phase:** PRODUCT-IDENTITY-001. Companion to [SIGNATURE_ELEMENTS.md](SIGNATURE_ELEMENTS.md). These are binding rules, not preferences — any future change (design or code) that violates one of these breaks ImpactOne's own recognizability, per the mission's "someone should recognize a screenshot instantly" bar.

---

## Rule 1: The Earth is always the center of gravity

Any new orbital-style screen must place the same real, singleton Earth object at its origin, at the same real scale (`EARTH_RADIUS = 2`) — never a resized, repositioned, or duplicated Earth. A screen with two Earths, or an off-center Earth, is not an ImpactOne screen.

## Rule 2: Navigation is camera movement, never a cut or a route change

Every transition between an orbital-ring node and its content must go through the real, shared camera-easing mechanism (`CameraRig.jsx`/`cameraEasing.js`). A hard cut, a fade-to-white, a full-page navigation, or a modal dialog breaking the 3D scene's continuity is a rule violation — not a stylistic variant.

## Rule 3: Green and red are reserved exclusively for real, disclosed facts

**This is the single most important, and currently the single most at-risk, rule in this whole document.** Green (`#4fffb0`) may only ever represent a real, positive market/portfolio fact happening right now. Red (`#ff5f5f`) may only ever represent a real risk/negative fact. Neither may ever be used as a fixed decorative identity, chrome color, or permanent label tint.

**Current, real, disclosed violation, confirmed still present as of this phase**: `frontend/src/features/flagshipScreen/panelConfig.js` assigns `portfolioHealth: "#4fffb0"` and `fearGreed: "#ff5f5f"` as fixed panel-identity colors — used for that panel's resting-state orbital node glow and connecting line regardless of the real data inside it. This has now been identified across three consecutive phases (`FLAGSHIP_COMPONENT_SPEC.md`, `PREMIUM_POLISH.md`, and here) without a code fix landing. **This document formally elevates it from "a proposed correction" to "a broken brand rule requiring a fix before any further visual polish work is prioritized ahead of it."** The correct fix (reassign both panels' fixed identity color to a neutral hue; drive green/red only from each panel's own real live data state, exactly as `.flagship-panel__stat .is-positive`/`.is-negative` already correctly does) remains unchanged from the prior phases' specification.

## Rule 4: Purple and blue are the only non-semantic accent hues

Any new UI chrome, glow, gradient, or ambient light introduced anywhere in the product must draw from the purple/blue family already established (`#b06bff`, `#4f8cff`, `#5fd0ff`) — introducing a new, unrelated accent hue for decorative purposes (e.g., a marketing page adopting an off-brand teal or gold "just for that page") breaks the color-language signature.

## Rule 5: Motion always has a real, nameable cause

Directly inherited from `CINEMATIC_GUIDELINES.md`/`FLAGSHIP_COMPONENT_SPEC.md`'s already-established rule, restated here as a permanent brand rule rather than a one-phase recommendation: no animation may exist in this product that cannot name the real event or real data value it communicates. An idle, purely decorative animation (a camera that drifts on its own, a node that pulses with no data behind it) is a rule violation, not a minor embellishment.

## Rule 6: Glass is for content, physical material is for the Earth — never swapped

A floating panel is always glass (translucent, blurred, softly shadowed). The Earth is always physically lit, opaque material (clearcoat, self-shadowing). A future addition that renders panel content with a physically-lit opaque material, or renders the Earth as flat translucent glass, breaks the one clean material-family distinction this whole system depends on for legibility.

## Rule 7: Orbital spacing is always computed, never manually placed

Any new orbital node's position must come from the real, shared `orbitalPosition()` function (or a disclosed, tested equivalent) — never a manually chosen, one-off coordinate. This keeps every current and future orbital screen sharing the exact same spatial rhythm, which is itself part of what makes a screenshot recognizable regardless of which specific screen it's from.

## Consistency mechanism: one shared component family, never a parallel reimplementation

The real, disclosed pattern already established across `IMPACTONE-3D-WORKSPACE-001` and `FLAGSHIP-SCREEN-001` — every new orbital screen imports `Earth`, `CameraRig`, `OrbitalNode`, and the shared glass panel shell directly from `features/workspace3d/`, rather than re-implementing a parallel version — is itself the mechanism that makes Rules 1-7 enforceable in practice rather than just in a document. **Any future screen that reimplements its own Earth, its own camera logic, or its own glass panel styling instead of importing the real, shared versions is a structural risk to every rule above**, since divergence would then have to be caught by review rather than being architecturally impossible.
