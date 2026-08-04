# VISUAL_SEMANTICS.md — The Grammar Behind the Dictionary

**Phase:** INTELLIGENCE-VISUAL-LANGUAGE-001. Companion to [DATA_VISUAL_DICTIONARY.md](DATA_VISUAL_DICTIONARY.md). This document is the *rule system* that generated every entry in the dictionary — so a future, 12th intelligence type can be added consistently, by answering the same 4 questions, rather than inventing a new bespoke treatment each time.

---

## Why a grammar, not just a list

A dictionary of 11 entries risks becoming 11 unrelated bespoke decisions that happen to look fine individually but share no underlying logic — which would make a 12th category (and every one after it) a fresh, ungrounded design exercise. This document extracts the actual, reusable rule system so the dictionary is provably consistent rather than coincidentally consistent.

## The 4 questions every intelligence type must answer

### 1. Motion character: is this an *event* or a *state*?

- **Event-shaped** categories (News, Risk-alert spikes, the breaking-news shockwave) get a one-shot, bounded animation with a clear start and natural decay — never looping.
- **State-shaped** categories (Agent Agreement, Macro atmosphere, Portfolio's ongoing tone) get a continuous, low-variance treatment that persists as long as the real underlying condition holds — never a one-shot.
- **The test**: does the real backend data for this category represent something that *just happened* (an event, with a timestamp) or something that *currently is* (a standing condition, re-evaluated on every refetch)? Real backend shape determines motion shape — this is why News (a real, timestamped Claim transition) is event-shaped and Agent Agreement (a real, continuously-recomputed consensus) is state-shaped, not an arbitrary stylistic choice.

### 2. Material weight: does this category represent mass or light?

- **Mass categories** (Risk, Macro) are rendered as dense, opaque, occluding geometry — they visually *take up room* and can occlude what's behind them.
- **Light categories** (Confidence, Opportunities, AI) are rendered as emissive, translucent, additive — they add brightness without occluding anything behind them.
- **The test**: does this category describe a *constraint or burden* on the platform's real recommendation (mass) or a *quality of the information itself* (light)? Risk constrains what you should do; Confidence describes how sure the system is — this distinction, not visual preference, is why one is dense and the other is luminous.

### 3. Color temperature: is this category world-facing or system-facing?

- **World-facing** categories (Macro, News, Risk, Opportunities) describe something happening in the real market/world — these draw from the existing, real, disclosed semantic palette (`BRAND_VISUAL_RULES.md` Rule 3/4: green/red for real facts, orange for news, blue/purple for the platform's own cool baseline).
- **System-facing** categories (Confidence, Importance, Agent Agreement, Conflict) describe a property *of the platform's own reasoning about the world*, not the world itself — these never introduce a new hue; they modulate (brighten, desaturate, blend) whatever hue their host world-facing category already has. This is the precise, generalizable reason Confidence and Importance have "no color of their own" in the dictionary — it is a rule, not a special case.

### 4. Spatial behavior: does this category affect *itself*, its *neighbors*, or the *whole scene*?

Three real, bounded scopes — every category must pick exactly one, never more:

- **Self-scoped** (AI's beam direction, Confidence's own brightness, Historical Similarity's own ghost) — affects only the object carrying the data.
- **Neighbor-scoped** (Risk's line-bending, Importance's camera-dwell pull, Conflict's dual-surface jitter) — affects the object and its immediate, real, already-connected neighbors (its own connecting line, its own comparison target) — never a distant, unrelated object.
- **World-scoped** (Macro's atmosphere/fog, Portfolio's Earth-centered ambient tone) — the only scope permitted to change the shared scene environment itself; reserved for exactly the two categories whose real backend meaning is inherently global (macro conditions) or inherently central (the user's own portfolio, reflected through the Earth itself as the user's anchor).

**A category may never claim world-scope unless its real backend data is genuinely global or user-central** — this is the rule that prevents scope creep (e.g., a future "Sector Rotation" category could plausibly want to tint the whole scene, but must justify that against this same test before being granted world-scope, exactly as Macro and Portfolio were).

## Composability: how these 4 answers combine, illustrated

| Category | Motion | Weight | Temperature | Scope |
|---|---|---|---|---|
| Macro | State | Mass (atmosphere) | World-facing (coolest blue) | World |
| News | Event | Light (thin shockwave edge, but a defined boundary) | World-facing (orange) | Neighbor (originates at source, radiates locally) |
| AI | State (a standing beam while active) | Light | World-facing (purple, but rendered "clean") | Self |
| Portfolio | State | Light (warm proximity) | World-facing (tone-driven) | World (via the Earth) |
| Risk | State | Mass | World-facing (deep red) | Neighbor |
| Opportunities | Event (bursts) | Light | World-facing (bright green) | Self |
| Agent Agreement | State (near-zero variance) | Light (smooth, symmetric) | System-facing (neutral, unchanged) | Self |
| Conflict | Event-like (irregular, bounded) | Mass (two competing surfaces) | System-facing (blended, capped) | Neighbor (its own comparison pair) |
| Historical Similarity | State (slow fade) | Light (translucent ghost) | System-facing (desaturates its host) | Self (relative to its own host) |
| Confidence | None (pure material property) | Light modifier | System-facing (no hue of its own) | Self |
| Importance | None (pure spatial property) | Unchanged | System-facing (no hue of its own) | Neighbor |

**No two categories share an identical 4-tuple** — this table is itself the proof that all 11 entries are genuinely visually distinct by construction, not merely by having 11 different hex codes.

## The rule for adding a 12th category later

Answer the 4 questions above using the category's own real backend data shape (never invent a visual first and retrofit a justification) — if the resulting 4-tuple collides exactly with an existing category, either the new category is not actually visually distinct (and should not be added as its own category), or one of the two categories' real backend meaning has been mis-mapped and should be revisited.
