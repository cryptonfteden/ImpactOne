# FLAGSHIP_VISUAL.md — The Definitive Visual Identity of ImpactOne

**Phase:** FLAGSHIP-UI-001. Documentation only — no production code changed (this phase's own instruction: "No production code unless required to validate the design"; none was required). Checked `git log` fresh first — one highly relevant new commit since the last phase, `10a3b73` *"feat(frontend): add immersive 3D Workspace (Earth, orbital modules, camera system)"*, discussed below.

**A necessary disclosure, stated plainly before anything else**: the mission asks to use "the attached inspiration image as the primary visual reference." No such image was attached — a dedicated search of the whole workspace found none, exactly as in the previous visual-direction phase. **But this time, something better than a static image exists: a real, live, GPU-rendered implementation of the previous phase's own "Orbit" cinematic direction was built and committed while this phase's mission was issued** (`frontend/src/features/workspace3d/`, real Earth, real orbital nodes, real camera system, real glass panels — see `IMPACTONE_3D_ARCHITECTURE.md`). This document set treats **that real, running scene as the actual visual reference to match and then elevate**, since it is concrete, inspectable, and already buildable — a far stronger foundation than an image would have been. Every "current state" statement below is drawn directly from that real code (`Earth.jsx`, `OrbitalNode.jsx`, `orbitalConfig.js`, `workspace3d.css`, `CAMERA_SYSTEM.md`), not invented.

---

## The one screen

This mission asks for a single hero screen — one image/moment that represents the whole company across every channel it lists (website, App Store, product videos, investor decks, press, social, launch). ImpactOne already has exactly one screen with the shape of a hero moment: **Mission Control, viewed from the 3D Workspace's overview camera**, with its live global-event → recommendation chain animating above the Earth.

**This is the designated flagship screen.** Not a new invention — the existing `Workspace3DFeature`'s overview state (`OVERVIEW_CAMERA` in `orbitalConfig.js`: pulled back, elevated, Earth and all 7 orbital modules in frame), with `MissionControlChain.jsx`'s chain visualization active. It is chosen over the other 8 named surfaces from the prior phase because it is the only one that shows, in a single glance and without any interaction, ImpactOne's entire actual value proposition: a live world (the Earth), the platform's real intelligence surfaces orbiting it (the 7 modules), and the platform's own real reasoning made visible (the chain) — everything else is either a single capability zoomed in (AI Analysis, Portfolio) or a utility (Settings), neither of which reads as "the company" in one frame.

## Composition (matching, then elevating, the real current scene)

**Current, real composition** (`OVERVIEW_CAMERA`, `orbitalConfig.js`): camera at `[0, 9, 14]` looking at the origin — the Earth sits lower-center-frame, the 7 orbital nodes ring it at a fixed radius in the same horizontal plane, `<Stars>` provide ambient background depth. Flat dark-navy radial gradient (`#0b1230` → `#05070f`) behind everything.

**Elevation for flagship use**:
- **Break the flat horizontal ring into a slight 3D helix** — the 7 orbital modules should not all sit in one exact plane; a small, deliberate vertical stagger (per module, a fixed small y-offset already derivable from `orbitalPosition`'s existing index math) gives the composition real depth from every camera angle, not just the current top-down-ish view, and reads immediately as "operating system," not "orrery diagram."
- **The chain (`MissionControlChain.jsx`) becomes the compositional spine** — currently a flat animated sequence; for the flagship frame specifically, it should arc gently upward through the vertical center of the frame, from the Earth's surface up past the orbital ring, so a single still frame captures the entire "Global Event → ... → Recommendation" story as one continuous visual line, immediately legible in a screenshot with zero interaction or animation required (critical for App Store screenshots and print/press use, which cannot rely on motion).
- **One module is always the visual hero of the still frame** — per the prior phase's own "one hero object" discipline, the flagship's default resting frame should have exactly one orbital node (proposed: Portfolio, or whichever module currently carries the platform's real highest-Attention item) pulled very slightly forward and brightened, giving the otherwise-symmetrical composition a real focal point rather than reading as generic decoration.

## Density and spacing

The mission asks to match "density" specifically. The real current scene is deliberately sparse (7 small nodes + 1 Earth + a chain) — correct for a working screen, but under-dense for a hero image meant to communicate "sophisticated intelligence platform" at a glance. Elevation: add **real, disclosed data texture** at the Horizon plane (reusing the prior phase's own depth-plane vocabulary) — faint, non-interactive live data glyphs (ticker symbols, small real percentage deltas) drifting far in the background, sourced from real (even if illustrative/cached) platform data, never fabricated placeholder numbers. This raises visual density without adding a single new interactive element or violating "nothing feels like separate widgets."

## Premium feel and futuristic atmosphere

Achieved through the same three real levers the current implementation already uses cheaply (`IMPACTONE_3D_ARCHITECTURE.md`'s own disclosed performance tradeoff): emissive materials, translucent shells, and CSS — elevated per `FLAGSHIP_STYLE_GUIDE.md`'s material and lighting rules, not by adding an expensive real-time ray-traced pipeline this platform has already deliberately, correctly decided against for performance reasons.

## What this document does not change

Everything the prior `IMPACTONE_3D_ARCHITECTURE.md` already disclosed as a deliberate scope/performance boundary (no shadow-mapped multi-light rig, no bloom/postprocessing pipeline, `dpr` cap, lazy-loaded chunk) remains correct and is not revisited here — this flagship treatment is an art-direction elevation of the existing scene's real materials, lighting, and composition, not a request to abandon its real, already-justified performance discipline.
