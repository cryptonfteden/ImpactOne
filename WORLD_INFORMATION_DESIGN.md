# WORLD_INFORMATION_DESIGN.md — Coexistence Inside One Real Scene

**Phase:** INTELLIGENCE-VISUAL-LANGUAGE-001. Companion to [VISUAL_SEMANTICS.md](VISUAL_SEMANTICS.md). All 11 categories from [DATA_VISUAL_DICTIONARY.md](DATA_VISUAL_DICTIONARY.md) are meant to appear, often simultaneously, inside the one real, continuous Earth-centered scene (`FlagshipEarthScene.jsx`/`Workspace3DScene.jsx`). This document specifies how they coexist in a single real frame without becoming visual noise — the practical completion of "define visual meaning" once more than one meaning is on screen at once.

---

## The coexistence problem, stated concretely

A real, live moment on the Flagship Screen could plausibly have, at once: a real Macro atmosphere shift (a Fed decision), a real News shockwave (a breaking headline), a Risk node bending its neighbor's line, and a real Confidence-brightened AI Recommendation beam — four categories, four different motion characters, all real, all simultaneously true. Without a coexistence rule, this risks becoming exactly the "visual clutter" every prior phase in this engagement has worked to eliminate.

## Rule 1: World-scope categories are exclusive-per-moment, never additive

Only Macro and Portfolio ever hold world-scope (`VISUAL_SEMANTICS.md`'s scope rule). **These two must never both drive the scene's global atmosphere at full intensity simultaneously** — when both have a real, current, non-neutral signal, the real `ambientState`-style computation must blend them by a disclosed weighting (proposed: Portfolio's tone dominates the Earth's own atmosphere color, since the Earth is the user's personal anchor per `SIGNATURE_ELEMENTS.md`; Macro's real intensity modulates the fog/particle *density* rather than competing for the same color channel) — never a naive average that could wash both signals out into a muddy, meaningless blend.

## Rule 2: Event-shaped categories queue, they never stack

News shockwaves and Opportunity bursts (both event-shaped, per `VISUAL_SEMANTICS.md`) must never trigger more than one at a time per source object — directly reusing the real, already-established discipline from `ActivityWaves.jsx`'s fixed-pool design (`fd389a2`) and the ~4-connection cap on holding pulses (`FLAGSHIP_LAYOUT.md`). A second real News event arriving while a shockwave is still animating queues briefly (a few hundred ms) rather than overlapping two shockwaves from the same origin point, which would blur into unreadable noise.

## Rule 3: Neighbor-scoped effects never chain

Risk's line-bending and Importance's camera-dwell pull (both neighbor-scoped) apply only to an object's own immediate, real connection — never propagating from that neighbor to a further neighbor. A high-Risk Portfolio holding may bend its own line toward the Earth; it must never also visibly distort a *different* panel's unrelated line. This bounded-blast-radius rule is what keeps neighbor-scoped effects legible even when several are real and active at once.

## Rule 4: Self-scoped categories always render, regardless of how many others are active

Confidence's brightness and Historical Similarity's ghost-echo (both self-scoped, applied to a single object) must never be suppressed or dimmed just because other categories are simultaneously active elsewhere in the frame — each object's own self-scoped properties are independent of scene-wide activity level, which is precisely what keeps a single Confidence-brightened node legible even during a busy, multi-event moment.

## Rule 5: Depth registers (from `HOLLYWOOD_VISUALS.md`) are the tie-breaker for visual competition

When two categories' real signals are both strong at the same moment and would otherwise compete for attention, the existing foreground/midground/background register system resolves it: whichever category's host object currently holds Foreground/Primary tier (per `VISUAL_HIERARCHY.md`'s real, data-driven tiering) is rendered at full intensity; everything else recedes toward its Ambient treatment, regardless of which *category* it belongs to. This means the coexistence rule never needs a new, second hierarchy system — it reuses the one this whole engagement has already built and validated across three prior phases.

## Practical example: a real, busy moment, resolved

A live Fed rate-decision day, with an active AI Recommendation, one Risk-elevated holding, and a real Historical Similarity match to a past rate-hike event:

1. **Macro** (world-scope) sets the scene's overall atmosphere density/tone (Rule 1) — the environment itself communicates "a big macro day," at Background register.
2. **The Risk-elevated holding** is real, current, and material — per its own real Importance/urgency, it likely holds Primary/Foreground tier this moment (Rule 5), rendered at full "heavy" intensity with its real line-bend (Rule 3).
3. **The AI Recommendation's beam** (self-scoped, Rule 4) renders at its own full Confidence-driven brightness regardless of the Risk node's foreground status — both are simultaneously fully legible because they occupy different scopes, not competing for the same visual budget.
4. **The Historical Similarity ghost** (Background register, self-scoped, Rule 4) renders as a faint, desaturated echo behind the Risk node specifically — never competing for foreground attention, exactly matching its "memory, not the main subject" definition in the dictionary.

Nothing above required a new coordination mechanism beyond the rules already stated — this is the deliberate outcome of grounding every category's scope in `VISUAL_SEMANTICS.md`'s grammar rather than treating each as an independent visual effect.

## What this document does not do

It does not specify exact numeric values (fog density coefficients, exact line-bend magnitude, exact blend weighting between Macro and Portfolio) — those are implementation-time tuning decisions for a future phase, once this coexistence rule set is validated as the right shape. This document's job is to guarantee that *when* real, simultaneous signals occur, the scene has a deterministic, disclosed way to resolve them — not to pre-compute every constant.
