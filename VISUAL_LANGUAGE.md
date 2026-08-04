# Visual Language — "The Orbit"

**Phase:** IMPACTONE-VISUAL-DIRECTION-001. Companion to [IMPACTONE_DESIGN_SYSTEM.md](IMPACTONE_DESIGN_SYSTEM.md). A proposed future creative direction — not a replacement for the real, shipped NOVA system.

---

## The Earth as anchor

The Earth is not decoration. It is the one object in the entire system that **never moves, never resizes, and is always present** — every other object's position is meaningful *relative to it*. It sits permanently at a fixed depth and scale; the camera moves around it, never it around the camera. This single invariant is what makes "the camera replaces navigation" actually work: a user who gets disoriented can always find the Earth and know exactly where they are in the system.

The Earth's own surface carries real, live information at the Market Intelligence depth (see below) — glowing sector "continents," never a generic decorative globe.

## Color

- **Base environment**: a near-black, deep space void (`#05060B`-class darkness) — the canvas everything else floats against.
- **Energy accents**: purple and blue exclusively, for all UI chrome, ambient glow, and non-financial-meaning light — never used to convey a market direction.
- **Green**: reserved *exclusively* for real, positive market/portfolio information (a real gain, a bullish signal) — never used decoratively, never used for a UI-chrome purpose.
- **Red**: reserved *exclusively* for real risk/negative information — same discipline.
- **This is a direct, deliberate continuation of the real NOVA system's own already-established, already-tested principle** ("a number that is a fact may be red/green; a number that is a belief may never be," `DESIGN_SYSTEM_V2.md` §4) — the cinematic direction inherits this discipline unchanged, it does not invent a new one.

## Light

Soft, volumetric, always sourced from a small number of implied "energy" points (never a flat, evenly-lit scene) — objects nearer the camera's current focus are lit brighter and sharper; objects further away recede into soft, dim, slightly blurred silhouettes. This is the primary mechanism (alongside literal camera depth) for establishing visual hierarchy — the brightest, sharpest object in view is always the one the system judges most important right now.

## Material

Every surface has **real light response** — a subtle specular highlight that shifts with camera movement, never a static flat-color fill. Glass/translucency is used more liberally here than NOVA's own deliberately-restrained "Level-3 only" rule, since translucent floating panels are central to this direction's whole identity — but even here, **never on more than 2-3 simultaneously-visible surfaces**, to avoid the exact "glass aging risk"/overuse this engagement's own earlier `X12A` design review flagged as a real, valid concern for glassmorphism generally.

---

## The 9 sections, in full

### Mission Control
The default, "zoomed-out" view. The Earth sits center-lower-third; above and around it, distant light-clusters represent the other 8 sections, each cluster's own brightness proportional to how much genuinely needs the user's attention there right now (reusing the platform's own real, already-computed Attention Score — never a decorative brightness). A single, most-urgent object (e.g., a real held-position risk) is pulled slightly forward and brightened above all others — this is the one true "hero" object Mission Control ever has.

### Portfolio
Camera moves inward to a close orbital ring around the Earth. Each real holding is a floating card-object at a real orbital radius (closer = larger position size), its own material tinted green/red per its real unrealized P&L — never both colors on one object, and never a color applied to anything but a real financial fact.

### News Intelligence
A layered field of translucent event-panes at a middle depth between Portfolio's close orbit and Watchlist's further ring — deliberately positioned as "weather moving through the space between what you hold and what you watch." Each pane's brightness is the event's own real, already-computed Importance Score; a pane that affects a real held position is drawn with a faint connecting light-thread back to that Portfolio object — a literal, visual rendering of "portfolio relevance," directly reusing the real, existing relevance concept this platform already computes.

### Market Intelligence
The camera pulls back and drops to a low, near-surface altitude — sector performance is rendered as glowing "continents" on the Earth's own surface, real and directly reused from the platform's own real sector-classification data (the same 19-category system already used elsewhere in this platform), never an invented decorative map.

### AI Analysis
The single closest camera position in the whole system — one object, fully in focus, everything else fully out of focus behind it. This is the section where "intelligence" is most literally rendered as depth: a claim's own supporting evidence appears as smaller satellite objects orbiting the main claim-object, each one a real, clickable, sourced piece of evidence — directly, visually operationalizing this platform's own real Claim Intelligence Layer (confidence, evidence, contradictions) rather than inventing a new metaphor unconnected to the real backend.

### Watchlists
A further, dimmer orbital ring than Portfolio's — visually, unmistakably "things you are watching, not holding" at a glance, without needing a text label to communicate the distinction.

### Alerts
Not a separate screen at all — a real triggered alert is a brief, sharp light-pulse that appears *at the location of its source object* (wherever that object currently sits in the space) and sends a connecting light-thread up to a small, persistent notification indicator near the camera's own position — reusing the exact platform-real alert-triggering data, never fabricated for visual effect.

### Research
The calmest, most spacious, dimmest-lit region of the whole system — deliberately under-stimulating relative to every other section, since deep research needs low ambient distraction, not more of it.

### Settings
The one deliberate exception to "everything floats in 3D space" — rendered as a single, stable, minimally-depth-layered flat panel. This is intentional, not an oversight: a user changing their password or notification preferences needs to feel *certain*, not immersed — depth and motion are cognitive load, and Settings is the one place in this whole system where that load should be minimized, not maximized.
