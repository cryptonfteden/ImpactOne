# DATA_VISUAL_DICTIONARY.md — The 11 Intelligence Types, Precisely Defined

**Phase:** INTELLIGENCE-VISUAL-LANGUAGE-001. Companion to [INTELLIGENCE_VISUAL_LANGUAGE.md](INTELLIGENCE_VISUAL_LANGUAGE.md). Each entry: the mission's own required feeling, the real backend source, and the precise combination of the 4 variables (`VISUAL_SEMANTICS.md`) that produces it — reusing real, already-shipped rendering primitives wherever one already exists.

---

## Macro Intelligence — "feels planetary"

**Real source**: the Macro domain agent; Macro Calendar panel (`altDataApi.getEvents()`).
**Motion**: slow, continuous, whole-scene — never a localized effect. Reuses `WorldAtmosphere.jsx`'s real fog/`Sparkles` system directly, scaled by real macro-event density rather than `ambientState.intensity` alone.
**Material**: diffuse, atmospheric, no hard edges — the opposite of a sharp node; macro information should feel like weather affecting the whole visible world, not an object in it.
**Color temperature**: the coolest, most desaturated end of the existing blue family — macro is the least emotionally reactive category by design.
**Spatial behavior**: affects the *environment* (fog density, ambient light level), never a single orbital node's own local behavior — the only category permitted to modify the scene's global atmosphere rather than a localized element, which is precisely what makes it feel "planetary" rather than "a widget."

## News — "feels explosive"

**Real source**: the News domain agent; Breaking News panel; `claimsApi.listOvernightChanges()`.
**Motion**: reuses the real, already-built one-shot breaking-news shockwave (`fd389a2`) exactly as-is — a sudden onset, fast expansion, natural decay. This is already the mission's "explosive" feeling, already shipped correctly; this document formalizes it as News's permanent signature rather than a one-off effect.
**Material**: sharp-edged, high-contrast ring — the opposite of Macro's diffuse atmosphere.
**Color temperature**: the existing News accent (`#ff9f4f`, warm orange) — unchanged, already correctly distinct from every other category's hue.
**Spatial behavior**: originates at a point and radiates outward, then fully disappears — never persistent, matching how a real news event's visual salience should fade as it ages.

## AI — "feels intelligent and clean"

**Real source**: AI Recommendations panel; the real Claim Intelligence Layer; `recommendationsApi`.
**Motion**: reuses the real `EnergyBeam` component (`fd389a2`) — a single, precise, directional beam, never a scattered particle effect.
**Material**: the sharpest, most minimal-noise material in the whole system — no fog, no sparkle, no texture; "clean" is defined here literally as *the deliberate absence* of every other category's atmospheric/particle treatment.
**Color temperature**: the existing AI Analysis purple (`#b06bff`), kept saturated and pure — never blended toward another hue.
**Spatial behavior**: a fixed, deliberate line from source to destination — never turbulent, never diffuse; "intelligent" is rendered as precision, not as more visual activity.

## Portfolio — "feels personal"

**Real source**: `portfolioEngineApi.getPerformanceDelta()`; the real holding-connection pulses.
**Motion**: the real, already-built holding-connection pulse system, phase-staggered per holding — unchanged, already correct.
**Material**: the warmest-lit, most "close" register in the scene — Portfolio's real orbital position is already among the nearest to the Earth; this document formalizes that proximity itself as the mechanism for "personal" (nothing else in the scene sits as close to the user's own actual data).
**Color temperature**: user-specific in effect, not in hue — the real `ambientState` tone (bullish/bearish/neutral) applied *specifically* to Portfolio's connections is what makes this category feel like it's about *this* user, not the market in general (every other category reflects the world; Portfolio reflects the user's own real position in it).
**Spatial behavior**: connects directly to the Earth (the user's own home reference point), never to another panel — Portfolio is the one category that is always drawn *toward the center*, never radiating outward.

## Risk — "feels heavy"

**Real source**: real per-claim risk signals; Fear & Greed reading.
**Motion**: the slowest, lowest-frequency pulse in the entire system — deliberately sluggish, never snappy or explosive (the direct opposite end of the motion spectrum from News).
**Material**: the densest, most opaque, least translucent material used anywhere in the scene — Risk is the one category that should never look like glass or light; it should look like mass.
**Color temperature**: deep, desaturated red — darker and less saturated than Opportunities' bright green, reinforcing "heavy" rather than "alarming" (alarm is a different, faster signal — see News).
**Spatial behavior**: a real, small, local gravitational distortion — nearby connecting lines bend slightly toward a high-Risk node rather than running straight, a literal visual metaphor for "pulling everything down," cheap to achieve as a small per-line control-point offset.
**Open dependency**: this category's correct expression requires `panelConfig.js`'s Fear & Greed identity-color fix (flagged since `FLAGSHIP_COMPONENT_SPEC.md`) — Risk's "heavy" feeling must come from real, current risk data, not a permanently-red panel identity.

## Opportunities — "feel energetic"

**Real source**: active `recommendationsApi` entries with a real positive thesis.
**Motion**: the fastest, brightest pulse rate in the system, scaling with the real strength of the opportunity — the direct visual opposite of Risk's slow heaviness.
**Material**: bright, thin-edged, high-emissive — reads as light rather than mass, opposite of Risk's density.
**Color temperature**: bright, saturated green — reserved exclusively for this and other genuinely positive real facts, per `BRAND_VISUAL_RULES.md` Rule 3.
**Spatial behavior**: radiates outward in short, quick bursts (distinct from News's single large shockwave) — many small quick pulses rather than one big event, reinforcing "opportunity" as an ongoing active state rather than a single moment.

## Agent Agreement — "feels stable"

**Real source**: `committeeIntelligenceApi.convene()`'s real Agent Consensus panel.
**Motion**: **the least motion of any category in the system** — a near-static, barely-perceptible glow with minimal variance frame to frame. Stability is rendered as the *absence* of visible change, which is the correct, literal reading of "stable."
**Material**: smooth, symmetric, evenly lit from all sides — no single dominant highlight direction (unlike the Earth's own single-key-light-driven specular).
**Color temperature**: the existing neutral blue (`#5fd0ff`), kept exactly as-is — agreement is calm, not celebratory (never green) and not alarming (never red).
**Spatial behavior**: fixed, centered, unmoving relative to its own local position — the opposite of Conflict's competing motion below.

## Conflict — "feels turbulent"

**Real source**: the real Claim Intelligence Layer's own disclosed contradiction detection (opposing evidence on the same claim).
**Motion**: genuinely irregular — not a smooth sine wave (which would read as calm/breathing) but a real, bounded jitter alternating between two competing directions, driven by two real, opposing evidence weights rather than random noise.
**Material**: two overlapping, semi-transparent surfaces that never fully align — a literal visual rendering of "two things disagreeing in the same space."
**Color temperature**: the only category permitted to blend two hues simultaneously (e.g., a flickering mix leaning toward whichever real opposing evidence currently carries more weight, capped by the real, existing `MAX_SINGLE_EVIDENCE_WEIGHT = 0.4` dominance rule so neither side ever fully overwhelms the other visually either) — every other category commits to one consistent hue.
**Spatial behavior**: the one category whose position itself may visibly shift slightly frame to frame (small, bounded, never enough to break the underlying `orbitalPosition()` layout contract) — turbulence expressed as barely-perceptible positional instability, not just color/opacity flicker.

## Historical Similarity — "feels like memory"

**Real source**: `historicalSimilarityService.js`'s real similarity scoring (the honest, post-`AI-TRUST-001` version — genuinely zero when nothing matches, never a fabricated default).
**Motion**: slow fade-in, slower fade-out — the visual equivalent of a memory surfacing and receding, never a sharp cut.
**Material**: translucent, desaturated, slightly blurred — a "ghost" duplicate of the current event's own visual signature, layered behind it at reduced opacity, rather than a new independent shape. This is the one category defined as *always relative to another*, never standalone — exactly right, since a historical similarity is inherently a comparison, not a fact on its own.
**Color temperature**: whatever hue the thing it echoes already uses, desaturated toward gray — memory fades color before it fades shape.
**Spatial behavior**: sits at the Background register (`HOLLYWOOD_VISUALS.md`'s depth-registers), never Foreground or Midground — a memory is never the main subject of the current frame; if `historicalSimilarityService` genuinely returns zero matches (the honest, current real behavior for most events), **no ghost renders at all** — an honestly absent memory, not a default one.

## Confidence — "feels luminous"

**Real source**: the real Claim Intelligence Layer's confidence value (kept separate from probability, per this platform's long-standing real discipline).
**Motion**: none of its own — Confidence is not an animation, it is a real, continuous brightness/emissive-intensity value applied *to whatever object it belongs to* (a claim, a recommendation, an agent's output). This is the one category defined purely as a material property, not a motion or shape.
**Material**: self-emissive light output, directly proportional to the real confidence number — never a fixed brightness.
**Color temperature**: no hue of its own — Confidence modulates the *brightness* of whatever hue its host object already has (a high-confidence Risk node is a brighter deep red; a high-confidence Opportunity is a brighter green) — this is deliberate: confidence is a lens applied to every other category, not a category with its own color.
**Spatial behavior**: none — purely a material/light property.

## Importance — "feels gravitational"

**Real source**: `autonomousMarketService.js`'s real, already-computed Importance Score.
**Motion**: none of its own, same reasoning as Confidence — Importance is a spatial/scale property, not an animation.
**Material**: unchanged from whatever the host object's own category defines.
**Color temperature**: unchanged from the host object's own category — Importance never introduces its own hue.
**Spatial behavior**: **the one category that literally affects layout weight without violating "do not redesign layout"** — a high-Importance object's real scale increases (directly reusing `VISUAL_HIERARCHY.md`'s Primary-tier mechanism) and nearby connecting lines/camera dwell time are drawn toward it slightly longer — a literal orbital-mechanics metaphor (mass attracts) that is only possible because this whole system is already built around real orbital positioning math (`orbitalConfig.js`), making "gravitational" the single most structurally natural metaphor in this entire document, not a stretch.
