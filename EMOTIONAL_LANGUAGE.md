# EMOTIONAL_LANGUAGE.md — The Grammar Behind the 12 States

**Phase:** EMOTIONAL-DESIGN-001. Companion to [MARKET_MOODS.md](MARKET_MOODS.md) and [WORLD_STATES.md](WORLD_STATES.md). Specifies how these 12 states are computed, how several can be real and true at once without contradicting each other, and how transitions between them are paced.

---

## Two independent axes, never conflated

The 12 states split cleanly into two real, independent axes — this independence is itself the most important structural rule in this whole document set, since conflating them would mean a user's own personal portfolio mood could be mistaken for a statement about the whole market, or vice versa:

- **World axis** (`MARKET_MOODS.md`): Calm / Bull / Bear / Panic / High Uncertainty / Major Geopolitical Events — describes the market and the platform's own reasoning confidence, never the specific user's holdings.
- **Personal axis** (`WORLD_STATES.md`'s Portfolio Gains/Losses): describes the specific user's own real position, independently of world axis state.
- **Reasoning axis** (`WORLD_STATES.md`'s AI Confidence/Agreement states): describes the platform's own certainty about its own outputs, independently of both of the above.

**A user can genuinely be in Portfolio Gains while the World axis reads Bear** (a well-hedged or contrarian position performing well during a downturn) — the emotional design must render both truthfully and simultaneously, never suppressing one to avoid seeming contradictory. Real, honest divergence between axes is itself meaningful information a user should be able to feel.

## Combining the 3 axes in one real frame

Directly extending `WORLD_INFORMATION_DESIGN.md`'s coexistence rules (rather than inventing a second scheme):

1. **World axis owns world-scope** (`WorldAtmosphere`'s fog/particles, the Earth's own ambient light level) — exactly the scope rule already established for Macro/Portfolio in `VISUAL_SEMANTICS.md`, now formalized as "the World axis state is what tints the whole environment."
2. **Personal axis owns Portfolio's own neighbor-scope** (the holding-connection lines/pulses specifically) — never bleeds into world-scope, per Portfolio Gains/Losses's own definition above.
3. **Reasoning axis owns self-scope on whichever specific object it describes** (a `ConfidenceHalo`, an `AgentConstellation`) — never affects the environment or the Portfolio register.

Because each axis is scoped to a different, non-overlapping visual territory, **all three can be simultaneously true and simultaneously rendered without any blending logic being needed at all** — this is a deliberate design property, not a limitation: real emotional truth in this product is allowed to be layered and sometimes contradictory, exactly like real markets and real portfolios are.

## Thresholds are real and named, never guessed

Every state's trigger condition in `MARKET_MOODS.md`/`WORLD_STATES.md` names the exact real field and, where a real constant already exists (`ambientState.js`'s `> 0.05`/`< -0.05` bands, `confidenceToIntensity`'s 4 named categories), reuses it exactly rather than inventing a parallel threshold. Where no real constant yet exists for a mission-named state (e.g., Panic's dual-signal requirement, Major Geopolitical Events' "large jump" in event count), this document proposes one but flags it explicitly as **a new, disclosed threshold requiring real historical data validation before implementation** — not a number invented purely for dramatic effect.

## Transition pacing: moods change like weather, not like a light switch

**No state in this document set snaps in binary** — every world-axis and personal-axis state is a real, continuous function of its underlying real number (`ambientState.intensity`, real `valueChangePct` magnitude), which already changes gradually as new data arrives. The *named* states (Calm/Bull/Bear/Panic) are convenient labels for regions of this continuous space, not discrete triggered animations — a portfolio moving from a +2% day to a +6% day should visually drift from a mild Bull feeling toward a stronger one smoothly, never jump between two fixed "Bull" and "Strong Bull" presets. This directly continues `CINEMATIC_GUIDELINES.md`'s existing "motion must decelerate, never stop abruptly" discipline, extended here to cover *state* transitions, not just camera/object motion.

**The one deliberate exception**: Major Geopolitical Events is event-shaped (per `VISUAL_SEMANTICS.md`'s motion-character rule), so it is allowed a real, bounded onset "snap" (the existing shockwave) — this is correct and intentional, since a real geopolitical event genuinely does arrive suddenly; smoothing its onset would be dishonest in the other direction, understating something that really did happen abruptly.

## Guardrail: this system must never manufacture an emotion the real data doesn't support

Restated once more, directly, as this document's closing and most important rule: if real data genuinely reads as Calm, the scene must look calm — no minimum "baseline drama" is ever added to make the product feel more exciting than its own real, current data warrants. This is the same discipline this whole engagement has enforced everywhere else (the Daily Feed fix, the still-open `panelConfig.js` color-identity gap) and is, if anything, more important here than anywhere else in this document series, since emotional design is precisely the domain where fabricating feeling is easiest to justify to oneself and most damaging to a financial product's actual trustworthiness.
