# SIGNATURE_ELEMENTS.md — The 8 Signatures of ImpactOne

**Phase:** PRODUCT-IDENTITY-001. Companion to [PRODUCT_IDENTITY.md](PRODUCT_IDENTITY.md). Each of the mission's 8 named focus areas, defined as a precise, current, real signature — not aspiration.

---

## 1. Signature layout: the orbital ring around a fixed center

Every real screen in this family (`Workspace3DScene.jsx`, `FlagshipEarthScene.jsx`) places its subject matter as nodes on a circle around a single, fixed-position, fixed-scale Earth at the origin — never a grid, never a list-first layout. This is ImpactOne's one true layout signature: **content orbits a center; it does not stack.**

## 2. Signature lighting: a lit globe in a purple-blue void

The real, current lighting recipe (`Earth.jsx` post-`fc2dac5`): a `meshPhysicalMaterial` base with real clearcoat sheen, a breathing atmosphere-glow shell, one real directional light now actually casting soft shadows (`shadows="soft"`, `1024×1024` map). Combined with the void background's `#0b1230 → #05070f` radial gradient, this produces ImpactOne's signature lighting fingerprint: **one warm, physical light source against a cool, near-black void** — recognizable even in a tightly cropped screenshot of the Earth's edge alone.

## 3. Signature typography: display labels floating in space, real UI type inside panels

Two distinct, deliberately separate typographic registers, never mixed: (a) small, tracked, uppercase-leaning display labels rendered *in* the 3D scene itself via `<Html>` (orbital node labels, chain-step labels) — reads as "instrument display," and (b) the platform's normal, real UI typography inside every glass panel's actual content (`FlagshipPanelContent.jsx`). A screenshot showing floating, glowing pill-shaped labels over a dark 3D scene is itself a recognizable ImpactOne signature, independent of font choice specifics.

## 4. Signature motion: physically-eased camera flight, never a cut

`CameraRig.jsx`'s real, current behavior (post-`fc2dac5`): a fixed `0.9s`, cubic-eased tween between two known camera poses, redirecting smoothly if interrupted. No route change, no fade-to-black, no loading transition ever appears between views. This is ImpactOne's signature motion fingerprint — **the feeling of being flown somewhere, never sent somewhere.**

## 5. Signature color language: purple/blue chrome, green/red reserved for fact only

The real, correctly-applied rule almost everywhere in this codebase: purple (`#b06bff`) and blue (`#4f8cff`) are the only non-semantic accent hues used for chrome, glow, and ambient light. Green (`#4fffb0`) and red (`#ff5f5f`) never appear except attached to a real, disclosed positive/risk fact (`.flagship-panel__stat .is-positive`/`.is-negative` is the correct, real reference implementation of this rule). **This is a signature specifically because it is a restraint, not a palette** — a competitor could copy the exact hex values and still fail to copy the discipline of *when* they may appear. See `BRAND_VISUAL_RULES.md` for the one real, current place this restraint is currently violated (`panelConfig.js`'s fixed panel-identity colors) and must be fixed to keep this signature intact.

## 6. Signature materials: glass that floats, a globe that has real weight

Two real, deliberately distinct material families, never overlapping in application (`FLAGSHIP_STYLE_GUIDE.md`'s original material-scoping rule, now further realized in real code by `fc2dac5`'s layered glass shadows/top-edge highlight and Earth's real clearcoat): **glass** (translucent, blurred, softly shadowed — every floating panel) and **physical globe material** (opaque, clearcoat-lit, self-shadowing — the Earth alone). No third material family exists yet; brushed metal (proposed in `FLAGSHIP_STYLE_GUIDE.md`, not yet implemented) would become a third, narrowly-scoped signature (toolbar/chrome only) once built.

## 7. Signature spacing: content orbits at a fixed radius, never freely placed

`orbitalPosition()`'s real, deterministic, evenly-divided-circle math (`orbitalConfig.js`) is itself a spacing signature: every node's distance from the Earth and from its neighbors is a precise, computed, repeatable function of the total node count — never manually eyeballed per screen. This guarantees that any current or future orbital screen (the 3D Workspace's 7 modules, the Flagship Screen's 10 panels) shares the exact same underlying spatial rhythm, even though the two screens show different content.

## 8. Signature iconography: glowing spheres and connecting light-lines, not glyphs

ImpactOne's real, current "iconography" is not a conventional icon set at all — it is the orbital node itself (a small, emissive, colored sphere) plus its real connecting line back to the Earth (`FLAGSHIP_LAYOUT.md`'s "Connecting Lines"). This is a deliberate, disclosed departure from typical fintech iconography (line-art symbol icons) and is itself instantly recognizable: **a small glowing orb connected to a globe by a thread of light is, on its own, a recognizable ImpactOne mark**, independent of any panel content or label.
