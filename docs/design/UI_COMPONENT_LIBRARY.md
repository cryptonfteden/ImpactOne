# UI Component Library — "The Orbit"

**Phase:** IMPACTONE-VISUAL-DIRECTION-001. Companion to [3D_EXPERIENCE_GUIDELINES.md](3D_EXPERIENCE_GUIDELINES.md). Every real component concept already used across ImpactOne's real, shipped screens, re-specified as a 3D object in this direction — not invented from nothing, deliberately reused so this direction remains buildable against the platform's own real data model.

---

## Anatomy shared by every floating object

Every object in the system — regardless of which of the 9 sections it belongs to — shares one base anatomy:

1. **Core surface** — the object's own material (see `VISUAL_LANGUAGE.md` §Material).
2. **Depth-plane assignment** — Focus / Active / Ambient / Horizon (`3D_EXPERIENCE_GUIDELINES.md` §2), which alone determines its size, brightness, and blur.
3. **A single real data-driven visual attribute** — never more than one property is "meaningful" per object (e.g., a Portfolio card's *size* means position size; its *color* means P&L direction — exactly two, never a third overloaded meaning), directly continuing NOVA's own real, tested "one visual channel, one meaning" discipline.
4. **A proximity-response micro-motion** (`MOTION_SYSTEM.md`) — the only interactive affordance every object always has, regardless of section.

## Component specifications, by the 9 sections

### Position Card (Portfolio)
A floating card-object at Active or Ambient depth. Size = position size (real $ value). Color tint = real unrealized P&L sign (green/red only, per the strict rule). Front face shows: symbol, real live price, real day change %. On proximity/focus, the card tilts slightly toward the camera and its back face becomes visible, revealing: cost basis, real holding period, and up to 3 real linked News Intelligence panes (via the connecting light-thread described in `VISUAL_LANGUAGE.md`).

### Event Pane (News Intelligence)
A translucent, roughly rectangular pane at Active/Ambient/Horizon depth depending on real Importance Score. Brightness = Importance Score (the same real, existing score already computed by `autonomousMarketService.js` — not a new number invented for this visual system). On focus, expands to reveal the real headline, source, and (directly reusing the real, existing Claim Intelligence data) a compact confidence/evidence summary — never a fabricated placeholder if the real underlying claim data is thin; an honestly sparse pane is correct, a fabricated-looking rich one is not.

### Claim Object (AI Analysis)
The single Focus-plane hero object of the AI Analysis section. Its own "mass" (visual size) is the claim's real confidence value. Its orbiting satellite objects are its real supporting evidence items — each one a small, individually-clickable object, its own brightness proportional to that evidence item's own real weight (directly reusing the real `MAX_SINGLE_EVIDENCE_WEIGHT = 0.4` dominance cap already enforced in the real Claim Intelligence backend — visually, no single satellite may ever appear to dominate more than 40% of the total visual "orbit weight" around the claim, a literal visual rendering of a real, already-enforced backend rule).

### Sector Continent (Market Intelligence)
A glowing surface region directly on the Earth object itself. Brightness/color = real sector performance for the selected timeframe. Clicking a continent moves the camera to a close orbit above it, revealing the real constituent instruments as small satellite objects.

### Watch Object (Watchlists)
Visually near-identical to a Position Card but rendered dimmer, smaller, and at the further Watchlist orbital ring (`VISUAL_LANGUAGE.md`) — deliberately without the P&L color-tint (since there is no real position, tinting it green/red would fabricate a financial fact that does not exist for a watched-but-unheld instrument).

### Alert Pulse (Alerts)
Not a persistent object — a transient, momentary light event at a triggering object's own real location, per `VISUAL_LANGUAGE.md` §Alerts. Has no independent "card" form; clicking a pulse (or its resulting persistent indicator) moves the camera directly to the real source object, in whichever of the other 8 sections it belongs to.

### Research Panel (Research)
A large, calm, low-glow surface at Focus depth — the one section where a traditional, denser 2D information layout (real charts, real filings text, real analyst estimates) is rendered *on* a 3D surface rather than *as* many small 3D objects, since deep research genuinely benefits from information density that many small floating objects would undermine. This is a deliberate, disclosed exception, not an inconsistency.

### Settings Panel (Settings)
A single flat, stable panel (per `VISUAL_LANGUAGE.md` §Settings) — reuses real, existing NOVA form components (inputs, toggles, real accessible focus states) directly, unmodified. **Settings is the one section where this whole cinematic direction explicitly, deliberately re-adopts the real, existing NOVA 2D component library wholesale** rather than reinventing form controls as 3D objects, since a toggle or a text field genuinely gains nothing from depth and would only add interaction risk to a section where certainty matters most.

## Chart treatment ("depth everywhere")

Every real chart (portfolio performance, price history, sector performance) is rendered as a genuine extrusion from its own object's surface plane — a literal small ridge/relief rising off the card, not a flat 2D line-chart image pasted on top. The extrusion height at any point = the real data value at that point; nothing about the chart's shape is decorative. This is the direct, literal fulfillment of the mission's own "charts emerge from surfaces" instruction, made concrete and buildable rather than left as a slogan.
