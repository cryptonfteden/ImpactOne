# Design System V2
## Office of the Chief Design Officer — ImpactOne Visual Language

**Mandate:** Define the complete visual language of ImpactOne — a product that should feel closer to Apple, Stripe, and Linear than to a traditional finance application. No implementation, no component code, no CSS. This is a specification of *behavior and feeling*, for a design and engineering team to build against, exactly the way the intelligence-layer documents specify epistemic behavior rather than formulas.

**Design philosophy, in one sentence:** *Calm confidence, never loud conviction.* Apple's restraint, Stripe's precision, Linear's speed — applied to a category (finance) whose entire visual history is built on the opposite: red/green urgency, dense tickers, and manufactured excitement. ImpactOne's visual language is the deliberate rejection of that history.

---

## 1. Typography

A single type family, used consistently across every context, with a restrained scale — not a font showcase.

| Role | Size (base 16px scale) | Weight | Usage |
|---|---|---|---|
| Display | 32–40 | Semibold | Rare — a single monthly review headline, never routine screens |
| Title | 22–24 | Semibold | Screen titles, one per screen, always |
| Headline | 17–18 | Medium | Daily Brief headline items, recommendation titles |
| Body | 15–16 | Regular | Evidence text, explanations, primary reading content |
| Subtext | 13 | Regular | Timestamps, source attribution, secondary metadata |
| Caption | 11–12 | Medium, tracked | Labels above numbers (e.g., "CONFIDENCE," "UNCERTAINTY") |

**Rules:** Never more than three type sizes visible on one screen at once. Numbers that carry meaning (confidence, price, percentage) always use tabular figures so they don't visually jitter when they update. No italics for emphasis — emphasis comes from weight and color, never from a typeface trick that reduces legibility for older or vision-impaired users.

---

## 2. Spacing & Grid

An 8-point base unit, with a restricted, named scale — not arbitrary pixel values chosen per screen:

`4 (hairline) · 8 (tight) · 16 (default) · 24 (section) · 32 (major section) · 48 (screen-top breathing room)`

**Grid:** A single-column flow on mobile with a consistent 16px side margin; cards never touch the screen edge, ever, at any size. Multi-item lists (Daily Feed, Themes) use consistent 16px vertical rhythm between cards — density is never increased just to fit more on screen; if content doesn't fit, it is ranked and trimmed (see `MOBILE_PRODUCT_MASTERPLAN.md` §11), not shrunk.

---

## 3. Cards

The primary content container across the app. Two elevation levels only:

- **Resting card:** flat, a 1px hairline border (light mode) or a subtly lighter fill (dark mode) — no drop shadow at rest. Finance apps over-use shadow to imply importance; this one reserves visual weight for content, not chrome.
- **Active/expanded card:** a soft, small-radius elevation (a whisper of shadow, never a heavy drop) appears only when a card is mid-interaction (expanding to show evidence) — the elevation *is* the transition state, not a permanent decoration.

**Corner radius:** consistently 16px on primary cards, 8px on inline sub-elements (badges, pills) — one radius scale, never mixed per screen. **Padding:** 16px internal padding minimum on every card, never edge-to-edge text.

---

## 4. Charts

Charts exist to inform, never to impress. A single line-chart style governs price/performance visualization: a thin (1.5px) line, no gradient fill unless showing a genuinely meaningful range (e.g., a confidence band — see §14), no chart-junk gridlines beyond the minimum needed to read a value, and axis labels that never require zooming to read on a phone screen. Color is used exactly once per chart to mean one thing (e.g., the line itself); it is never used redundantly for both a line and a decorative background fill, which only adds visual noise without adding information.

**Color discipline:** red/green is used *only* for realized, factual price movement — never for a subjective score like confidence or a forward-looking recommendation, which use the neutral, deliberate palette in §13/§14 instead. This is the single most important color rule in this document: **a number that is a fact may be red or green; a number that is a belief may never be.**

---

## 5. Animation & Transitions

Motion exists to explain a state change, never to entertain. Every transition has a stated purpose:

| Transition | Duration | Purpose |
|---|---|---|
| Card expand (tap to read evidence) | 200ms, ease-out | Shows the reader where the new content came from, spatially |
| Screen navigation | 250ms, standard ease | Maintains spatial continuity, never a jarring hard-cut |
| Number update (price, score) | 300ms, ease-in-out, with a subtle cross-fade, never a slot-machine roll | A rolling/spinning number animation implies excitement this product deliberately refuses to manufacture |
| Success confirmation | 150ms, single subtle scale-pulse, no confetti, no sound by default | Confirms without celebrating a financial action as if it were a game |
| Pull-to-refresh | Standard platform-native only | Never a custom, branded refresh animation — familiarity beats novelty here |

**A hard rule:** no animation in this product may ever exceed 400ms, and nothing is animated purely for delight if it adds even one frame of delay to reading real information.

---

## 6. Loading States & Skeletons

Every screen that can show a spinner must show a skeleton instead. A skeleton mirrors the exact shape of the content about to arrive (a headline-shaped bar, an evidence-card-shaped block) so the layout never jumps once real content loads. Skeletons persist for a maximum of 2 seconds before degrading to an honest "this is taking longer than usual" state with a manual retry — never an indefinite shimmer that leaves the user wondering if the app has frozen.

---

## 7. Buttons

A strict three-level hierarchy, used identically everywhere in the app:

- **Primary:** filled, one per screen maximum, reserved for the single most important action (e.g., "Add to watchlist," never "Learn more" — informational actions are never primary).
- **Secondary:** outlined or tinted-text, used for the one legitimate alternate action per screen.
- **Tertiary/text-only:** used for dismissive or low-commitment actions ("Not now," "Dismiss").

**No destructive-red primary buttons for financial actions** — even "Remove position" uses a deliberate, calm confirmation flow rather than a jarring red button, because urgency-styling on financial actions is exactly the manipulation pattern this product exists to avoid.

---

## 8. Navigation & Bottom Navigation

A maximum of **5 bottom navigation items**, always: Home, Daily Feed, Portfolio, Themes/Recommendations (combined if needed to hold the line at 5), Profile. Settings and Notifications live inside Profile, never as their own tab — they are not daily-use surfaces and do not deserve daily-use real estate. Icons are paired with persistent text labels always, never icon-only — a finance app's navigation is not a place for clever iconography a new user has to learn.

**Thumb reach:** the bottom navigation bar and every primary action button on every screen sit within the bottom 60% of the screen height on a standard-size phone — the natural one-handed thumb arc — never in the top corners, which is where secondary/rare actions (search, settings-adjacent icons) belong instead.

---

## 9. Dark Mode

True semantic tokens, not an inverted palette. Dark mode uses a true near-black background (not dark gray, to genuinely save OLED battery and reduce eye strain at night, matching the "read the morning brief in bed" real use case), with the same restrained color-for-facts-only discipline as light mode. Every color token (background, card, text, positive-fact, negative-fact, evidence-tier badge) is named and mapped for both modes identically — never a separate, differently-designed dark theme, which is how inconsistency creeps in.

---

## 10. Accessibility

- Minimum WCAG AA contrast on all text, AAA on any text under 13px.
- Full Dynamic Type / OS-level font scaling support — a 65-year-old user increasing system text size must see a correctly-reflowed layout, not truncated content.
- Every evidence item, confidence score, and uncertainty score has a screen-reader label that speaks the *meaning*, not just the number ("Confidence: 72 out of 100, meaning the evidence for this view is fairly strong" — not just "72").
- No information is conveyed by color alone — every red/green fact pairing also carries a directional icon or explicit +/− sign.
- Touch targets minimum 44×44pt everywhere, no exceptions for "dense" data screens.

---

## 11. Evidence Visualization

Every piece of evidence, wherever it appears, carries a small, consistent, tappable **source badge** showing its tier/class (per the platform's canonical evidence model: Primary, Secondary, Crowd, Speculation, Rumor, Unknown) using a fixed, memorizable shape-and-label system — not just a color, since color alone fails the accessibility rule above and fails for the ~8% of users with color vision deficiency. Primary evidence gets a solid-filled badge; Speculation and Rumor get a deliberately lighter, outlined badge — the visual weight of the badge itself communicates reliability before the user reads a single word.

---

## 12. Confidence Visualization

**The single most important rule in this entire design system:** confidence and uncertainty are two separate dimensions in the platform's own canonical model, and they are shown as two separate visual elements, always — never blended into one reassuring bar or one "confidence score" pill. The standard pattern:

- A **confidence bar** — a filled horizontal bar, 0–100, labeled plainly ("Signal strength").
- A separate, adjacent **uncertainty indicator** — a distinct visual form (a hatch/texture pattern or a split-tone treatment, not just a second bar in a different color that a user could visually merge with the first) labeled plainly ("How much disagreement exists").

A recommendation with high confidence and high uncertainty **must visually read as different from** a recommendation with high confidence and low uncertainty — if a user cannot tell the two states apart at a glance, this specification has not been met, regardless of the numbers technically being present somewhere on screen.

---

## 13. Portfolio Visualization

Real exposure (sector, theme, concentration) is shown as a simple, honest proportional treatment (a horizontal stacked bar or a small set of labeled proportional blocks) — never a 3D pie chart, never a chart style that makes small risks look smaller than they are through visual distortion. Concentration risk crosses a visible threshold (a distinct color/weight change, not just a number) the moment a single position or correlated cluster exceeds a stated share of the portfolio, so risk is seen, not just reported.

---

## 14. Notifications

Visually and tonally identical to the calmest possible version of themselves: no red badges implying urgency unless the content is genuinely time-sensitive and material. A notification's icon and color always match the source screen it will open to, so a user builds an intuitive, low-cognitive-load map of "this color means portfolio, this one means daily brief" over time.

---

## 15. Success States

Quiet and brief. A single, small checkmark and a one-line confirmation, gone within 2 seconds, never a full-screen takeover, never a celebratory animation for a financial decision — celebrating a trade or a watchlist add risks implying the platform wants the user to act more often, which directly contradicts `VISION.md`'s core investment principle.

---

## 16. Error States

Always specific, always honest, always offering a next step. "Something went wrong" alone is never acceptable copy. The correct pattern: what happened, why (in plain language — "Our market-data provider is temporarily unavailable"), and what the user can still do (view cached data with an explicit staleness label, retry, or come back later). An error state is a trust opportunity, not just a failure to apologize for.

---

## 17. Empty States

Never a blank void. Every empty state (empty watchlist, empty portfolio, no notifications) offers exactly one clear, low-pressure next action and, where relevant, a brief explanation of what *will* appear there once populated — an empty state teaches the product's shape, it doesn't just apologize for having nothing to show yet.

---

## 18. One-Hand Usability & Thumb Reach

Every screen is designed against a real one-handed-use model: primary actions in the bottom two-thirds of the screen, destructive or rare actions (delete, sign out) placed deliberately *outside* the easy thumb arc so they require a conscious reach rather than being one careless tap away from an easy one. Top-of-screen space is reserved for information display (titles, key numbers), never for primary interactive controls.

---

## 19. Visual Hierarchy

Every screen has exactly one primary visual focal point, established through size and weight, not color alone. Secondary information is smaller and lower-contrast, never competing for attention with the primary answer the screen exists to give (per `MOBILE_PRODUCT_MASTERPLAN.md`'s per-screen "Purpose" definitions — visual hierarchy is the direct visual expression of each screen's single stated purpose).

---

## 20. Interaction Hierarchy

One primary action, one secondary action, unlimited tertiary/passive affordances (scrolling, reading) — per screen, always, matching the screen-purpose table in `MOBILE_PRODUCT_MASTERPLAN.md`. A screen that presents three visually equal-weight buttons has failed this specification, because it has asked the user to make a decision the design should have already made for them about what matters most right now.

---

## 21. Maximum Tap Count

No daily-use action (read the brief, check the portfolio, dismiss a notification) exceeds **2 taps from Home**. No weekly-use action (monthly review, theme exploration) exceeds **3 taps**. Any flow requiring more is treated as a design defect to be shortened, not a complexity to be explained away with a tutorial.

---

## 22. Maximum Scroll Depth

The Daily Brief never requires more than **one and a half screen-heights of scrolling** to reach its end on a standard device — enforced by content ranking and capping (`MOBILE_PRODUCT_MASTERPLAN.md` §11), not by shrinking text or padding to cram more in. Any list screen that would naturally exceed this (a large watchlist, a long portfolio) uses progressive disclosure (a "show more" affordance) rather than an infinite, disorienting scroll — the user should always be able to sense where the end is.
