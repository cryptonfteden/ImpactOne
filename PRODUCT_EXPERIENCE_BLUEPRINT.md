# Product Experience Blueprint — Phase X1

Design-only. No code, no CSS, no implementation. Written as the Head of Product Design's framing document — the "why" behind every screen decision in `SCREEN_BLUEPRINTS.md`, `DESIGN_LANGUAGE.md`, and `FIGMA_BUILD_SPEC.md`.

---

## Part 1 — Product Philosophy

### Product identity

ImpactOne is an **AI investment command center**, not a brokerage, not a social feed, not a dashboard of charts. Its identity rests on one claim: *every screen shows its reasoning*. A user should never see a number or a verdict without being one tap from "why." This is the product's actual differentiator (proven across D1–H2's real, tested infrastructure — real DecisionTraces, real committee attribution, real evidence matrices) and the design must make that differentiator *felt*, not just technically true. If a competitor can screenshot a screen and it looks like a generic fintech dashboard, the design has failed regardless of what's running underneath.

### User emotion

The target emotional arc, every single session: **calm confidence, not urgency.** This product is explicitly not a trading terminal built to induce FOMO or reflexive action — it is advisory-only, and the emotional register must match that honestly. Concretely:
- Never simulate scarcity or countdown pressure.
- Never use red/green as a dopamine trigger — color communicates *fact* (a real number moved), not *feeling*.
- The user should leave a session feeling *informed*, not *anxious* — the opposite of a stock-app doomscroll.

### Decision-first philosophy

Every screen exists to answer exactly one of three questions, and must make which question it's answering unambiguous within one second of landing:
1. **"What do I need to know right now?"** (Today)
2. **"What's happening in the world that could matter to me?"** (Markets)
3. **"What should I actually do?"** (Portfolio / AI)

A screen that tries to answer more than one of these at once is a design failure — this is the direct lesson from the pre-X1 product's Home screen, which correctly narrowed to six cards (Sprint 28) but still risked density creep every time a feature was added. X1's IA (Today / Markets / Portfolio / Workspaces / AI) exists specifically to give each of these questions its own permanent home, so no single screen has to carry more than one job.

### Information hierarchy

**Answer, then evidence, then action.** Every card, every screen, every AI response follows this exact three-tier structure:
1. **The headline fact** — largest type, first thing the eye hits (a price, a verdict, a delta).
2. **The one-sentence why** — immediately below, in secondary weight — never buried behind a click.
3. **The full evidence trail** — collapsed by default, one tap away, never pre-expanded (respects the user's time; the product proves its rigor exists without forcing everyone to read it every time).

Nothing in this product should require more than two taps to reach its underlying evidence. This is a hard constraint, not a guideline.

### Visual language

Premium dark, AI-terminal restrained — direction already established in Phase H3's design system, carried forward and formalized here as permanent philosophy, not a one-time reskin:
- **Quiet by default, loud only when true.** Glow, motion, and saturated color are reserved for genuinely significant real events (an alert triggering, a real regime shift) — never decorative.
- **Numbers are the hero.** Typography exists to make figures legible and comparable (tabular, aligned, scannable) before it exists to look elegant.
- **No gamification.** No streaks, no badges, no "you're on fire" language. This is the single clearest boundary between this product's intended feel and a trading-app-as-casino — an explicit anti-pattern this blueprint forbids.

### Motion philosophy

Motion in this product answers exactly one question: **"what just changed, and where did it go?"** Never decoration, always orientation:
- A number that updates animates *from* its old value *to* its new one (never a hard cut) — the user should always be able to see the delta happen, not just read a new static digit.
- Navigating between pillars (Today → Markets → Portfolio → Workspaces → AI) uses a consistent, brief directional transition — reinforcing a mental map of the product as a physical space with five rooms, not five disconnected pages.
- Nothing animates on loop. Nothing animates to draw attention to itself. If a motion doesn't answer "what changed," it doesn't ship.

### AI interaction principles

1. **The AI never speaks in absolutes.** Every AI-generated statement carries a visible confidence signal — this is already real infrastructure (quality scores, committee consensus levels) and the design must never let copy overstate what the system actually knows.
2. **The AI shows its work by default at the headline level, and in full on request.** A recommendation always displays its one-line "why" unprompted; the full DecisionTrace is one tap away, never mandatory reading.
3. **The AI is conversational but never anthropomorphized.** No avatar, no name, no personality performance — it is a system, presented as a system, that happens to explain itself well. Trust comes from transparency, not from being liked.
4. **Disagreement is a feature, not a bug to hide.** When the committee disagrees (a real, already-modeled state), the UI must surface that disagreement directly rather than averaging it into a falsely confident single verdict.

---

## Part 2 — User Journey

### The five pillars

```
Today ⇄ Markets ⇄ Portfolio ⇄ Workspaces ⇄ AI
```

A persistent top-level navigation rail (desktop: left rail; mobile: bottom bar) always shows all five, always in this order, always with the current pillar visually distinct (per `DESIGN_LANGUAGE.md`'s navigation spec). Notifications are a cross-cutting overlay reachable from anywhere, not a sixth pillar — alerts belong to whichever pillar they're about (a triggered price alert is Workspaces/Portfolio content, surfaced globally, owned locally).

### First launch → first value (Day 0)

1. **Invitation acknowledgment** — a single branded screen naming the product and, if this is a beta, what "beta" honestly means (per Phase E2/G1's existing "never oversell" precedent).
2. **Lightweight identity** — the existing beta invite-code flow (Phase H2), reframed as "claim your workspace" rather than a technical login step — the *first* time "Workspaces" is introduced as a concept, planting it before the user ever sees the pillar.
3. **A handful of taps, not a form** — reuse the existing chip-based onboarding pattern (age, experience, goal, risk, horizon) — already proven fast (E1 audit found no complaints about this specific flow's speed).
4. **Landing directly on Today** — never a blank screen, never a settings page. The very first thing a new user sees after onboarding is the same screen they'll open every morning after — establishing the daily habit shape from minute one.

### Day 1 → daily usage (the loop this product is built to create)

```
Open app → Today (what happened + what to watch)
   ↓ (a headline catches attention)
Markets (the full story behind one event) OR Portfolio (how it touches my money)
   ↓ (a specific symbol becomes interesting)
AI (ask a direct question, get a reasoned answer)
   ↓ (decide it's worth tracking)
Workspaces (add to a folder, set a price alert)
   ↓ (next morning)
Today (the loop closes — Workspaces' alerts now feed back into Today's "what to watch")
```

This is the single most important design fact in this document: **Workspaces is not a side feature, it's the hinge the daily loop turns on.** A user who never creates a folder never gets a personalized "what to watch," which means Today never becomes more valuable over time, which means the habit never deepens. Every screen must make "save this to a workspace" a one-tap, always-visible action — not buried in a menu.

### Transition map (every pillar-to-pillar move, and why it exists)

| From → To | Trigger | Why the user makes this move |
|---|---|---|
| Today → Markets | Tap a headline/event card | "I want the full story, not just the summary" |
| Today → Portfolio | Tap a portfolio-impact line | "How does this actually touch my money" |
| Today → AI | Tap "Ask AI about this" on any card | "I have a direct question this raised" |
| Markets → AI | Tap a symbol mentioned in an event | "What does the system think about this specific name" |
| Markets → Workspaces | Tap "Track this" on a symbol/theme | "I want this to follow me, not just today" |
| Portfolio → AI | Tap a position | "Why do I hold this / should I still" |
| Portfolio → Workspaces | Tap "Move to workspace" on a position | "I want to group this with related ideas" |
| Workspaces → AI | Tap a symbol inside a folder | "Deep-dive on this specific tracked idea" |
| AI → Workspaces | Tap "Save this" on any AI answer | "This reasoning is worth remembering" |
| Any pillar → Today | Tap the Today icon (always available) | "Bring me back to center" — Today is the product's home base, never orphaned |

No transition in this table is one-way. Every pillar can reach every other pillar in at most one tap via the persistent nav, but the *contextual* transitions above are the ones that should be surfaced inline, in the moment, so the user never has to think "which pillar has what I need next."

---

## Part 5 — Wow Moments

One unforgettable interaction per screen, defined here at the philosophy level (exact interaction specs live in `SCREEN_BLUEPRINTS.md` and `FIGMA_BUILD_SPEC.md`):

| Screen | The wow moment |
|---|---|
| **Today** | The "what changed since yesterday" comparison animates live on open — yesterday's numbers visibly morph into today's, not a static before/after table. The product feels like it's *been thinking while you were away*. |
| **Markets** | Tapping any event expands in place into its full reasoning trace (evidence, historical analog, propagation path) without a page transition — the story unfolds under your thumb, not on a new screen. |
| **Portfolio** | A held position's card visibly pulses once, subtly, the moment a *new* AI recommendation about it lands — the portfolio feels alive and watched, not a static ledger. |
| **Workspaces** | Dragging a symbol from one folder to another (not just tapping "move") — a tactile, physical-feeling reorganization that makes personal curation feel like arranging real objects. |
| **AI** | Asking a question and watching the committee's individual member reasoning stream in one voice at a time before resolving into a single synthesized verdict — the user watches the "debate" happen, not just receives a conclusion. |
| **Notification (triggered alert)** | The notification bell doesn't just badge — the exact card that alert refers to (wherever it's currently visible on screen) gets a one-time highlight ring, connecting the abstract notification to the concrete thing it's about. |

---

*Continued in `SCREEN_BLUEPRINTS.md` (Part 3), `DESIGN_LANGUAGE.md` (Part 4), and `FIGMA_BUILD_SPEC.md` (Part 6).*
