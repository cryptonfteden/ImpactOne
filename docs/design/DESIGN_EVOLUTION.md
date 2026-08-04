# DESIGN_EVOLUTION.md — What Never Changes, What Is Free to Evolve

**Phase:** PRODUCT-IDENTITY-001. Companion to [BRAND_VISUAL_RULES.md](BRAND_VISUAL_RULES.md). A governance reference for every future phase: before changing anything visual, check which category it falls into below.

---

## Never change (identity-defining invariants)

These are the load-bearing elements of ImpactOne's recognizability. Changing any of these is not a polish decision — it is a rebrand, and must be treated with the same weight as one.

1. **The Earth as the singleton center of every orbital screen** (`BRAND_VISUAL_RULES.md` Rule 1).
2. **Camera-driven navigation as the only transition mechanism between an orbital node and its content** (Rule 2).
3. **The green/red-for-real-facts-only color discipline** (Rule 3) — even though it is currently violated in one real file, the *rule itself* never changes; the code must converge to it, not the other way around.
4. **Purple/blue as the only non-semantic accent family** (Rule 4).
5. **Motion requiring a real, nameable cause** (Rule 5).
6. **The glass-for-content / physical-material-for-Earth material split** (Rule 6).
7. **Computed, never manually-placed, orbital spacing** (Rule 7).
8. **The "camera replaces navigation" principle itself** — inherited from the original `IMPACTONE-VISUAL-DIRECTION-001` phase and now realized in real, shipped code; this is the single deepest architectural commitment underlying every other signature and must survive any future redesign of surface details.

## Free to evolve (implementation detail, not identity)

These may change freely as the product matures, without threatening recognizability, as long as every "never change" rule above is still honored by whatever replaces them.

1. **Exact hex values within the established purple/blue/green/red families** — e.g., refining `#4f8cff` to a slightly different blue for contrast reasons is an evolution, not a rule break, as long as it stays within the same hue family and the same usage rules.
2. **The specific display typeface** used for orbital/chain labels (`FLAGSHIP_STYLE_GUIDE.md`'s proposal is itself a first pass, not a permanent lock-in).
3. **Exact camera easing constants** (`cameraEasing.js`'s `0.9s` duration, its specific cubic curve) — the *requirement* of physically-eased, redirect-capable camera motion never changes; the exact numbers tuning "how it feels" are free to iterate.
4. **The specific set of orbital modules/panels** shown on any given screen (the 3D Workspace's 7, the Flagship Screen's 10) — the *mechanism* (computed orbital placement around the Earth) never changes; the *content* list is a product decision that will keep evolving as real features ship.
5. **Material treatment refinements** — the clearcoat/breathing-glow/axial-tilt details added in `fc2dac5`, and any future refinement of them (e.g., adopting the still-unimplemented brushed-metal chrome treatment from `FLAGSHIP_STYLE_GUIDE.md`) — as long as the glass/physical-material split itself is preserved.
6. **The exact panel/tier visual-hierarchy weighting** proposed in `VISUAL_HIERARCHY.md` — the *principle* (visual weight must be a disclosed function of real data) never changes; the specific tier thresholds and visual treatments are free to be tuned.
7. **Shadow quality, blur radius, glass saturation percentage**, and other purely rendering-fidelity constants — free to increase or decrease for performance/quality tradeoffs (see `PERFORMANCE_NOTES.md`/`VISUAL_OPTIMIZATION.md`'s own precedent of deliberately capping these for cost reasons) without affecting identity.

## The test for any future proposed change

Before changing anything visual in this product, ask: **"if I removed the logo and every label, would this still look like ImpactOne after my change?"** If the answer depends on one of the 8 "never change" invariants above still being true, the change must preserve it. If the answer doesn't depend on any of them, the change is a safe evolution.

## Why this document exists as its own deliverable, not folded into `BRAND_VISUAL_RULES.md`

`BRAND_VISUAL_RULES.md` states *what the rules are*. This document exists separately because a rule and a decision about whether something is *governed by* that rule are different questions a future phase will need to answer quickly — e.g., "can we change the Earth's exact material recipe" (yes, evolution) versus "can we make the Earth optional on some screens" (no, that touches an invariant) are both real questions this product will face again, and this document is the fast reference for answering them without re-deriving first principles each time.
