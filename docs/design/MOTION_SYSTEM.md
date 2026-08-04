# Motion System — "The Orbit"

**Phase:** IMPACTONE-VISUAL-DIRECTION-001. Companion to [UI_COMPONENT_LIBRARY.md](UI_COMPONENT_LIBRARY.md). Extends — never contradicts — the real, shipped NOVA `motion.css`/reduced-motion discipline into this direction's own camera and object motion.

---

## Governing rule

**Motion in this system always communicates something real** — a camera move means "you asked to look elsewhere"; an object's proximity-response means "this is interactive"; an alert pulse means "something real just happened." Motion that exists only for spectacle (an idle ambient camera drift, a decorative object rotation) is explicitly against this direction's own "no excessive animations" principle and must not be added, however visually tempting.

## Easing

- **Standard interaction easing** (proximity hover, object focus/expand): a soft, physics-inspired ease-out, proposed as a cubic-bezier approximating gentle spring settling (`cubic-bezier(0.22, 1, 0.36, 1)`) — reused as this direction's one, single, universal interaction curve, never a different curve per component (directly continuing NOVA's own real, already-established single-curve-per-motion-category discipline in `motion.css`).
- **Camera transitions**: a slightly longer, slightly more pronounced ease-in-out (`cubic-bezier(0.65, 0, 0.35, 1)`), giving the camera move a genuine sense of accelerating away and decelerating into its target — distinct from the snappier object-interaction curve, since a camera move is a bigger, slower event than a hover response.
- **Alert pulses**: a sharp ease-out with no ease-in (near-instant onset, gentle fade) — alerts must feel immediate, never gradual.

## Inertia

Floating objects at the Active and Ambient depth planes carry a subtle simulated inertia in response to camera movement — as the camera moves, they lag very slightly (under 150ms) behind the motion before settling, giving the space a sense of real physical presence rather than objects rigidly locked to the camera. **This must be subtle enough to never be consciously noticed as "lag"** — it is meant to be felt, not seen; if a user ever describes it as "delay" rather than "smooth," it has been overdone and must be reduced.

## Micro-interactions

- **Proximity response**: any object nearing the Focus plane (camera moving toward it, or a user's pointer/focus targeting it) brightens and very slightly enlarges (proposed: max +6% scale) — never more, to avoid a "bouncy," un-premium feel.
- **Selection/focus state**: a real, visible, accessible focus indicator (a soft outer glow ring) on every interactive object — this is not optional polish, it is this direction's literal replacement for NOVA's own real, already-accessible 2D focus-ring discipline, and must remain genuinely visible and keyboard-navigable, not merely a hover-only effect.
- **Evidence-satellite orbit**: AI Analysis's satellite evidence objects (`UI_COMPONENT_LIBRARY.md`) drift in a slow, continuous, near-imperceptible real orbit around their claim — the one deliberate, intentional exception to "motion must communicate something," justified because it reinforces the literal "orbiting evidence" metaphor central to that section's whole concept; even here, capped at a barely-perceptible speed so it never distracts from reading the claim itself.

## Reduced motion

Directly reuses NOVA's own real `prefers-reduced-motion` mechanism (`THEME_ENGINE.md`) — under this setting: all camera transitions become instant cuts, all inertia is disabled, all micro-interaction scale/brightness changes are disabled (state changes are shown via an instant, non-animated visual difference instead), and the AI Analysis orbit drift is frozen. This is a hard requirement, not a stretch goal — see `3D_EXPERIENCE_GUIDELINES.md` §4.

## Timing budget summary

| Motion type | Duration | Curve |
|---|---|---|
| Object proximity response | 180ms | Standard interaction ease |
| Object focus/expand (card flip, claim expand) | 260ms | Standard interaction ease |
| Camera move, adjacent section | 900ms | Camera ease |
| Camera move, cross-system | 1400ms | Camera ease |
| Alert pulse onset | 120ms | Sharp ease-out |
| Alert pulse fade | 600ms | Sharp ease-out |
| Inertia settle lag | <150ms | Standard interaction ease |
