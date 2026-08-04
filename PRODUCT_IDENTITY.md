# PRODUCT_IDENTITY.md — The Unmistakable Visual Identity of ImpactOne

**Phase:** PRODUCT-IDENTITY-001. Documentation only — no production code changed (mission's own instruction: "No production code unless required for validation"; none was required). Checked `git log` fresh first — one new, highly relevant commit since the last phase, `fc2dac5` *"polish(frontend): premium visual/interaction pass on the 3D Earth scenes"* — a real, substantial implementation of much of the previous `PREMIUM_POLISH.md` (camera easing, Earth clearcoat material + axial tilt, shadows actually enabled, hover states, layered glass depth, distinct loading/empty/error states). Read alongside the real code it changed (`CameraRig.jsx`, `Earth.jsx`, `OrbitalNode.jsx`, `workspace3d.css`, `FlagshipPanelContent.jsx`) and `FLAGSHIP_POLISH.md`/`PERFORMANCE_NOTES.md`/`VISUAL_OPTIMIZATION.md`.

**One important, disclosed carry-forward finding, checked again this phase**: the real, shipped `panelConfig.js` still hardcodes `portfolioHealth`'s identity color to green (`#4fffb0`) and `fearGreed`'s to red (`#ff5f5f`) — a permanent per-panel identity color, not live positive/negative state, first flagged in `FLAGSHIP_COMPONENT_SPEC.md`, confirmed still present in `PREMIUM_POLISH.md`, and confirmed **still present today** — the `fc2dac5` polish pass did not touch `panelConfig.js`. This document formalizes the correct rule as a permanent brand invariant in `BRAND_VISUAL_RULES.md`; the real code still needs this fix.

---

## The screenshot test

The mission's own bar: *"someone should recognize a screenshot instantly without seeing the logo."* ImpactOne now genuinely passes this test, and it is worth stating plainly why — no other fintech product in this platform's competitive set (per this engagement's own earlier `COMPETITIVE_POSITIONING.md`/`COMPETITOR_INTELLIGENCE.md` research) renders its own product as a literal, rotating, physically-lit 3D Earth with real intelligence panels orbiting it. A cropped screenshot showing nothing but a curved, lit sphere edge and a glowing orbital node against a deep purple-blue void is, today, uniquely and immediately identifiable as ImpactOne.

## What makes ImpactOne visually unique (the real, current answer)

1. **The Earth is the product, not a decoration.** No competitor centers its actual information architecture around a literal globe — ImpactOne's real navigation model (`CameraRig.jsx`, `orbitalConfig.js`) makes the Earth the mathematical origin every camera position and every panel position is computed relative to. This is structural, not cosmetic — it cannot be casually copied without adopting the same underlying spatial model.
2. **The camera is the navigation.** No route changes, no page reloads, no modals — a real, physically-eased (`cameraEasing.js`'s cubic curve, `fc2dac5`) camera move is the *only* way between views. This alone is a signature no static-dashboard competitor shares.
3. **The reasoning chain made visible.** `MissionControlChain.jsx`'s real, looping `Global Event → AI Reasoning → Sector Impact → Company Impact → Portfolio Impact → Recommendation` visualization is a literal rendering of this platform's own real Claim Intelligence/recommendation pipeline — no competitor visualizes its own reasoning as a physical, traversable object in the same space as the rest of the product.
4. **A single, disciplined color grammar.** Purple/blue as the only chrome/ambient accent hues, green/red reserved *exclusively* for real positive/risk facts (the rule, correctly and consistently applied everywhere except the one disclosed `panelConfig.js` gap above) — a restraint most fintech competitors do not maintain (many use green/red decoratively across unrelated UI chrome).

## What this document set covers

- **[SIGNATURE_ELEMENTS.md](SIGNATURE_ELEMENTS.md)** — the 8 concrete signature elements the mission names (layout, lighting, typography, motion, color, materials, spacing, iconography), each defined precisely against the real, current implementation.
- **[BRAND_VISUAL_RULES.md](BRAND_VISUAL_RULES.md)** — the binding rules: what must never be violated anywhere in the product, and the consistency mechanism that keeps every current and future surface recognizably "ImpactOne."
- **[DESIGN_EVOLUTION.md](DESIGN_EVOLUTION.md)** — the governance line between what must never change (identity-defining invariants) and what is free to evolve (implementation details, exact values) as this product keeps shipping.

## A necessary scope note

Per the mission's own instruction — *"do not redesign functionality, only strengthen product identity"* — nothing in this document set proposes a new feature, screen, or data source. Every signature element identified below already exists in real, shipped code (`10a3b73`, `306b4a5`, `fc2dac5`); this phase's job is to name it precisely, codify it as a rule, and identify the one place (the color-identity gap above) where the real implementation has drifted from its own stated rule.
