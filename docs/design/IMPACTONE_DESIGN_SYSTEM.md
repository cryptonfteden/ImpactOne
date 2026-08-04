# ImpactOne Design System — "The Orbit" Cinematic Direction

**Phase:** IMPACTONE-VISUAL-DIRECTION-001. Documentation only — no production code was modified (this phase's own explicit instruction: "No production code unless required for visual validation"; none was required, since this is a pure design-language specification). Checked `git log` fresh first (1 new commit since the prior phase, `a669b2f` "add production deployment infrastructure" — unrelated to this design phase, not further investigated here).

**An important, necessary editorial note, stated plainly before anything else**: **no reference image was actually attached to this mission** — a dedicated search of the workspace found no such file. Everything in this document set is built entirely from the mission's own detailed prose specification (Visual Direction, Design Principles, 3D Language, Camera, Lighting, Motion sections), which was unusually thorough and sufficient to design from directly. This is disclosed here rather than silently assumed, consistent with this whole engagement's honesty discipline.

---

## The single most important thing every reader of this document set must understand first

**ImpactOne already has a real, shipped, carefully-built, WCAG-verified design system** — "NOVA" (`NOVA_DESIGN_BIBLE.md`, `DESIGN_TOKENS.md`, `THEME_ENGINE.md`, `frontend/src/styles/tokens.css`, real dark/light/high-contrast themes, real RTL support, glass deliberately scoped to Level-3 surfaces only, a calm Apple/Stripe/Linear-inspired restraint explicitly chosen and reviewed through multiple audit rounds earlier in this same engagement). **This mission asks for something genuinely, deliberately different — a maximalist, cinematic, 3D, camera-driven "investment operating system."** These two directions are not compatible, and this document set does not pretend otherwise.

**This document set is a bold, complete, internally-coherent creative direction for a possible future evolution of ImpactOne — "The Orbit."** It is written to be genuinely implementable, not vague inspiration. It is explicitly **not** a replacement instruction for the real, shipped NOVA system, and none of NOVA's real, tested, contrast-verified tokens were altered or deleted anywhere in this phase's work. Any decision to actually build toward this direction is a real, significant product/brand decision requiring its own explicit sign-off — this document set exists to make that decision possible to evaluate concretely, not to force it.

---

## The core creative idea: "The Orbit"

ImpactOne is not a dashboard you look at. **It is a space you move through.** The user's entire financial world — their portfolio, the news that moves it, the markets around it — exists as objects in a single, continuous 3D environment, with **the Earth as the literal, physical, always-present anchor** at the center of that space. Every screen this mission names is not a separate page; it is a **region of the same space**, reached by the camera moving there, never by a hard navigation cut.

**The single sentence that should govern every future disagreement about this direction**: *if a design decision makes the user feel like they are looking at a chart, it is wrong; if it makes them feel like they are standing in front of one, floating in space, it is right.*

---

## What this document set contains

1. **`VISUAL_LANGUAGE.md`** — the visual philosophy: composition, the Earth-anchor concept, color, light, material, and how the 9 named sections each express it.
2. **`3D_EXPERIENCE_GUIDELINES.md`** — the spatial/camera system: how "opening a section" becomes camera movement, depth layering rules, and the real technical constraints (performance, accessibility, motion-sensitivity) this ambition must respect.
3. **`UI_COMPONENT_LIBRARY.md`** — every real component type (cards, panels, charts, widgets) as 3D objects, with their floating/depth/interaction behavior specified concretely enough to build from.
4. **`MOTION_SYSTEM.md`** — the physics-inspired motion language: easing curves, inertia, camera transition timing, micro-interactions.
5. **`DESIGN_TOKENS.md`** — a new, clearly-separated proposed token layer (`--orbit-*`) for this direction, appended to the existing file **without altering a single existing real NOVA token**.

## The 9 named sections, at a glance (each detailed fully in `VISUAL_LANGUAGE.md`)

| Section | Its place in the Orbit | Its dominant visual idea |
|---|---|---|
| Mission Control | The default view — camera pulled back, Earth fully visible, all other regions visible as distant light-clusters | The "bridge of the ship" — an overview of everything at once |
| Portfolio | Camera moves inward toward a cluster of floating position-cards orbiting close to the Earth | Each holding is a real object with its own orbit, not a table row |
| News Intelligence | A layered field of translucent event-panes drifting at a middle depth, brightness proportional to real importance | News is weather moving through the space, not a list |
| Market Intelligence | A wide, low-altitude view — sector "continents" glowing on the Earth's surface itself | The market is the planet's own surface texture |
| AI Analysis | The camera moves closest of anywhere in the whole system — an intimate, focused single-object inspection | Depth here means "zoomed all the way into one true story" |
| Watchlists | A ring of smaller, dimmer satellite objects at a further orbital radius than Portfolio's | Watching, not yet holding — visually and spatially distinct from Portfolio at a glance |
| Alerts | Sharp, momentary light-pulses that briefly brighten and connect back to their source object | An alert is an event *in* the space, never a separate inbox screen |
| Research | A deep-space, dimmer, more spacious region — the calmest part of the whole system | Research is deliberate and unhurried, the opposite of an alert's urgency |
| Settings | The one region rendered with the LEAST 3D depth — a still, stable "control panel" pane | Deliberately calmer/flatter, since settings must feel trustworthy and unambiguous, not exploratory |

## How the 9 Design Principles map onto concrete rules (full detail in the companion docs)

- **Cinematic** → every section transition is a camera move, never a cut (`3D_EXPERIENCE_GUIDELINES.md`).
- **Minimal** → at any single moment, no more than 5-7 objects are ever in focus-depth simultaneously; everything else recedes into soft-focus background (`3D_EXPERIENCE_GUIDELINES.md`).
- **Premium** → materials are never flat color; every surface has real light response (`UI_COMPONENT_LIBRARY.md`).
- **Intelligent** → an object's own visual weight (size, brightness, orbital closeness) is always derived from a real, disclosed data value — never decorative (`VISUAL_LANGUAGE.md`).
- **Spacious** → the Earth-anchor's own real scale never changes; everything else is measured relative to it, guaranteeing a consistent sense of scale platform-wide (`3D_EXPERIENCE_GUIDELINES.md`).
- **Layered** → a strict, named depth-plane system (`3D_EXPERIENCE_GUIDELINES.md` §2).
- **Interactive** → every floating object responds to proximity/hover with a real, physics-eased micro-motion (`MOTION_SYSTEM.md`).
- **Depth everywhere** → charts are literally extruded from their own surface plane, never flat 2D renders pasted onto a card (`UI_COMPONENT_LIBRARY.md`).
- **No visual clutter** → a strict "one hero object per depth-plane" rule (`3D_EXPERIENCE_GUIDELINES.md`).
