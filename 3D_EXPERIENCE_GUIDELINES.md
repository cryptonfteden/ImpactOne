# 3D Experience Guidelines — "The Orbit"

**Phase:** IMPACTONE-VISUAL-DIRECTION-001. Companion to [IMPACTONE_DESIGN_SYSTEM.md](IMPACTONE_DESIGN_SYSTEM.md) and [VISUAL_LANGUAGE.md](VISUAL_LANGUAGE.md). Covers the camera/navigation model, depth-layering rules, and the real technical/accessibility constraints this direction must respect.

---

## 1. The camera replaces navigation

Every one of the 9 named sections is a **camera position**, not a route. "Opening" a section is a real, continuous camera move from the current position to the target section's own defined position/orientation — never a hard cut, never a page reload, never a fade-to-black-and-back.

- **Every camera move has a real, fixed maximum duration** (proposed: 900ms for an adjacent-section move, 1400ms for a move all the way across the system, e.g. Mission Control → Research) — long enough to feel cinematic, short enough to never feel like the user is waiting for the product to work.
- **The camera never moves faster than the user's own input** — a rapid double-navigation (clicking Portfolio, then immediately clicking Research before the first move finishes) must smoothly redirect the in-flight camera move toward the new target, never queue two sequential full moves back to back.
- **A hard, instant cut is reserved for exactly one case**: an emergency/critical alert that requires the user's immediate attention (e.g., a real, held-position critical risk event) may snap the camera directly to that object, bypassing the normal cinematic transition — the one deliberate exception to "never hard-cut," reserved for genuine urgency, never used for routine navigation.

## 2. Depth-layering system (the "no visual clutter" enforcement mechanism)

A strict, named 4-plane depth system, reused identically across every one of the 9 sections:

| Plane | Distance from camera | What lives here | Max simultaneous objects |
|---|---|---|---|
| **Focus** | Nearest | The one true hero object for the current context (a held position under review, a claim being analyzed) | **1** |
| **Active** | Near-middle | Directly relevant supporting objects (a claim's own evidence, a position's own recent news) | 3-5 |
| **Ambient** | Far-middle | Present but not currently the point — other holdings, other watchlist items | 5-7, always rendered softer/dimmer than Active |
| **Horizon** | Furthest | The Earth itself, and distant light-clusters representing sections not currently open | Unlimited (these are never individually focus-worthy, only collectively orienting) |

**The "no more than 5-7 objects in focus-depth simultaneously" rule from `IMPACTONE_DESIGN_SYSTEM.md`** is enforced structurally by this table: Focus + Active together never exceed 6 objects; everything else is Ambient or Horizon by design, not by manual curation per screen.

## 3. Scale consistency

The Earth's own rendered scale is **fixed platform-wide** — it never grows or shrinks between sections. This is the single mechanism that lets a user's spatial intuition transfer correctly between Mission Control's wide view and AI Analysis's close-up view: the Earth is always the same size, so its presence (even distantly, at the Horizon plane) always answers "where am I" without a label.

## 4. Real technical constraints this ambition must respect (not aspirational — binding)

- **Performance budget**: no more than 3 simultaneously-animating "energy glow" effects at once, and no more than 1 in-flight camera transition at a time (per §1's own redirect rule) — this direction's own stated principle ("no excessive animations") is treated as a hard performance constraint, not just an aesthetic preference, given this platform's own prior, real, hard-learned lesson (`X12C.0`'s own confirmed skeleton-shimmer/glass-performance findings) that ambient animation has a real, measurable cost.
- **`prefers-reduced-motion` must fully disable camera-move easing** (replaced with an instant cut) and must fully disable ambient glow pulsing — directly reusing NOVA's own already-real, already-tested `prefers-reduced-motion`/`prefers-reduced-transparency` handling (`THEME_ENGINE.md`), not a new mechanism.
- **A genuine text-only/low-motion fallback mode must exist** for any user who needs it (vestibular sensitivity, low-end hardware, or simply personal preference) — this is not optional polish; a financial product that cannot be used without a 3D scene is a real accessibility failure, and this direction must ship with a parallel, real, flat 2D rendering of the exact same real data for every one of the 9 sections, not a degraded/lesser version.
- **Every object's visual properties (size, brightness, orbital position, color) must be a disclosed, deterministic function of a real, existing platform data value** — never randomized, never purely decorative. This directly extends this platform's own established, hard-won "never fabricate for visual effect" discipline (the same discipline behind `IMPACTONE_ANTI_PATTERNS.md`'s existing rules) into a genuinely new visual medium.

## 5. What this document explicitly does not specify

- **The actual 3D rendering technology/engine choice** (WebGL library, Three.js vs. a game-engine export, etc.) — this is a real implementation decision requiring its own technical feasibility spike, explicitly out of scope for a pure design-language document.
- **Exact numeric camera-position coordinates per section** — these belong in an implementation-time technical spec, not this design-language document, once a rendering approach is chosen.
